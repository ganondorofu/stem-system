import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Admin client using the service role key
export async function createAdminClient() {
    const cookieStore = cookies()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in .env');
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            db: {
                schema: 'member',
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            cookies: {
                getAll() {
                  return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                  try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                      cookieStore.set(name, value, options)
                    )
                  } catch {
                    // The `set` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                  }
                },
            },
        }
    )
}


export async function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
       db: {
        schema: 'member',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
