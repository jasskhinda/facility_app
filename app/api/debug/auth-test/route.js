import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function GET() {
  try {
    // First check what cookies we're receiving
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth')
    )
    
    // Get the specific auth token cookie
    const authTokenCookie = cookieStore.get('sb-btzfgasugkycbavcwvnx-auth-token')
    let authTokenPreview = 'Not found'
    if (authTokenCookie) {
      authTokenPreview = authTokenCookie.value.substring(0, 50) + '...'
    }
    
    const supabase = await createRouteHandlerClient()
    
    // Test authentication without requiring it
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    return Response.json({ 
      message: 'Auth test API is accessible',
      debug: {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userEmail: session?.user?.email,
        hasUserData: !!userData?.user,
        userDataError: userError?.message,
        userDataEmail: userData?.user?.email,
        cookieCount: allCookies.length,
        supabaseCookieCount: supabaseCookies.length,
        cookieNames: allCookies.map(c => c.name),
        supabaseCookieNames: supabaseCookies.map(c => c.name),
        authTokenCookie: {
          exists: !!authTokenCookie,
          preview: authTokenPreview,
          length: authTokenCookie?.value?.length || 0
        }
      }
    })
  } catch (error) {
    return Response.json({ 
      message: 'API accessible but auth test failed',
      error: error.message,
      stack: error.stack
    })
  }
}