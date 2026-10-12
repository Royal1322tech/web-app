import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <main style={{
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '80px 20px'
    }}>
      <h1>Royal Travel</h1>
      <h2>Frontend CI/CD Test - Version 2</h2>
      <p>React + Vite deployment verification</p>
      <p>Environment: Staging</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
