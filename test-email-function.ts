
async function testEmailFunction() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    return;
  }

  console.log('Testing send-group-invite function...');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-group-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        email: 'prabhasmudhiveti@gmail.com',
        groupName: 'Test Group',
        inviterName: 'Fairshare Bot',
        joinUrl: 'http://localhost:5173/join/test-token'
      })
    });

    const result = await response.json();
    if (response.ok) {
      console.log('Success:', result);
    } else {
      console.error('Error from function:', result);
      console.log('NOTE: This error is expected if the function is not deployed or secrets are not set.');
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testEmailFunction();
