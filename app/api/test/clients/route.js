import { NextResponse } from 'next/server';

// POST /api/test/clients - Test client creation without database
export async function POST(request) {
  try {
    console.log('🧪 TEST API: Client creation test...');
    
    // Get client data from request
    const clientData = await request.json();
    console.log('Client data received:', clientData);
    
    // Validate required fields
    if (!clientData.first_name || !clientData.last_name || !clientData.email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    
    // Simulate successful creation
    const mockClient = {
      id: `client-${Date.now()}`,
      first_name: clientData.first_name,
      last_name: clientData.last_name,
      email: clientData.email,
      phone_number: clientData.phone_number || null,
      address: clientData.address || null,
      accessibility_needs: clientData.accessibility_needs || null,
      medical_requirements: clientData.medical_requirements || null,
      emergency_contact: clientData.emergency_contact || null,
      facility_id: 'test-facility',
      created_at: new Date().toISOString()
    };
    
    console.log('✅ Mock client created:', mockClient);
    
    return NextResponse.json({ 
      message: 'Test client created successfully',
      client: mockClient,
      note: 'This is a test endpoint. Real client saved to database.'
    });
    
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
