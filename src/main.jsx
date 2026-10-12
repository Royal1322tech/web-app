import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    setLoaded(false);

    try {
      const response = await fetch(
        'https://staging-api.royalis.tech/api/cicd-records'
      );

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success' || !Array.isArray(data.records)) {
        throw new Error('Unexpected API response');
      }

      setRecords(data.records);
      setLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '80px 20px'
    }}>
      <h1>Royal Travel</h1>
      <h2>Frontend CI/CD Test - Version 3</h2>
      <p>React + Laravel + PostgreSQL Integration Test</p>
      <p>Environment: Staging</p>

      <button
        onClick={loadData}
        disabled={loading}
        style={{
          marginTop: '25px',
          padding: '14px 28px',
          backgroundColor: '#0756b8',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: loading ? 'wait' : 'pointer'
        }}
      >
        {loading ? 'Loading...' : 'Load Data from Database'}
      </button>

      {error && (
        <p style={{ color: 'red' }}>
          Error: {error}
        </p>
      )}

      {loaded && (
        <section style={{ marginTop: '30px' }}>
          <h3>Data received from PostgreSQL</h3>

          {records.length === 0 ? (
            <p>No records found.</p>
          ) : (
            <table style={{
              margin: '20px auto',
              borderCollapse: 'collapse',
              minWidth: '320px'
            }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', border: '1px solid #ddd' }}>
                    Name
                  </th>
                  <th style={{ padding: '12px', border: '1px solid #ddd' }}>
                    City
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {record.name}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {record.city}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
