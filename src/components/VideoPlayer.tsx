'use client';

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
    stream: MediaStream;
}

export default function VideoPlayer({ stream }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return <video ref={videoRef} autoPlay playsInline controls style={{ width: '300px' }} />;
}
