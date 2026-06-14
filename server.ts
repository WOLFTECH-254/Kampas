import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { Server } from "socket.io";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";

const onlineUsers = new Map<string, string>(); // userId → socketId
const lastSeenMap  = new Map<string, Date>();  // userId → last disconnect time

async function startServer() {
  const app  = express();
  const PORT = parseInt(process.env.PORT || "5000", 10);

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // ── Socket auth middleware ────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("no_auth"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "fallback") as any;
      (socket as any).userId = payload.id;
      next();
    } catch {
      next(new Error("invalid_token"));
    }
  });

  // ── Socket connection ─────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId: string = (socket as any).userId;
    if (!userId) { socket.disconnect(); return; }

    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);

    // Tell all other clients this user came online
    socket.broadcast.emit("user_online", { userId });

    // Join a specific chat room (called when user opens a chat)
    socket.on("join_chat", (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    // Leave a chat room
    socket.on("leave_chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    // Relay an already-persisted message to the other party in the room
    socket.on("new_message", (data: { chatId: string; message: any }) => {
      socket.to(`chat:${data.chatId}`).emit("new_message", data.message);
    });

    // Typing indicator
    socket.on("typing", (data: { chatId: string; isTyping: boolean }) => {
      socket.to(`chat:${data.chatId}`).emit("typing", {
        userId,
        isTyping: data.isTyping,
      });
    });

    // Community message — broadcast to everyone connected
    socket.on("community_message", (message: any) => {
      io.emit("community_message", message);
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      const now = new Date();
      lastSeenMap.set(userId, now);
      socket.broadcast.emit("user_offline", {
        userId,
        lastSeen: now.toISOString(),
      });
    });
  });

  // ── Presence REST endpoint ────────────────────────────────────────────────
  // GET /presence?userIds=id1,id2,id3
  app.get("/presence", (req, res) => {
    const ids = ((req.query.userIds as string) || "")
      .split(",")
      .filter(Boolean);

    const result: Record<string, { online: boolean; lastSeen: string | null }> = {};
    for (const id of ids) {
      result[id] = {
        online:   onlineUsers.has(id),
        lastSeen: lastSeenMap.get(id)?.toISOString() ?? null,
      };
    }
    res.json(result);
  });

  // ── Proxy /api → backend on port 8000 ────────────────────────────────────
  const publicHost = process.env.REPLIT_DEV_DOMAIN
    || process.env.REPLIT_DOMAINS?.split(",")[0]
    || process.env.APP_URL?.replace(/^https?:\/\//, "")
    || "localhost:5000";

  app.use(
    createProxyMiddleware({
      pathFilter: "/api",
      target: "http://localhost:8000",
      changeOrigin: true,
      headers: {
        "x-forwarded-host":  publicHost,
        "x-forwarded-proto": "https",
      },
      on: {
        error: (err, _req, res: any) => {
          console.error("Proxy error:", err.message);
          res.status(502).json({ error: "Backend unavailable" });
        },
      },
    })
  );

  app.use(express.json());

  // ── Vite / static ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true, hmr: true },
      appType: "spa",
    });
    // Rewrite Host header to localhost so Vite 6's strict host-check
    // doesn't return 426 "Upgrade Required" for external Replit domains.
    app.use((req, _res, next) => {
      req.headers.host = "localhost:5000";
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
