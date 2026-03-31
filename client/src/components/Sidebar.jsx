import React from 'react';
import { MessageSquareLock, LogOut, Circle } from 'lucide-react';

export default function Sidebar({ myUsername, onlineUsers, selectedUser, onSelectUser, conversations, onLogout }) {
  // Get the last message preview for a user
  const getLastMessage = (username) => {
    const msgs = conversations[username];
    if (!msgs || msgs.length === 0) return null;
    const last = msgs[msgs.length - 1];
    return {
      text: last.text.length > 40 ? last.text.slice(0, 40) + '…' : last.text,
      self: last.self,
      timestamp: last.timestamp,
    };
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitial = (name) => name ? name[0].toUpperCase() : '?';

  const avatarColors = [
    'bg-purple-500', 'bg-blue-500', 'bg-orange-500',
    'bg-pink-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500',
  ];
  const getColor = (name) => avatarColors[name?.charCodeAt(0) % avatarColors.length] || 'bg-gray-500';

  return (
    <div className="w-80 flex flex-col bg-white border-r border-gray-200 flex-shrink-0">
      {/* Header */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${getColor(myUsername)}`}>
            {getInitial(myUsername)}
          </div>
          <div>
            <p className="font-semibold text-sm">{myUsername}</p>
            <p className="text-green-300 text-xs">● Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquareLock className="w-5 h-5 text-green-300" />
          <button
            onClick={onLogout}
            title="Logout"
            className="p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search / Title */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Online Users</p>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {onlineUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
            <Circle className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No other users online</p>
            <p className="text-xs mt-1">Other users will appear here when they join</p>
          </div>
        ) : (
          onlineUsers.map((u) => {
            const last = getLastMessage(u.username);
            const isSelected = selectedUser === u.username;
            const hasUnread = !isSelected && conversations[u.username]?.some((m) => !m.self);

            return (
              <button
                key={u.username}
                onClick={() => onSelectUser(u.username)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 text-left ${
                  isSelected ? 'bg-[#f0f2f5]' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white ${getColor(u.username)}`}>
                    {getInitial(u.username)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-gray-800 truncate">{u.username}</p>
                    {last && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(last.timestamp)}</span>
                    )}
                  </div>
                  {last ? (
                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-[#075e54] font-medium' : 'text-gray-400'}`}>
                      {last.self ? '✓ ' : ''}{last.text}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">🔒 E2E Encrypted</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
          <span>🔐</span> Messages are end-to-end encrypted
        </p>
      </div>
    </div>
  );
}
