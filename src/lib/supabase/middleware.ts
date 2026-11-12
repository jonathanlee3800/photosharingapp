import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT add code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very
  // hard to debug issues with users being randomly logged out.

  // Refresh the auth token if it exists (keeps the session alive)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  // Legacy "/?code=XYZ" links: event ids, join codes and slugs all resolve under /user/<x>
  if (pathname === '/') {
    const code = request.nextUrl.searchParams.get('code')
    if (code) {
      const target = request.nextUrl.clone()
      target.search = ''
      target.pathname = `/user/${encodeURIComponent(code)}`
      const redirect = NextResponse.redirect(target)
      supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
      return redirect
    }
    // Allow public landing page at '/' to render
    return supabaseResponse
  }

  // Old guest pages without an event in the address (e.g. /user/join, /user/gallery, /gallery) would
  // just show whatever event this browser opened last. Send them to the PIN screen instead.
  const eventlessGuestPage =
    /^\/user(\/(join|gallery|upload|vote|slideshow|projector))?\/?$/.test(pathname) ||
    /^\/(gallery|upload|slideshow|vote|projector|display|live)\/?$/.test(pathname)
  if (eventlessGuestPage) {
    const pinUrl = request.nextUrl.clone()
    pinUrl.pathname = '/join'
    pinUrl.search = ''
    const redirect = NextResponse.redirect(pinUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  // Guests never need to log in, so only the host portal is protected.
  // The sign in / sign up pages themselves stay public.
  const isHostArea = pathname === '/host' || pathname.startsWith('/host/')
  const isPublicHostPage = pathname === '/host/login' || pathname === '/host/signup'

  if (isHostArea && !isPublicHostPage && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/host/login'
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`
    const redirect = NextResponse.redirect(loginUrl)
    // Carry over any refreshed auth cookies
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  return supabaseResponse
}

