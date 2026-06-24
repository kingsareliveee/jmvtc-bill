import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing parties...');
  const { data: pData, error: pErr } = await supabase.from('parties').select('*');
  if (pErr) console.error('Parties error:', pErr);
  else console.log('Parties success:', pData?.length);

  console.log('Testing settings...');
  const { data: sData, error: sErr } = await supabase.from('settings').select('*');
  if (sErr) console.error('Settings error:', sErr);
  else console.log('Settings success:', sData?.length);
  
  console.log('Testing bills...');
  const { data: bData, error: bErr } = await supabase.from('bills').select('*');
  if (bErr) console.error('Bills error:', bErr);
  else console.log('Bills success:', bData?.length);
  
  console.log('Testing truck_entries...');
  const { data: tData, error: tErr } = await supabase.from('truck_entries').select('*');
  if (tErr) console.error('Truck entries error:', tErr);
  else console.log('Truck entries success:', tData?.length);
}

test();
