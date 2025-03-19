import * as mediasoup from 'mediasoup';
import dotenv from 'dotenv';

dotenv.config();

const LISTEN_IP = process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0';
const ANNOUNCED_IP = process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1';

const rtcMinPort = Number(process.env.MEDIASOUP_RTC_MIN_PORT) || 40000;
const rtcMaxPort = Number(process.env.MEDIASOUP_RTC_MAX_PORT) || 40500;

let worker: mediasoup.types.Worker | null = null;

export async function createMediasoupWorker(): Promise<mediasoup.types.Worker> {
    if (!worker) {
        worker = await mediasoup.createWorker({
            logLevel: 'warn',
            rtcMinPort,
            rtcMaxPort,
        });
        worker.on('died', () => {
            console.error('Mediasoup Worker ist abgestürzt. Prozess wird beendet...');
            process.exit(1);
        });
    }
    return worker;
}

export async function createMediasoupRouter(worker: mediasoup.types.Worker): Promise<mediasoup.types.Router> {
    const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
        {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
        },
        {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters: { 'x-google-start-bitrate': 1000 },
        },
    ];
    return await worker.createRouter({ mediaCodecs });
}

export async function createWebRtcTransport(router: mediasoup.types.Router): Promise<mediasoup.types.WebRtcTransport> {
    const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: LISTEN_IP, announcedIp: ANNOUNCED_IP }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });
    return transport;
}
