import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zsjrqgmhvomfwggtsbxl.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzanJxZ21odm9tZndnZ3RzYnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTQ1NDMsImV4cCI6MjA0OTkzMDU0M30.ZiA-wPk70xeGjosnz8GfeSikC0dSOJ3my-qKAJ9Tbd0'; 

export const supabase = createClient(supabaseUrl, supabaseKey);
