import { createClient } from '@supabase/supabase-js';
import { fetchWithoutEmDashes } from './no-em-dash';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'x-my-custom-header': 'peoples-chamber',
    },
    // Site rule: no em dashes on the page. Reads only; see lib/no-em-dash.ts.
    fetch: fetchWithoutEmDashes,
  },
});
