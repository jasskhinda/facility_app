'use client';

import { useState } from 'react';

export default function TestClientAPI() {
  const [clientId, setClientId] = useState('72a44be8-8e3b-4626-854e-39d5ea79223a');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testGetClient = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing GET /api/facility/clients/' + clientId);
      const response = await fetch(`/api/facility/clients/${clientId}`);
      const data = await response.json();
      
      console.log('Response:', { status: response.status, data });
      
      if (!response.ok) {
        setError(`${response.status}: ${data.error || 'Unknown error'}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testUpdateClient = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing PUT /api/facility/clients/' + clientId);
      const response = await fetch(`/api/facility/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: 'Updated',
          last_name: 'Test',
          email: 'updated.test@example.com',
          phone_number: '(555) 999-8888',
          address: 'Updated Address',
          accessibility_needs: 'Updated needs',
          medical_requirements: 'Updated requirements',
          emergency_contact: 'Updated Contact'
        }),
      });
      
      const data = await response.json();
      
      console.log('Response:', { status: response.status, data });
      
      if (!response.ok) {
        setError(`${response.status}: ${data.error || 'Unknown error'}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Client API</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Client ID:</label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          placeholder="Enter client ID to test"
        />
      </div>
      
      <div className="space-x-4 mb-6">
        <button
          onClick={testGetClient}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test GET Client'}
        </button>
        
        <button
          onClick={testUpdateClient}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test UPDATE Client'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="p-4 bg-gray-100 border border-gray-300 rounded-md">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-bold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Make sure you're logged in as a facility admin</li>
          <li>Enter a client ID (default is from your example)</li>
          <li>Click "Test GET Client" to see if the client can be retrieved</li>
          <li>Click "Test UPDATE Client" to test updating the client</li>
          <li>Check the browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
}
