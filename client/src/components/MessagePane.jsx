import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Lock, MessageSquareLock } from 'lucide-react';

const avatarColors = [
  'bg-purple-500', 'bg-blue-500', 'bg-orange-500',
  'bg-pink-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500',
];
const getColor = (name) => avatarColors[name?.charCodeAt(0) % avatarColors.length] || 'bg-gray-500';
const getInitial = (name) => name ? name[0].toUpperCase() : '?';

const formatTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function MessagePane({ myUsername, selectedUser, messages, isTyping, onSend, onTyping }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when user selected
  useEffect(() => {
    if (selectedUser) inputRef.current?.focus();
  }, [selectedUser]);

  const handleTyping = (e) => {
    setText(e.target.value);
    onTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onTyping(false), 1500);
  };

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    onTyping(false);
    clearTimeout(typingTimerRef.current);
  }, [text, onSend, onTyping]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── No user selected ────────────────────────────────────────────────────────
  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-[#075e54]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquareLock className="w-12 h-12 text-[#075e54]" />
          </div>
          <h3 className="text-2xl font-light text-gray-700 mb-2">Secure Chat</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Select a contact from the sidebar to start a conversation.
            All messages are protected with end-to-end encryption.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            <span>RSA-OAEP + AES-GCM hybrid encryption</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2] overflow-hidden">
      {/* ── Chat Header ──────────────────────────────────────────────────────── */}
      <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3 shadow-md flex-shrink-0">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${getColor(selectedUser)}`}>
            {getInitial(selectedUser)}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#075e54] rounded-full" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{selectedUser}</p>
          <p className="text-green-300 text-xs">
            {isTyping ? (
              <span className="flex items-center gap-1">
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                typing…
              </span>
            ) : 'Online · 🔒 E2E Encrypted'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1">
          <Lock className="w-3 h-3 text-green-300" />
          <span className="text-green-300 text-xs font-medium">Encrypted</span>
        </div>
      </div>

      {/* ── Message List ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5a9' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-white/60 backdrop-blur rounded-2xl px-6 py-4 shadow-sm">
              <Lock className="w-6 h-6 text-[#075e54] mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">Your messages are secured</p>
              <p className="text-xs text-gray-400 mt-1">Send a message to start chatting with <b>{selectedUser}</b></p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} myUsername={myUsername} />
          ))
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getColor(selectedUser)}`}>
              {getInitial(selectedUser)}
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ────────────────────────────────────────────────────────── */}
      <div className="bg-[#f0f2f5] px-3 py-2 flex items-end gap-2 flex-shrink-0 border-t border-gray-200">
        <div className="flex-1 bg-white rounded-2xl px-4 py-2.5 flex items-end gap-2 shadow-sm border border-gray-100 min-h-[44px]">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedUser}…`}
            rows={1}
            className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent max-h-28 leading-5 py-0.5"
            style={{ scrollbarWidth: 'none' }}
          />
          <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mb-0.5" title="End-to-end encrypted" />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-10 h-10 bg-[#075e54] hover:bg-[#05453e] disabled:bg-gray-300 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-sm"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// ── Individual message bubble ────────────────────────────────────────────────
function MessageBubble({ msg, myUsername }) {
  const isSelf = msg.self || msg.from === myUsername;

  return (
    <div className={`flex items-end gap-1.5 ${isSelf ? 'justify-end' : 'justify-start'}`}>
      {!isSelf && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getColor(msg.from)}`}>
          {getInitial(msg.from)}
        </div>
      )}
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-3.5 py-2 shadow-sm relative ${
          isSelf
            ? 'bg-[#dcf8c6] rounded-br-sm'
            : 'bg-white rounded-bl-sm'
        }`}
      >
        {/* Tail for self */}
        {isSelf && (
          <div className="absolute bottom-0 right-[-6px] w-0 h-0
            border-l-[7px] border-l-[#dcf8c6]
            border-b-[7px] border-b-transparent" />
        )}
        {/* Tail for other */}
        {!isSelf && (
          <div className="absolute bottom-0 left-[-6px] w-0 h-0
            border-r-[7px] border-r-white
            border-b-[7px] border-b-transparent" />
        )}

        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
        <div className={`flex items-center gap-1 mt-0.5 ${isSelf ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
          {isSelf && (
            <svg className="w-3.5 h-3 text-blue-400" viewBox="0 0 16 11" fill="currentColor">
              <path d="M11.071.653a.75.75 0 0 1 .207 1.04l-5.5 8a.75.75 0 0 1-1.147.114l-3-3a.75.75 0 0 1 1.06-1.06l2.4 2.4 4.94-7.187a.75.75 0 0 1 1.04-.207Z" />
              <path d="M14.571.653a.75.75 0 0 1 .207 1.04l-5.5 8a.75.75 0 0 1-1.147.114l-.5-.5a.75.75 0 0 1 1.06-1.06l.04.04 4.8-6.987a.75.75 0 0 1 1.04-.207Z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
