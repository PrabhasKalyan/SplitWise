import { createClient } from '@supabase/supabase-js';

const url = 'https://bpruoyahvfgpwycueou.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcnVveWFoYXZmZ3B3eWN1ZW91Iiwicm9sZSI6ImFub24iLCJpYXRiOjE3ODA2ODExNDEsImV4cCI6MjA5NjI1NzE0MX0.0EP0Af0GK0-xMOritf0_l8EneQfuOx9L4IfjdI5rtMo';

async function testFinalConfig() {
  console.log('Testing with final URL:', url);
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success (profiles):', data);
  }
}

testFinalConfig();
