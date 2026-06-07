import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const url = 'https://bpruoyahavfgpwycueou.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log('Using anonKey:', anonKey);

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function testConnection() {
  console.log('Testing connection to:', url);
  
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(5);
  if (pError) {
    console.error('Error fetching profiles:', pError);
  } else {
    console.log('Profiles:', profiles);
  }

  const { data: groups, error: gError } = await supabase.from('groups').select('*').limit(5);
  if (gError) {
    console.error('Error fetching groups:', gError);
  } else {
    console.log('Groups:', groups);
  }

  const { data: expenses, error: eError } = await supabase.from('expenses').select('*').limit(5);
  if (eError) {
    console.error('Error fetching expenses:', eError);
  } else {
    console.log('Expenses:', expenses);
  }
}

testConnection();
