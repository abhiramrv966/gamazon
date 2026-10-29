import { createClient } from '@supabase/supabase-js';
import { DomainError } from './domain';
export function serviceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new DomainError('The server upload and maintenance service is not configured.', 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
