import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// DO NOT CHANGE THE SCHEMA NAME. IT IS 'member' AND SHOULD NOT BE MODIFIED.
// このスキーマ名は絶対に変更しないでください。'member' が正しい値です。
async function createSupabaseClient(isAdmin: boolean = false) {
  const cookieStore = cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = isAdmin 
    ? process.env.SUPABASE_SERVICE_ROLE_KEY! 
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (isAdmin && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in .env');
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    db: {
        schema: 'member', // DO NOT CHANGE THIS VALUE.
    },
    auth: {
      autoRefreshToken: !isAdmin,
      persistSession: !isAdmin,
      // Only the middleware should auto-refresh the session.
      // Other server-side clients should not.
      detectSessionInUrl: false,
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // The `remove` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export async function createClient() {
  return await createSupabaseClient(false);
}

export async function createAdminClient() {
  return await createSupabaseClient(true);
}
