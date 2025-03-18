'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import VideoPlayer from '@/components/VideoPlayer';
import { MinimalLayoutExample } from '@/components/MinimalLayoutExample';
import { Client } from '@/types';

interface ProducerInfo {
    socketId: string;
    producerId: string;
    kind?: string;
}

interface ChatMessage {
    sender: string;
    text: string;
}

export default function Room() {
    const router = useRouter();
    const { roomId } = useParams() as { roomId: string };

    const [socket, setSocket] = useState<Socket | null>(null);
    const [device, setDevice] = useState<mediasoupClient.types.Device | null>(null);
    const [producerTransport, setProducerTransport] = useState<mediasoupClient.types.Transport | null>(null);
    const [consumerTransport, setConsumerTransport] = useState<mediasoupClient.types.Transport | null>(null);
    const [remoteAudioStreams, setRemoteAudioStreams] = useState<{ [socketId: string]: MediaStream }>({});
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<{ [socketId: string]: MediaStream }>({});
    const [memberList, setMemberList] = useState<string[]>([]);
    const [pendingProducers, setPendingProducers] = useState<ProducerInfo[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);

    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
    const [micEnabled, setMicEnabled] = useState<boolean>(true);
    const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState<string>('');
    const [remoteMediaState, setRemoteMediaState] = useState<{
        [socketId: string]: { micEnabled: boolean; cameraEnabled: boolean };
    }>({});
    // Lokale Producer speichern (für Audio und Video)
    const [videoProducer, setVideoProducer] = useState<mediasoupClient.types.Producer | null>(null);
    const [audioProducer, setAudioProducer] = useState<mediasoupClient.types.Producer | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Socket-Initialisierung
    useEffect(() => {
        const s = io();
        setSocket(s);

        s.on('connect', () => {
            console.log('Socket connected:', s.id);
            s.emit('joinRoom', { roomId });
        });

        s.on('joinedRoom', (data) => {
            console.log('Raum beigetreten:', data.roomId);
        });

        s.on('routerRtpCapabilities', async (data) => {
            console.log('Erhaltene routerRtpCapabilities:', data.rtpCapabilities);
            const d = new mediasoupClient.Device();
            try {
                await d.load({ routerRtpCapabilities: data.rtpCapabilities });
                setDevice(d);
                initMediasoup(s, d);
            } catch (error) {
                console.error('Device konnte nicht geladen werden:', error);
            }
        });

        s.on('newProducer', (data: ProducerInfo) => {
            console.log('Neuer Producer:', data);
            if (!device || !consumerTransport) {
                setPendingProducers((old) => [...old, data]);
            } else {
                consumeProducer(s, device, consumerTransport, data.producerId, data.socketId);
            }
        });

        s.on('userList', (data) => {
            console.log('Aktuelle Userliste:', data.members);
            setMemberList(data.members);
        });

        s.on('userJoined', (data) => {
            console.log(`User joined: ${data.socketId}`);
        });

        s.on('userLeft', (data) => {
            console.log(`User left: ${data.socketId}`);
            setRemoteAudioStreams((prev) => {
                const copy = { ...prev };
                delete copy[data.socketId];
                return copy;
            });
            setRemoteVideoStreams((prev) => {
                const copy = { ...prev };
                delete copy[data.socketId];
                return copy;
            });
            setRemoteMediaState((prev) => {
                const copy = { ...prev };
                delete copy[data.socketId];
                return copy;
            });
        });

        s.on('chatMessage', (message: ChatMessage) => {
            setChatMessages((prev) => [...prev, message]);
        });

        s.on('mediaState', (data: { socketId: string; micEnabled: boolean; cameraEnabled: boolean }) => {
            setRemoteMediaState((prev) => ({
                ...prev,
                [data.socketId]: { micEnabled: data.micEnabled, cameraEnabled: data.cameraEnabled },
            }));
        });

        return () => {
            s.disconnect();
        };
    }, [roomId]);

    // Pending Producer verarbeiten
    useEffect(() => {
        if (!socket || !device || !consumerTransport) return;
        if (pendingProducers.length === 0) return;

        console.log('Flushing pendingProducers:', pendingProducers);
        pendingProducers.forEach((prod) => {
            consumeProducer(socket, device, consumerTransport, prod.producerId, prod.socketId);
        });
        setPendingProducers([]);
    }, [device, consumerTransport, pendingProducers, socket]);

    // Lokaler Media-Stream + Geräte abrufen
    useEffect(() => {
        async function initMedia() {
            if (!micEnabled && !cameraEnabled) {
                if (localStream) {
                    localStream.getTracks().forEach((track) => track.stop());
                    setLocalStream(null);
                }
                return;
            }
            try {
                const constraints: MediaStreamConstraints = {
                    audio: micEnabled,
                    video: cameraEnabled
                        ? { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined }
                        : false,
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                setLocalStream(stream);
                if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.onloadedmetadata = () => {
                        localVideoRef.current?.play().catch((error) => console.error('Error playing video:', error));
                    };
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                setAudioInputDevices(devices.filter((d) => d.kind === 'audioinput'));
                setVideoInputDevices(devices.filter((d) => d.kind === 'videoinput'));
                if (!selectedVideoDevice && devices.filter((d) => d.kind === 'videoinput').length > 0) {
                    setSelectedVideoDevice(devices.filter((d) => d.kind === 'videoinput')[0].deviceId);
                }
            } catch (err) {
                console.error('Fehler beim Zugriff auf Media:', err);
            }
        }
        initMedia();
    }, [micEnabled, cameraEnabled, selectedVideoDevice]);

    const switchAudioInput = async (deviceId: string) => {
        try {
            const constraints: MediaStreamConstraints = {
                audio: { deviceId: { exact: deviceId } },
                video: cameraEnabled
                    ? { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined }
                    : false,
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(newStream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = newStream;
                localVideoRef.current.play();
            }
        } catch (err) {
            console.error('Fehler beim Wechsel des Audioeingangs:', err);
        }
    };

    const switchVideoInput = async (deviceId: string) => {
        try {
            setSelectedVideoDevice(deviceId);
            const constraints: MediaStreamConstraints = {
                audio: micEnabled,
                video: { deviceId: { exact: deviceId } },
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(newStream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = newStream;
                localVideoRef.current.play();
            }
        } catch (err) {
            console.error('Fehler beim Wechsel des Videoeingangs:', err);
        }
    };

    // Toggle für Mikrofon
    const toggleMic = async () => {
        // Schalte aus
        if (micEnabled) {
            if (audioProducer && !audioProducer.closed) {
                audioProducer.pause();
            }
            // Falls ein lokaler Stream vorhanden ist, deaktiviere dessen Tracks
            localStream?.getAudioTracks().forEach((track) => (track.enabled = false));
            setMicEnabled(false);
            socket?.emit('mediaState', { micEnabled: false, cameraEnabled });
            return;
        }

        // Schalte ein
        if (!micEnabled) {
            // 1) Prüfe, ob localStream existiert, sonst neu holen
            let stream = localStream;
            if (!stream || stream.getAudioTracks().length === 0) {
                // Neu anfordern
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: cameraEnabled
                            ? { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined }
                            : false,
                    });
                    setLocalStream(stream);
                    if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
                        localVideoRef.current.srcObject = stream;
                        await localVideoRef.current.play().catch(console.error);
                    }
                } catch (err) {
                    console.error('Fehler beim Neustarten des Audio-Streams:', err);
                    return;
                }
            }

            // 2) Falls audioProducer nicht existiert oder geschlossen ist, neu erstellen
            if (!audioProducer || audioProducer.closed) {
                if (producerTransport && stream) {
                    try {
                        const audioTrack = stream.getAudioTracks()[0];
                        if (audioTrack) {
                            const newProducer = await producerTransport.produce({ track: audioTrack });
                            setAudioProducer(newProducer);
                        }
                    } catch (err) {
                        console.error('Fehler beim Erzeugen des AudioProducers:', err);
                    }
                }
            } else {
                // audioProducer ist da, aber vermutlich pausiert -> resume
                await audioProducer.resume();
            }

            // 3) Aktiviere lokale Audio-Tracks
            stream?.getAudioTracks().forEach((track) => (track.enabled = true));
            setMicEnabled(true);
            socket?.emit('mediaState', { micEnabled: true, cameraEnabled });
        }
    };

    // Toggle für Kamera
    const toggleCamera = async () => {
        // Schalte aus
        if (cameraEnabled) {
            if (videoProducer && !videoProducer.closed) {
                videoProducer.pause();
            }
            localStream?.getVideoTracks().forEach((track) => (track.enabled = false));
            setCameraEnabled(false);
            socket?.emit('mediaState', { micEnabled, cameraEnabled: false });
            return;
        }

        // Schalte ein
        if (!cameraEnabled) {
            let stream = localStream;
            // 1) Falls kein Stream oder kein Video-Track, hole einen neuen
            if (!stream || stream.getVideoTracks().length === 0) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: micEnabled,
                        video: { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined },
                    });
                    setLocalStream(stream);
                    if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
                        localVideoRef.current.srcObject = stream;
                        await localVideoRef.current.play().catch(console.error);
                    }
                } catch (err) {
                    console.error('Fehler beim Neustarten des Video-Streams:', err);
                    return;
                }
            }

            // 2) Falls videoProducer nicht existiert oder geschlossen ist, neu erstellen
            if (!videoProducer || videoProducer.closed) {
                if (producerTransport && stream) {
                    try {
                        const videoTrack = stream.getVideoTracks()[0];
                        if (videoTrack) {
                            const newProducer = await producerTransport.produce({ track: videoTrack });
                            setVideoProducer(newProducer);
                        }
                    } catch (err) {
                        console.error('Fehler beim Erzeugen des VideoProducers:', err);
                    }
                }
            } else {
                // Producer ist da, also resume
                await videoProducer.resume();
            }

            // 3) Aktiviere lokale Video-Tracks
            stream?.getVideoTracks().forEach((track) => (track.enabled = true));
            setCameraEnabled(true);
            socket?.emit('mediaState', { micEnabled, cameraEnabled: true });
        }
    };

    const sendChatMessage = () => {
        if (socket && chatInput.trim() !== '') {
            const message: ChatMessage = { sender: socket.id || 'Unkown', text: chatInput.trim() };
            socket.emit('chatMessage', message);
            setChatMessages((prev) => [...prev, message]);
            setChatInput('');
        }
    };

    // Initialisierung der Mediasoup Transports und Producer/Consumer
    const initMediasoup = async (s: Socket, d: mediasoupClient.types.Device) => {
        // Producer-Transport
        s.emit('createWebRtcTransport', { transportType: 'producer' }, async (res: any) => {
            if (res.error) {
                console.error(res.error);
                return;
            }
            const { params } = res;
            const transport = d.createSendTransport(params);
            setProducerTransport(transport);

            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
                s.emit('connectTransport', { dtlsParameters, transportType: 'producer' }, (ans: any) => {
                    if (ans.error) return errback(ans.error);
                    callback();
                });
            });

            transport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
                s.emit('produce', { kind, rtpParameters }, (ans: any) => {
                    if (ans.error) return errback(ans.error);
                    callback({ id: ans.id });
                });
            });

            try {
                let stream = localStream;
                if (!stream) {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                    setLocalStream(stream);
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                        localVideoRef.current.play();
                    }
                }
                // AudioProducer erzeugen
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                    const prod = await transport.produce({ track: audioTrack });
                    setAudioProducer(prod);
                }
                // VideoProducer erzeugen
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    const prod = await transport.produce({ track: videoTrack });
                    setVideoProducer(prod);
                }
            } catch (err) {
                console.error('Fehler beim Zugriff auf Media:', err);
            }
        });

        // Consumer-Transport
        s.emit('createWebRtcTransport', { transportType: 'consumer' }, async (res: any) => {
            if (res.error) {
                console.error(res.error);
                return;
            }
            const { params } = res;
            const recvTransport = d.createRecvTransport(params);
            setConsumerTransport(recvTransport);

            recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                s.emit('connectTransport', { dtlsParameters, transportType: 'consumer' }, (ans: any) => {
                    if (ans.error) return errback(ans.error);
                    callback();
                });
            });

            s.emit('getCurrentProducers', (res: { producers: ProducerInfo[] }) => {
                console.log('Aktuelle Producer:', res.producers);

                const otherProducers = res.producers.filter((prod) => prod.socketId !== socket?.id);
                otherProducers.forEach((prod) => {
                    consumeProducer(s, d, recvTransport, prod.producerId, prod.socketId);
                });
            });
        });
    };

    // Konsumiere Producer
    const consumeProducer = async (
        s: Socket,
        d: mediasoupClient.types.Device,
        transport: mediasoupClient.types.Transport,
        producerId: string,
        producerSocketId: string
    ) => {
        s.emit(
            'consume',
            {
                producerId,
                rtpCapabilities: d.rtpCapabilities,
                producerSocketId,
            },
            async (response: any) => {
                if (response.error) {
                    console.error('Fehler beim consume:', response.error);
                    return;
                }
                const { params } = response;
                const consumer = await transport.consume({
                    id: params.id,
                    producerId: params.producerId,
                    kind: params.kind,
                    rtpParameters: params.rtpParameters,
                });
                await consumer.resume();
                const stream = new MediaStream();
                stream.addTrack(consumer.track);
                if (consumer.track.kind === 'audio') {
                    setRemoteAudioStreams((prev) => ({ ...prev, [producerSocketId]: stream }));
                } else if (consumer.track.kind === 'video') {
                    setRemoteVideoStreams((prev) => ({ ...prev, [producerSocketId]: stream }));
                }
            }
        );
    };

    // ... innerhalb deiner RoomPage-Komponente, nach allen useEffects etc.
    const clients: Client[] = [
        {
            userId: socket?.id || 'local',
            videoStream: localStream || undefined,
            mediaState: { micEnabled, cameraEnabled },
        },
        ...memberList
            .filter((id) => id !== socket?.id)
            .map((id) => ({
                userId: id,
                videoStream: remoteVideoStreams[id] || undefined,
                mediaState: remoteMediaState[id] || { micEnabled: true, cameraEnabled: true },
            })),
    ];

    return (
        <MinimalLayoutExample
            clients={clients}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onBack={() => {
                socket?.disconnect();

                //stop all tracks
                if (localStream) {
                    localStream.getTracks().forEach((track) => track.stop());
                }

                //stop all remote tracks
                Object.values(remoteAudioStreams).forEach((stream) => {
                    stream.getTracks().forEach((track) => track.stop());
                });

                Object.values(remoteVideoStreams).forEach((stream) => {
                    stream.getTracks().forEach((track) => track.stop());
                });

                //stop camera and mic access
                setLocalStream(null);
                setRemoteAudioStreams({});
                setRemoteVideoStreams({});

                router.push('/');
                router.refresh();
            }}
            onShare={() => navigator.clipboard.writeText(window.location.href)}
            chatMessages={chatMessages}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendChatMessage={sendChatMessage}
        />
    );
}
