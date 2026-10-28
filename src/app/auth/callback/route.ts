import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only redirect back into the host portal on this site
  const nextParam = searchParams.get('next') ?? ''
  const next = nextParam.startsWith('/host') ? nextParam : '/host/events'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to the login page with an error
  return NextResponse.redirect(`${origin}/host/login?error=auth_callback_error`)
}

