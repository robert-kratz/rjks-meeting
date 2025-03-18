"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const next_1 = __importDefault(require("next"));
const socket_io_1 = require("socket.io");
const socket_1 = require("./src/server/socket");
const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const nextApp = (0, next_1.default)({ dev });
const handle = nextApp.getRequestHandler();
nextApp.prepare().then(() => {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*' },
    });
    // Initialisiere Socket.IO inkl. Mediasoup-Integration und Chat
    (0, socket_1.initSocket)(io);
    app.post('/api/room', async (req, res) => {
        const roomId = await (0, socket_1.createRoom)();
        res.json({ roomId });
    });
    app.delete('/api/room/:roomId', (req, res) => {
        const roomId = req.params.roomId;
        (0, socket_1.removeRoom)(roomId);
        res.json({ success: true });
    });
    //declare api endpint to check weather a room exists
    app.get('/api/room/:roomId', (req, res) => {
        const roomId = req.params.roomId;
        const exists = (0, socket_1.roomExists)(roomId);
        res.json({ exists });
    });
    // Alle Anfragen an Next.js weiterleiten
    app.all('*', (req, res) => handle(req, res));
    httpServer.listen(port, () => {
        console.log(`> Server läuft auf http://localhost:${port}`);
    });
});
