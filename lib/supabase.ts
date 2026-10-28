// Server only (28 Oct 2026, report 84): this read client holds SUPABASE_SECRET_KEY, so a browser import must fail
// the build. 'server-only' is provided by Next.js itself.
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { fetchWithoutEmDashes } from './no-em-dash';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_SECRET_KEY!;

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
