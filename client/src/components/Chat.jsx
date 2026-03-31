import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import {
  importPublicKey,
  encryptWithAES,
  encryptAESKeyWithRSA,
  decryptAESKeyWithRSA,
  decryptWithAES,
} from '../utils/crypto';
import Sidebar from './Sidebar';
import MessagePane from './MessagePane';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Chat() {
  const { token, keyPair, initializeKeys, logout } = useAuth();
  const socketRef = useRef(null);

  const [onlineUsers, setOnlineUsers] = useState([]);        // [{ username, publicKey }]
  const [selectedUser, setSelectedUser] = useState(null);     // username string
  const [conversations, setConversations] = useState({});     // { username: [msgs] }
  const [typingStatus, setTypingStatus] = useState({});       // { username: bool }
  const [keysReady, setKeysReady] = useState(false);
  const [myUsername, setMyUsername] = useState('');

  // ── Initialise: generate RSA keys and connect socket ────────────────────────
  useEffect(() => {
    let socket;

    const setup = async () => {
      // 1. Generate (or retrieve) RSA key pair
      const { keys, jwk } = await initializeKeys();
      setKeysReady(true);

      // Decode JWT to read username
      const payload = JSON.parse(atob(token.split('.')[1]));
      setMyUsername(payload.username);

      // 2. Connect Socket.IO with JWT
      socket = io(API, { auth: { token } });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[SOCKET] Connected:', socket.id);
        // 3. Register our public key on the server
        socket.emit('register-key', jwk);
      });

      socket.on('online-users', (users) => {
        setOnlineUsers(users.filter((u) => u.username !== payload.username));
      });

      // ── Receive encrypted message ───────────────────────────────────────────
      /**
       * Flow (receiver side):
       * 1. Get encrypted AES key → decrypt with our RSA private key
       * 2. Get encrypted message → decrypt with the recovered AES key
       * 3. Display plaintext
       */
      socket.on('receive-message', async ({ from, encryptedMsg, encryptedAESKey, iv, timestamp }) => {
        try {
          // Step 1: Decrypt AES key using our private RSA key
          const aesKey = await decryptAESKeyWithRSA(keys.privateKey, encryptedAESKey);

          // Step 2: Decrypt the message with the AES key
          const plaintext = await decryptWithAES(encryptedMsg, aesKey, iv);

          // Step 3: Store in conversation
          setConversations((prev) => ({
            ...prev,
            [from]: [
              ...(prev[from] || []),
              { from, text: plaintext, timestamp, self: false },
            ],
          }));
        } catch (err) {
          console.error('[DECRYPT] Failed:', err);
        }
      });

      socket.on('user-typing', ({ from, isTyping }) => {
        setTypingStatus((prev) => ({ ...prev, [from]: isTyping }));
      });

      socket.on('error-msg', ({ message }) => {
        alert(`Error: ${message}`);
      });

      socket.on('disconnect', () => {
        console.log('[SOCKET] Disconnected');
      });
    };

    setup();

    return () => {
      socket?.disconnect();
    };
  }, [token]);

  // ── Send message ─────────────────────────────────────────────────────────────
  /**
   * Flow (sender side):
   * 1. Generate random AES key, encrypt message → { encryptedMsg, rawAesKey, iv }
   * 2. Find the recipient's RSA public key from onlineUsers list
   * 3. Encrypt the raw AES key with the recipient's public key
   * 4. Emit encrypted payload — server only relays, never reads it
   */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || !selectedUser || !socketRef.current) return;

    // Find recipient's public key JWK
    const recipient = onlineUsers.find((u) => u.username === selectedUser);
    if (!recipient) {
      alert(`${selectedUser} is no longer online`);
      return;
    }

    try {
      // Step 1: Encrypt message with random AES key
      const { encryptedMsg, rawAesKey, iv } = await encryptWithAES(text);

      // Step 2: Import recipient RSA public key
      const recipientPublicKey = await importPublicKey(recipient.publicKey);

      // Step 3: Encrypt the AES key with recipient's RSA public key
      const encryptedAESKey = await encryptAESKeyWithRSA(recipientPublicKey, rawAesKey);

      // Step 4: Emit — only ciphertext leaves this device
      socketRef.current.emit('send-message', {
        to: selectedUser,
        encryptedMsg,
        encryptedAESKey,
        iv,
      });

      // Show message locally (we already know the plaintext)
      setConversations((prev) => ({
        ...prev,
        [selectedUser]: [
          ...(prev[selectedUser] || []),
          { from: myUsername, text, timestamp: Date.now(), self: true },
        ],
      }));
    } catch (err) {
      console.error('[ENCRYPT] Failed:', err);
    }
  }, [selectedUser, onlineUsers, myUsername]);

  // ── Typing indicator ────────────────────────────────────────────────────────
  const sendTyping = useCallback((isTyping) => {
    if (selectedUser && socketRef.current) {
      socketRef.current.emit('typing', { to: selectedUser, isTyping });
    }
  }, [selectedUser]);

  if (!keysReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#dadbd3]">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#075e54] mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-[#075e54] font-semibold">Generating RSA key pair…</p>
          <p className="text-gray-500 text-sm mt-1">Setting up end-to-end encryption</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        myUsername={myUsername}
        onlineUsers={onlineUsers}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        conversations={conversations}
        onLogout={logout}
      />
      <MessagePane
        myUsername={myUsername}
        selectedUser={selectedUser}
        messages={conversations[selectedUser] || []}
        isTyping={typingStatus[selectedUser] || false}
        onSend={sendMessage}
        onTyping={sendTyping}
      />
    </div>
  );
}
