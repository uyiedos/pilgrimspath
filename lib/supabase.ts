import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dmqtjvnzzthsvmlbeqbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcXRqdm56enRoc3ZtbGJlcWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTMwNTgsImV4cCI6MjA4MTI2OTA1OH0.cJh5u_wWeT0DmUoD4jIEYg71_tY_8ebsWbjlN_jMx3o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
