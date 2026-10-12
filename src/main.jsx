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
      <p>Staging Environment Ready</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
