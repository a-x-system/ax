// --- 1. SUPABASE CONFIG ---
const SUPABASE_URL = 'https://uuhsjusmhmmjceujzoiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aHNqdXNtaG1tamNldWp6b2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDU0MTUsImV4cCI6MjA4MTE4MTQxNX0.zaOtLcZGoNV77AiLrbODv3gIamlHWh8QwbBdWeOfJLw';
let supabase = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase init failed:', e);
}
