/**
 * E2EE Chat Server
 * ================
 * This server handles:
 *  - HTTP routes: auth (register/login) via Express
 *  - Real-time messaging via Socket.IO
 *
 * SECURITY: The server never decrypts any messages.
 * It only relays encrypted payloads between clients.
 * All encryption/decryption happens exclusively in the browser.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');

const app = express();
const httpServer = http.createServer(app);

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── Socket.IO Setup ─────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

/**
 * In-memory user registry.
 * Maps username → { socketId, publicKey (JWK) }
 * Public keys are RSA-OAEP keys exported as JWK from the browser.
 * They are NOT secret — they are used by other clients to encrypt AES keys.
 */
const onlineUsers = new Map();

// ─── Socket.IO: JWT Authentication Middleware ─────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.username = decoded.username;
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ─── Broadcast helper ─────────────────────────────────────────────────────────
/**
 * Emit the current online user list (with public keys) to all connected clients.
 * Clients use these public keys to encrypt AES keys before sending messages.
 */
function broadcastOnlineUsers() {
  const users = Array.from(onlineUsers.entries()).map(([username, data]) => ({
    username,
    publicKey: data.publicKey, // JWK — safe to share publicly
  }));
  io.emit('online-users', users);
}

// ─── Socket.IO: Connection Handler ───────────────────────────────────────────
io.on('connection', (socket) => {
  const username = socket.username;
  console.log(`[+] ${username} connected (socket: ${socket.id})`);

  // ── Register public key ───────────────────────────────────────────────────
  /**
   * Client emits 'register-key' immediately after connecting,
   * sending their RSA-OAEP public key as a JWK object.
   * We store it so other users can encrypt messages for this user.
   */
  socket.on('register-key', (publicKeyJwk) => {
    onlineUsers.set(username, {
      socketId: socket.id,
      publicKey: publicKeyJwk,
    });
    console.log(`[KEY] Public key registered for ${username}`);
    broadcastOnlineUsers();
  });

  // ── Send encrypted message ────────────────────────────────────────────────
  /**
   * Client emits 'send-message' with:
   *  {
   *    to:              string  — recipient username
   *    encryptedMsg:    string  — base64 AES-GCM ciphertext
   *    encryptedAESKey: string  — base64 RSA-OAEP encrypted AES key
   *    iv:              string  — base64 AES-GCM initialisation vector
   *  }
   *
   * The server NEVER touches the plaintext. It simply forwards the
   * encrypted payload to the recipient's socket.
   */
  socket.on('send-message', ({ to, encryptedMsg, encryptedAESKey, iv }) => {
    const recipient = onlineUsers.get(to);
    if (!recipient) {
      socket.emit('error-msg', { message: `User "${to}" is not online` });
      return;
    }

    // Log only that a message was relayed — never the content
    console.log(`[MSG] Encrypted relay: ${username} → ${to}`);

    io.to(recipient.socketId).emit('receive-message', {
      from: username,
      encryptedMsg,
      encryptedAESKey,
      iv,
      timestamp: Date.now(),
    });
  });

  // ── Typing indicator ──────────────────────────────────────────────────────
  socket.on('typing', ({ to, isTyping }) => {
    const recipient = onlineUsers.get(to);
    if (recipient) {
      io.to(recipient.socketId).emit('user-typing', {
        from: username,
        isTyping,
      });
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(username);
    console.log(`[-] ${username} disconnected`);
    broadcastOnlineUsers();
  });
});

// ─── MongoDB + Server Start ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`[SERVER] Running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
