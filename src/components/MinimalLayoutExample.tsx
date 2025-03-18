import { ChatMessage } from '@/types';
import React, { useState, useRef, useEffect } from 'react';

// Typdefinitionen
export interface Client {
    userId: string;
    videoStream?: MediaStream;
    mediaState: {
        micEnabled: boolean;
        cameraEnabled: boolean;
        speaking?: boolean;
    };
}

interface ControlBarProps {
    micEnabled: boolean;
    cameraEnabled: boolean;
    chatOpen: boolean;
    unreadCount: number;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleChat: () => void;
    onBack: () => void;
    onShare: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
    micEnabled,
    cameraEnabled,
    chatOpen,
    unreadCount,
    onToggleMic,
    onToggleCamera,
    onToggleChat,
    onBack,
    onShare,
}) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white flex justify-between items-center p-4">
            {/* Links: Back & Share */}
            <div className="flex items-center space-x-4">
                <a onClick={onBack} href="/" title="Zurück">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                        />
                    </svg>
                </a>
                <button onClick={onShare} title="Teilen">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                        />
                    </svg>
                </button>
            </div>
            {/* Mitte: Mic & Kamera */}
            <div className="flex items-center space-x-4">
                <button onClick={onToggleMic} title="Mikrofon">
                    {micEnabled ? (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                            />
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                            />
                            <line
                                x1="4"
                                y1="4"
                                x2="20"
                                y2="20"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    )}
                </button>
                <button onClick={onToggleCamera} title="Kamera">
                    {cameraEnabled ? (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                            />
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
                            />
                        </svg>
                    )}
                </button>
            </div>
            {/* Rechts: Chat Button */}
            <div className="flex items-center">
                <button onClick={onToggleChat} title="Chat öffnen" className="relative">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                        />
                    </svg>
                    {!chatOpen && unreadCount > 0 && (
                        <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

interface ClientCardProps {
    userId: string;
    videoStream?: MediaStream;
    mediaState: { micEnabled: boolean; cameraEnabled: boolean; speaking?: boolean };
}
export const ClientCard: React.FC<ClientCardProps> = ({ userId, videoStream, mediaState }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && videoStream && mediaState.cameraEnabled) {
            videoRef.current.srcObject = videoStream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch((err) => console.error(err));
            };
        }
    }, [videoStream, mediaState.cameraEnabled]);

    return (
        <div
            className={`flex flex-col items-center bg-gray-800 p-4 rounded shadow-lg ${
                mediaState.speaking ? 'outline outline-green-500' : ''
            }`}>
            {mediaState.cameraEnabled && videoStream ? (
                // Mit aspect-video wird das Seitenverhältnis beibehalten.
                <div className="w-full max-w-lg aspect-video overflow-hidden rounded">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="w-full max-w-lg aspect-video flex items-center justify-center bg-gray-600 rounded">
                    <span className="text-md font-semibold text-white">{userId}</span>
                </div>
            )}
            <p className="mt-2 text-sm text-gray-300">
                Mic: {mediaState.micEnabled ? 'Ein' : 'Aus'} – Kamera: {mediaState.cameraEnabled ? 'Ein' : 'Aus'}
            </p>
        </div>
    );
};

function ChatContainer({ chatMessages }: { chatMessages: { sender: string; text: string }[] }) {
    const endOfChatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    return (
        <div className="flex-grow overflow-y-auto border p-2 mb-2">
            {chatMessages.map((msg, index) => (
                <p key={index} className="mb-1">
                    <strong>{msg.sender}:</strong> {msg.text}
                </p>
            ))}
            <div ref={endOfChatRef} />
        </div>
    );
}

interface MinimalLayoutProps {
    clients: Client[];
    micEnabled: boolean;
    cameraEnabled: boolean;
    chatMessages: ChatMessage[];
    chatInput: string;
    onChatInputChange: (text: string) => void;
    onSendChatMessage: () => void;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onBack: () => void;
    onShare: () => void;
}

export const MinimalLayoutExample: React.FC<MinimalLayoutProps> = ({
    clients,
    micEnabled,
    cameraEnabled,
    onToggleMic,
    onToggleCamera,
    onBack,
    onShare,
    chatInput,
    onChatInputChange,
    onSendChatMessage,
    chatMessages,
}) => {
    const [chatOpen, setChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const toggleChat = () => {
        setChatOpen((prev) => !prev);
        if (chatOpen) {
            setUnreadCount(0);
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {clients.map((client) => (
                    <ClientCard
                        key={client.userId}
                        userId={client.userId}
                        videoStream={client.videoStream}
                        mediaState={client.mediaState}
                    />
                ))}
            </div>
            {chatOpen && (
                <div className="absolute bottom-14 right-0 w-80 h-full pt-20 bg-white shadow-lg p-4 flex flex-col z-10">
                    <h2 className="text-xl font-bold mb-4">Chat</h2>
                    <ChatContainer chatMessages={chatMessages} />
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => onChatInputChange(e.target.value)}
                            className="border flex-1 px-2 py-1"
                            placeholder="Nachricht..."
                        />
                        <button onClick={onSendChatMessage} className="px-4 py-2 bg-blue-600 text-white rounded">
                            Senden
                        </button>
                    </div>
                </div>
            )}
            <ControlBar
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
                chatOpen={chatOpen}
                unreadCount={unreadCount}
                onToggleMic={onToggleMic}
                onToggleCamera={onToggleCamera}
                onToggleChat={toggleChat}
                onBack={onBack}
                onShare={onShare}
            />
        </div>
    );
};
