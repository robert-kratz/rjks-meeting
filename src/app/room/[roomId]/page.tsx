import Room from '@/components/room/Room';
import Link from 'next/link';

type RoomPageProps = {
    params: Promise<{ roomId: string }>;
};

export async function generateStaticParams() {
    return []; // Falls du dynamische Räume hast, musst du hier Raum-IDs liefern.
}

export default async function RoomPage({ params }: RoomPageProps) {
    const roomId = (await params).roomId || ''; // Hier ist params jetzt korrekt.

    console.log(`http://localhost:3000/api/room/${roomId}`);

    try {
        const res = await fetch(`http://localhost:3000/api/room/${roomId}`);
        if (!res.ok) throw new Error('Fehler beim Abrufen der Raumdaten');

        const data = await res.json();
        if (!data.exists) {
            return (
                <>
                    <div>Der Raum existiert nicht.</div>
                    <Link href="/">Zurück zur Startseite</Link>
                </>
            );
        }

        return <Room />;
    } catch (error) {
        console.error(error);
        return (
            <>
                <div>Fehler beim Laden des Raums.</div>
                <Link href="/">Zurück zur Startseite</Link>
            </>
        );
    }
}
