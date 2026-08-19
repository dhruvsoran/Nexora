import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { config } from './config';
import { connectDb } from './config/db';
import { setupSocket } from './socket';

async function main() {
  const app = createApp();

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigin,
      credentials: true,
    },
  });

  setupSocket(io);

  await connectDb();

  httpServer.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port} (${config.env})`);
  });

  async function shutdown(signal: string) {
    console.log(`\n[server] ${signal} received, shutting down`);
    io.close();
    httpServer.close(async () => {
      try {
        const { disconnectDb } = await import('./config/db');
        await disconnectDb();
      } catch {
        // best effort
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});