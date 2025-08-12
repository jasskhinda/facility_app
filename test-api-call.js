import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testAPICall() {
  try {
    console.log('🧪 Testing API call...');
    
    const testData = {
      facilityId: '39fad399-1707-495c-bbb9-7bf153117309', // Encompass facility
      email: 'api-test-' + Date.now() + '@example.com',
      password: 'TestPassword123!',
      firstName: 'API',
      lastName: 'Test',
      role: 'scheduler'
    };

    console.log('📝 Test data:', testData);

    const response = await fetch('http://localhost:3000/api/facility/simple-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', result);

    if (response.ok) {
      console.log('✅ API call successful!');
    } else {
      console.log('❌ API call failed');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testAPICall();