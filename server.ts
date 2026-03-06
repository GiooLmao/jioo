import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory storage
  let reports: any[] = [];
  let notifications: any[] = [];

  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.get('/api/initial-data', (req, res) => {
    res.json({ reports, notifications });
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    socket.on('report:create', (newReport) => {
      reports.push(newReport);
      io.emit('report:created', newReport);
    });

    socket.on('report:update', (updatedReport) => {
      reports = reports.map(r => r.id === updatedReport.id ? updatedReport : r);
      io.emit('report:updated', updatedReport);
    });

    socket.on('report:delete', (reportId) => {
      reports = reports.filter(r => r.id !== reportId);
      io.emit('report:deleted', reportId);
    });

    socket.on('notification:create', (notif) => {
      notifications.push(notif);
      io.emit('notification:created', notif);
    });

    socket.on('notification:mark-read', (notifId) => {
      notifications = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
      io.emit('notification:updated', notifId);
    });

    socket.on('notification:clear-all', (userId) => {
      notifications = notifications.filter(n => n.userId !== userId);
      io.emit('notification:cleared', userId);
    });
  });

  // Vite middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
