// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomePage() {
    const router = useRouter();
    const [error, setError] = useState('');

    const handleCreateRoom = async () => {
        try {
            // Audio-/Video-Berechtigung anfragen
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            // Generiere eine eindeutige Raum-ID
            const data = await fetch('/api/room', { method: 'POST' }).then((res) => res.json());

            console.log(data);

            router.push(`/room/${data.roomId}`);
        } catch (err) {
            console.error(err);
            setError('Bitte erlauben Sie den Zugriff auf Audio und Video.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-3xl font-bold mb-4">Raum erstellen</h1>
            <button onClick={handleCreateRoom} className="px-4 py-2 bg-blue-600 text-white rounded">
                Raum erstellen
            </button>
            {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
    );
}
