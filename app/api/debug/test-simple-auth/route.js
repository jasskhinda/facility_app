import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function POST(request) {
  try {
    console.log('=== SIMPLE AUTH TEST START ===')
    
    const body = await request.json()
    console.log('Request body received:', body)
    
    const supabase = await createRouteHandlerClient()
    console.log('Supabase client created successfully')

    // Try both session and getUser methods
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session result:', { 
      hasSession: !!session, 
      sessionError: sessionError?.message, 
      userEmail: session?.user?.email,
      userId: session?.user?.id 
    })
    
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('GetUser result:', { 
      hasUserData: !!userData?.user, 
      userError: userError?.message, 
      userEmail: userData?.user?.email,
      userId: userData?.user?.id 
    })

    // Use session if available, otherwise fall back to userData
    const user = session?.user || userData?.user
    
    if (!user) {
      console.log('=== NO USER FOUND ===')
      return Response.json(
        { 
          error: 'Authentication required',
          debug: {
            sessionError: sessionError?.message,
            userError: userError?.message,
            hasSession: !!session,
            hasUserData: !!userData?.user
          }
        },
        { status: 401 }
      )
    }

    console.log('=== USER FOUND ===')
    console.log('User ID:', user.id)
    console.log('User email:', user.email)

    return Response.json({
      success: true,
      message: 'Authentication working!',
      user: {
        id: user.id,
        email: user.email
      }
    })

  } catch (error) {
    console.error('=== AUTH TEST ERROR ===', error)
    return Response.json(
      { 
        error: error.message || 'Auth test failed',
        stack: error.stack
      },
      { status: 500 }
    )
  }
}