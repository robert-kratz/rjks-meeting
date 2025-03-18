'use client';

import { useEffect, useRef } from 'react';

interface MemberAudioIndicatorProps {
    memberId: string;
    stream: MediaStream;
    muted?: boolean;
}

export default function MemberAudioIndicator({ memberId, stream, muted }: MemberAudioIndicatorProps) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        audioEl.pause();
        audioEl.srcObject = stream;

        const handleLoadedMetadata = () => {
            audioEl.play().catch((error) => console.error('Audio playback error on metadata load:', error));
        };

        audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => {
            audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [stream]);

    return (
        <div className="border p-2">
            <p>Audio von: {memberId}</p>
            <audio ref={audioRef} playsInline controls muted={muted} />
        </div>
    );
}
