'use client';

import { useState, useEffect } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from './DashboardLayout';

export default function StreamlinedBookingForm({ user }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('client');
  
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [facilityId, setFacilityId] = useState(null);
  const [facilityDefaults, setFacilityDefaults] = useState({});
  
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    pickupAddress: '',
    pickupDetails: '',
    destinationAddress: '',
    destinationDetails: '',
    pickupDate: '',
    pickupTime: '',
    isRoundTrip: false,
    returnTime: '',
    wheelchairType: 'no_wheelchair',
    additionalPassengers: 0,
    tripNotes: '',
    billTo: 'facility' // facility or client
  });

  const [selectedClient, setSelectedClient] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadFacilityAndClients();
  }, [user]);

  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId);
      setSelectedClient(client);
      
      // Auto-fill pickup address if client has default address
      if (client?.address && !formData.pickupAddress) {
        setFormData(prev => ({
          ...prev,
          pickupAddress: client.address
        }));
      }
    }
  }, [formData.clientId, clients]);

  async function loadFacilityAndClients() {
    try {
      const supabase = createClientSupabase();
      
      // Get facility info
      const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.facility_id) {
        setFacilityId(profile.facility_id);
        
        // Get facility defaults
        const { data: facility } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', profile.facility_id)
          .single();
          
        if (facility) {
          setFacilityDefaults({
            address: facility.address,
            phone: facility.phone_number
          });
        }
        
        // Load clients
        const { data: facilityClients } = await supabase
          .from('profiles')
          .select('*')
          .eq('facility_id', profile.facility_id)
          .eq('role', 'client')
          .eq('status', 'active')
          .order('first_name');
          
        setClients(facilityClients || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load facility data');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }
    
    if (!formData.pickupAddress || !formData.destinationAddress) {
      setError('Please fill in both pickup and destination addresses');
      return;
    }
    
    if (!formData.pickupDate || !formData.pickupTime) {
      setError('Please select pickup date and time');
      return;
    }
    
    try {
      setLoading(true);
      const supabase = createClientSupabase();
      
      // Combine date and time
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);
      
      // Create trip
      const tripData = {
        user_id: formData.clientId,
        facility_id: facilityId,
        pickup_address: formData.pickupAddress,
        pickup_details: formData.pickupDetails,
        destination_address: formData.destinationAddress,
        destination_details: formData.destinationDetails,
        pickup_time: pickupDateTime.toISOString(),
        wheelchair_type: formData.wheelchairType,
        additional_passengers: formData.additionalPassengers,
        trip_notes: formData.tripNotes,
        status: 'pending',
        booked_by: user.id,
        bill_to: formData.billTo
      };
      
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert(tripData)
        .select()
        .single();
        
      if (tripError) throw tripError;
      
      // If round trip, create return trip
      if (formData.isRoundTrip && formData.returnTime) {
        const returnDateTime = new Date(`${formData.pickupDate}T${formData.returnTime}`);
        
        const returnTripData = {
          ...tripData,
          pickup_address: formData.destinationAddress,
          pickup_details: formData.destinationDetails,
          destination_address: formData.pickupAddress,
          destination_details: formData.pickupDetails,
          pickup_time: returnDateTime.toISOString(),
          trip_notes: `Return trip. ${formData.tripNotes}`,
          related_trip_id: trip.id
        };
        
        await supabase.from('trips').insert(returnTripData);
      }
      
      setSuccess(true);
      
      // Reset form or redirect
      setTimeout(() => {
        router.push('/dashboard/trips');
      }, 2000);
      
    } catch (err) {
      console.error('Error booking trip:', err);
      setError(err.message || 'Failed to book trip');
    } finally {
      setLoading(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];
  
  // Generate time options
  const timeOptions = [];
  for (let hour = 5; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const time = `${h}:${m}`;
      const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
      timeOptions.push({ value: time, label: displayTime });
    }
  }

  return (
    <DashboardLayout user={user} activeTab="book">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63] p-6">
          <h1 className="text-2xl font-bold text-[#2E4F54] dark:text-[#E0F4F5] mb-6">
            Book Transportation
          </h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
              Trip booked successfully! Redirecting...
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                Select Client *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                required
              >
                <option value="">Choose a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name} - {client.phone_number}
                  </option>
                ))}
              </select>
              {selectedClient && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-[#24393C] rounded-lg text-sm">
                  {selectedClient.medical_requirements && (
                    <p className="text-[#2E4F54]/80 dark:text-[#E0F4F5]/80">
                      <span className="font-medium">Medical notes:</span> {selectedClient.medical_requirements}
                    </p>
                  )}
                  {selectedClient.accessibility_needs && (
                    <p className="text-[#2E4F54]/80 dark:text-[#E0F4F5]/80 mt-1">
                      <span className="font-medium">Accessibility:</span> {selectedClient.accessibility_needs}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                  Pickup Date *
                </label>
                <input
                  type="date"
                  value={formData.pickupDate}
                  onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                  min={today}
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                  Pickup Time *
                </label>
                <select
                  value={formData.pickupTime}
                  onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                >
                  <option value="">Select time...</option>
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                  Pickup Address *
                </label>
                <input
                  type="text"
                  value={formData.pickupAddress}
                  onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                  placeholder="Enter pickup address"
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                />
                <input
                  type="text"
                  value={formData.pickupDetails}
                  onChange={(e) => setFormData({ ...formData, pickupDetails: e.target.value })}
                  placeholder="Apartment, suite, building entrance, etc. (optional)"
                  className="mt-2 w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                  Destination Address *
                </label>
                <input
                  type="text"
                  value={formData.destinationAddress}
                  onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                  placeholder="Enter destination address"
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                />
                <input
                  type="text"
                  value={formData.destinationDetails}
                  onChange={(e) => setFormData({ ...formData, destinationDetails: e.target.value })}
                  placeholder="Building, entrance, room number, etc. (optional)"
                  className="mt-2 w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                />
              </div>
            </div>

            {/* Round Trip */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isRoundTrip}
                  onChange={(e) => setFormData({ ...formData, isRoundTrip: e.target.checked })}
                  className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] rounded focus:ring-[#7CCFD0]"
                />
                <span className="text-[#2E4F54] dark:text-[#E0F4F5]">Round trip</span>
              </label>
              
              {formData.isRoundTrip && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                    Return Time
                  </label>
                  <select
                    value={formData.returnTime}
                    onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                    className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  >
                    <option value="">Select return time...</option>
                    {timeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                  Wheelchair Type
                </label>
                <select
                  value={formData.wheelchairType}
                  onChange={(e) => setFormData({ ...formData, wheelchairType: e.target.value })}
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                >
                  <option value="no_wheelchair">No wheelchair</option>
                  <option value="foldable">Foldable wheelchair</option>
                  <option value="power">Power wheelchair</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                  Additional Passengers
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={formData.additionalPassengers}
                  onChange={(e) => setFormData({ ...formData, additionalPassengers: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                Trip Notes
              </label>
              <textarea
                value={formData.tripNotes}
                onChange={(e) => setFormData({ ...formData, tripNotes: e.target.value })}
                placeholder="Special instructions, medical equipment, etc."
                rows={3}
                className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
              />
            </div>

            {/* Billing */}
            <div>
              <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
                Bill To
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="facility"
                    checked={formData.billTo === 'facility'}
                    onChange={(e) => setFormData({ ...formData, billTo: e.target.value })}
                    className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] focus:ring-[#7CCFD0]"
                  />
                  <span className="text-[#2E4F54] dark:text-[#E0F4F5]">Facility</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="client"
                    checked={formData.billTo === 'client'}
                    onChange={(e) => setFormData({ ...formData, billTo: e.target.value })}
                    className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] focus:ring-[#7CCFD0]"
                  />
                  <span className="text-[#2E4F54] dark:text-[#E0F4F5]">Client</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg text-[#2E4F54] dark:text-[#E0F4F5] hover:bg-gray-50 dark:hover:bg-[#24393C] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Book Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}