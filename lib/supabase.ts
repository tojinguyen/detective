import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpxoubblvsiectbmtdpq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweG91YmJsdnNpZWN0Ym10ZHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4OTIzMDEsImV4cCI6MjEwNTQ2ODMwMX0.VrN3iI1x7rxtt76JVEv8wPwt4k6nDhJgLltFZKmUHVU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
