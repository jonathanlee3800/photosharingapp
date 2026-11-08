import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Relative redirect: the browser stays on the address it is already using (e.g. www.memorieaisle.com).
// Building an absolute URL from request.url breaks behind a proxy/tunnel, where the server sees
// its own address as http://localhost:3000 and would send phones there.
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  // Only redirect back into the host portal on this site
  const nextParam = searchParams.get('next') ?? ''
  const next = nextParam.startsWith('/host') ? nextParam : '/host/events'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return redirectTo(next)
    }
  }

  // Return the user to the login page with an error
  return redirectTo('/host/login?error=auth_callback_error')
}
