import { supabaseAdmin } from '@/lib/supabase-admin';

export async function touchLastSeen(userId: number): Promise<void> {
  try {
    const threshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId)
      .or(`last_seen_at.is.null,last_seen_at.lt.${threshold}`);
  } catch {
    // never let tracking break a protected route
  }
}
