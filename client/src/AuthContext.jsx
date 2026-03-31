import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { generateKeyPair, exportPublicKey } from './utils/crypto';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [keyPair, setKeyPair] = useState(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Logic to fetch user profile could go here
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = (data) => {
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setKeyPair(null);
    setPublicKeyJwk(null);
  };

  const initializeKeys = async () => {
    if (!keyPair) {
      console.log('[CRYPTO] Generating RSA Key Pair...');
      const keys = await generateKeyPair();
      const jwk = await exportPublicKey(keys.publicKey);
      setKeyPair(keys);
      setPublicKeyJwk(jwk);
      return { keys, jwk };
    }
    return { keys: keyPair, jwk: publicKeyJwk };
  };

  return (
    <AuthContext.Provider value={{ user, token, keyPair, publicKeyJwk, login, logout, initializeKeys }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
