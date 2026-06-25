import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://cwohhfrupyeznbexjyaq.supabase.co'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3b2hoZnJ1cHllem5iZXhqeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTU4NDEsImV4cCI6MjA5Nzg3MTg0MX0.CQXzXJNg649QNKIAj3TL-fbA80pI3FTbK9O7elMrFj0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
