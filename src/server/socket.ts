import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import { createMediasoupWorker, createMediasoupRouter, createWebRtcTransport } from './mediasoup';
import type * as mediasoupTypes from 'mediasoup';

interface Room {
    id: string;
    router: mediasoupTypes.types.Router;
    transports: Map<string, any>;
    producers: Map<string, any>;
    consumers: Map<string, any>;
    members: string[];
}

const rooms: Map<string, Room> = new Map();

export async function createRoom() {
    const worker = await createMediasoupWorker();
    const router = await createMediasoupRouter(worker);
    const roomId = uuidv4();

    const room = {
        id: roomId,
        router,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        members: [],
    };
    rooms.set(roomId, room);

    return roomId;
}

export function roomExists(roomId: string) {
    //log all rooms
    console.log(rooms);

    return rooms.has(roomId);
}

export function removeRoom(roomId: string) {
    //end all transports
    const room = rooms.get(roomId);
    if (room) {
        room.transports.forEach((transport) => {
            transport.close();
        });
    }

    //end all producers
    if (room) {
        room.producers.forEach((producer) => {
            producer.close();
        });
    }

    //end all consumers
    if (room) {
        room.consumers.forEach((consumer) => {
            consumer.close();
        });
    }

    rooms.delete(roomId);
}

export function initSocket(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('Neuer Client verbunden:', socket.id);

        socket.on('joinRoom', async ({ roomId }: { roomId: string }) => {
            let room = rooms.get(roomId);
            if (!room) {
                const worker = await createMediasoupWorker();
                const router = await createMediasoupRouter(worker);
                room = {
                    id: roomId,
                    router,
                    transports: new Map(),
                    producers: new Map(),
                    consumers: new Map(),
                    members: [],
                };
                rooms.set(roomId, room);
            }

            socket.join(roomId);
            socket.data.roomId = roomId;
            console.log(`Socket ${socket.id} trat Raum ${roomId} bei`);

            if (!room.members.includes(socket.id)) {
                room.members.push(socket.id);
            }

            io.to(roomId).emit('userList', { members: room.members });
            socket.emit('joinedRoom', { roomId });
            socket.emit('routerRtpCapabilities', { rtpCapabilities: room.router.rtpCapabilities });
            socket.to(roomId).emit('userJoined', { socketId: socket.id });

            //send chat message
            socket.to(roomId).emit('chatMessage', { sender: 'System', text: `${socket.id} hat den Raum betreten.` });
        });

        socket.on('createWebRtcTransport', async (data, callback) => {
            const { transportType } = data;
            const roomId = socket.data.roomId;
            const room = rooms.get(roomId);
            if (!room) return;

            try {
                const transport = await createWebRtcTransport(room.router);
                const key = socket.id + '-' + transportType;
                room.transports.set(key, transport);

                callback({
                    params: {
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters,
                    },
                });
            } catch (error: any) {
                console.error(error);
                callback({ error: error.message });
            }
        });

        socket.on('connectTransport', async (data, callback) => {
            const { dtlsParameters, transportType } = data;
            const roomId = socket.data.roomId;
            const room = rooms.get(roomId);
            if (!room) return;

            const key = socket.id + '-' + transportType;
            const transport = room.transports.get(key);
            if (!transport) return;

            try {
                await transport.connect({ dtlsParameters });
                callback({ connected: true });
            } catch (error: any) {
                console.error(error);
                callback({ error: error.message });
            }
        });

        socket.on('produce', async (data, callback) => {
            const { kind, rtpParameters } = data;
            const roomId = socket.data.roomId;
            const room = rooms.get(roomId);
            if (!room) return;

            const key = socket.id + '-producer';
            const transport = room.transports.get(key);
            if (!transport) {
                return callback({ error: 'No producer transport found' });
            }

            try {
                const producer = await transport.produce({ kind, rtpParameters });
                room.producers.set(socket.id, producer);
                // Anderen mitteilen, dass ein neuer Producer verfügbar ist
                socket.to(roomId).emit('newProducer', {
                    producerId: producer.id,
                    socketId: socket.id,
                    kind,
                });
                callback({ id: producer.id });
            } catch (error: any) {
                console.error(error);
                callback({ error: error.message });
            }
        });

        socket.on('consume', async (data, callback) => {
            const { producerId, rtpCapabilities, producerSocketId } = data;
            const roomId = socket.data.roomId;
            const room = rooms.get(roomId);
            if (!room) return;

            try {
                const key = socket.id + '-consumer';
                const consumerTransport = room.transports.get(key);
                const producer = room.producers.get(producerSocketId);
                if (!producer) {
                    return callback({ error: 'Producer not found' });
                }
                if (!room.router.canConsume({ producerId: producer.id, rtpCapabilities })) {
                    return callback({ error: 'Cannot consume' });
                }
                const consumer = await consumerTransport.consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: false,
                });
                room.consumers.set(socket.id, consumer);

                callback({
                    params: {
                        id: consumer.id,
                        producerId: producer.id,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    },
                });
            } catch (error: any) {
                console.error(error);
                callback({ error: error.message });
            }
        });

        socket.on('getCurrentProducers', (callback) => {
            const roomId = socket.data.roomId;
            const room = rooms.get(roomId);
            if (!room) return callback({ producers: [] });

            const producers = [];
            for (const [socketId, producer] of room.producers) {
                if (socketId !== socket.id) {
                    producers.push({ socketId, producerId: producer.id });
                }
            }
            callback({ producers });
        });

        // Media State Handling: Weiterleiten von Änderungen an alle Teilnehmer
        socket.on('mediaState', (state) => {
            const roomId = socket.data.roomId;
            socket.to(roomId).emit('mediaState', { socketId: socket.id, ...state });
        });

        // Chat Message Handling
        socket.on('chatMessage', (message, callback) => {
            const roomId = socket.data.roomId;
            socket.to(roomId).emit('chatMessage', { sender: socket.id, text: message.text });
            callback && callback({ status: 'ok' });
        });

        socket.on('disconnect', () => {
            const roomId = socket.data.roomId;
            const room = rooms.get(roomId);
            if (room) {
                ['producer', 'consumer'].forEach((type) => {
                    const key = socket.id + '-' + type;
                    const transport = room.transports.get(key);
                    if (transport) {
                        transport.close();
                        room.transports.delete(key);
                    }
                });

                const producer = room.producers.get(socket.id);
                if (producer) {
                    producer.close();
                    room.producers.delete(socket.id);
                }
                const consumer = room.consumers.get(socket.id);
                if (consumer) {
                    consumer.close();
                    room.consumers.delete(socket.id);
                }

                room.members = room.members.filter((m) => m !== socket.id);
                io.to(roomId).emit('userList', { members: room.members });
                socket.to(roomId).emit('userLeft', { socketId: socket.id });

                //send chat message
                socket
                    .to(roomId)
                    .emit('chatMessage', { sender: 'System', text: `${socket.id} hat den Raum verlassen.` });

                if (room.members.length === 0) {
                    removeRoom(roomId);
                }
            }
            console.log('Socket disconnected:', socket.id);
        });
    });
}
