import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { createRoom, initSocket, removeRoom, roomExists } from './src/server/socket';

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';

const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
    const app = express();
    const httpServer = createServer(app);
    const io = new SocketIOServer(httpServer, {
        cors: { origin: '*' },
    });

    // Initialisiere Socket.IO inkl. Mediasoup-Integration und Chat
    initSocket(io);

    app.post('/api/room', async (req, res) => {
        const roomId = await createRoom();
        res.json({ roomId });
    });

    app.delete('/api/room/:roomId', (req, res) => {
        const roomId = req.params.roomId;
        removeRoom(roomId);
        res.json({ success: true });
    });

    //declare api endpint to check weather a room exists
    app.get('/api/room/:roomId', (req, res) => {
        const roomId = req.params.roomId;
        const exists = roomExists(roomId);

        res.json({ exists });
    });

    // Alle Anfragen an Next.js weiterleiten
    app.all('*', (req, res) => handle(req, res));

    httpServer.listen(port, () => {
        console.log(`> Server läuft auf http://localhost:${port}`);
    });
});
