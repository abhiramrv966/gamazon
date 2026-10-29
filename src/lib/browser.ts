import { createBrowserClient } from '@supabase/ssr';
let client: ReturnType<typeof createBrowserClient> | undefined;
export function browserDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return (client ??= createBrowserClient(url, key));
}
