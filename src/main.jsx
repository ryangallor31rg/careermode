import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Polyfill for the Claude-artifact `window.storage` API, backed by
// the browser's localStorage so CareerMode's save/load code works
// unchanged outside the Claude sandbox. Matches the original API:
// get() throws if the key doesn't exist, set() always succeeds.
window.storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    if (value === null) throw new Error(`Key not found: ${key}`);
    return { key, value, shared: false };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value, shared: false };
  },
  async delete(key) {
    const existed = localStorage.getItem(key) !== null;
    localStorage.removeItem(key);
    return { key, deleted: existed, shared: false };
  },
  async list(prefix = '') {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    return { keys, prefix, shared: false };
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
