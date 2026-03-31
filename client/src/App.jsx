import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

const MainApp = () => {
  const { token } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-8 text-primary">Secure Chat E2EE</h1>
        <div className="w-full max-w-md">
          {showRegister ? (
            <Register onSwitch={() => setShowRegister(false)} />
          ) : (
            <Login onSwitch={() => setShowRegister(true)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#dadbd3]">
      <Chat />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
