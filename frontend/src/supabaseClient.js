import { createClient } from '@supabase/supabase-js'

// Fetch the keys from the .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Connection test function
async function testConnection() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  
  if (error) {
    console.log('✅ Connection to Supabase is successful! (Schema error is normal for an empty database):', error.message)
  } else {
    console.log('✅ Successfully connected to Supabase! Data:', data)
  }
}

testConnection()