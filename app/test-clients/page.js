'use client';

import { useState } from 'react';

export default function TestClientCreation() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    accessibility_needs: '',
    medical_requirements: '',
    emergency_contact: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/facility/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create client');
      }

      const result = await response.json();
      setMessage(`✅ Client created: ${result.client.first_name} ${result.client.last_name}`);
      
      // Clear form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
        accessibility_needs: '',
        medical_requirements: '',
        emergency_contact: ''
      });

      // Refresh client list
      loadClients();
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch('/api/facility/clients', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load clients');
      }

      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      setError(`❌ Error loading clients: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🧪 Client Creation Test (Demo Mode)
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Add New Client</h2>
              
              {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  {message}
                </div>
              )}
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={createClient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First Name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last Name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                
                <input
                  type="tel"
                  name="phone_number"
                  placeholder="Phone Number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                
                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                
                <textarea
                  name="accessibility_needs"
                  placeholder="Accessibility Needs"
                  value={formData.accessibility_needs}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                
                <textarea
                  name="medical_requirements"
                  placeholder="Medical Requirements"
                  value={formData.medical_requirements}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                
                <input
                  type="text"
                  name="emergency_contact"
                  placeholder="Emergency Contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Client'}
                </button>
              </form>
            </div>

            {/* Client List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Client List</h2>
                <button
                  onClick={loadClients}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Refresh
                </button>
              </div>
              
              <div className="space-y-3">
                {clients.length === 0 ? (
                  <p className="text-gray-500">No clients found. Create one to test!</p>
                ) : (
                  clients.map((client) => (
                    <div
                      key={client.id}
                      className="border border-gray-200 rounded p-3 bg-gray-50"
                    >
                      <div className="font-semibold">
                        {client.first_name} {client.last_name}
                        {client.demo_mode && (
                          <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        📧 {client.email}
                      </div>
                      {client.phone_number && (
                        <div className="text-sm text-gray-600">
                          📞 {client.phone_number}
                        </div>
                      )}
                      {client.address && (
                        <div className="text-sm text-gray-600">
                          📍 {client.address}
                        </div>
                      )}
                      {client.accessibility_needs && (
                        <div className="text-sm text-blue-600">
                          ♿ {client.accessibility_needs}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Type: {client.client_type || 'demo'} | Created: {new Date(client.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">💡 How this works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• This page bypasses authentication for testing</li>
              <li>• Clients are created in "demo mode" since the database table doesn't exist yet</li>
              <li>• In production, run the SQL migration to create the facility_managed_clients table</li>
              <li>• Once authenticated, the regular dashboard will work with the same API</li>
              <li>• Demo clients are not persisted - they exist only in memory during API calls</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

