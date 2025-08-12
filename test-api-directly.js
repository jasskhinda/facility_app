// Test the API directly to see what's happening
async function testAPI() {
  try {
    console.log('🧪 Testing API directly...\n');
    
    const response = await fetch('http://localhost:3003/api/facility/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facilityId: 'c782252e-1a2b-4740-9bd7-e4fdf8d565a1',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'scheduler'
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('Response body:', result);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const jsonResult = JSON.parse(result);
        console.log('Parsed JSON:', jsonResult);
      } catch (e) {
        console.log('Failed to parse as JSON');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPI();