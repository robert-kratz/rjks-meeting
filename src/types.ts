// types.ts

// Typdefinition für einen Client (lokal oder remote)
export interface Client {
    userId: string;
    // videoStream kann entweder ein MediaStream oder undefined sein (z.B. wenn die Kamera ausgeschaltet ist)
    videoStream?: MediaStream;
    mediaState: {
        micEnabled: boolean;
        cameraEnabled: boolean;
        // Optional: zeigt an, ob der Teilnehmer gerade spricht
        speaking?: boolean;
    };
}

// Typdefinition für eine Chatnachricht
export interface ChatMessage {
    sender: string;
    text: string;
}

// Props für die ControlBar-Komponente
export interface ControlBarProps {
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

// Props für die MinimalLayoutExample-Komponente
export interface MinimalLayoutProps {
    clients: Client[];
    micEnabled: boolean;
    cameraEnabled: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onBack: () => void;
    onShare: () => void;
    // Zusätzlich für den Chat:
    chatMessages: ChatMessage[];
    chatInput: string;
    onChatInputChange: (text: string) => void;
    onSendChatMessage: () => void;
}
