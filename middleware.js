import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export const config = {
  matcher: [
    // Auth routes
    '/login',
    '/signup',
    '/reset-password',
    '/update-password',
    
    // Protected routes
    '/dashboard',
    '/dashboard/:path*',
  ],
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  console.log(`Middleware handling path: ${pathname}`);
  
  // Skip middleware for API routes, static files, and _next
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticFile = pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.includes('.');
  const isPublicRoute = ['/', '/login', '/signup', '/reset-password', '/update-password', '/auth/callback'].includes(pathname);
  
  if (isApiRoute || isStaticFile) {
    console.log(`MIDDLEWARE: Skipping ${isApiRoute ? 'API route' : 'static file'}: ${pathname}`);
    return NextResponse.next();
  }
  
  // Create a response object that we can modify
  const res = NextResponse.next();
  
  // Create a Supabase client specifically for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  // This will refresh the session if it exists and is expired
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  console.log('Session check in middleware:', session ? 'Session exists' : 'No session');
  
  // Define which routes should be protected
  const protectedRoutes = [
    '/dashboard', 
    '/dashboard/book', 
    '/dashboard/trips', 
    '/dashboard/settings', 
    '/dashboard/payment-methods',
    '/dashboard/clients',
    '/dashboard/billing',
    '/dashboard/facility-settings'
  ];
  
  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  if (isProtectedRoute) {
    // If there's no session, redirect to login
    if (!session) {
      console.log('Redirecting to login from protected route - No session');
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('returnTo', pathname);
      redirectUrl.searchParams.set('fresh', 'true'); // Add flag to prevent redirect loops
      return NextResponse.redirect(redirectUrl);
    }
    
    // Email verification is disabled in Supabase settings
    
    // Check if user has 'facility' role in their metadata
    const userRole = session.user.user_metadata?.role;
    
    if (userRole !== 'facility') {
      // If user doesn't have the right role, fetch from profiles table
      // This is necessary for users created before role implementation
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        // If profile exists and doesn't have 'facility' role, log the user out
        if (!profile || profile.role !== 'facility') {
          console.log('Redirecting to login from protected route - Invalid role');
          await supabase.auth.signOut();
          // Add a small delay to ensure session is cleared
          await new Promise(resolve => setTimeout(resolve, 100));
          const redirectUrl = new URL('/login', req.url);
          redirectUrl.searchParams.set('error', 'access_denied');
          redirectUrl.searchParams.set('fresh', 'true'); // Add flag to prevent redirect loops
          return NextResponse.redirect(redirectUrl);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // On error, also redirect to login
        const redirectUrl = new URL('/login', req.url);
        redirectUrl.searchParams.set('error', 'server_error');
        redirectUrl.searchParams.set('fresh', 'true'); // Add flag to prevent redirect loops
        return NextResponse.redirect(redirectUrl);
      }
    }
  }
  
  // Define auth routes that should redirect to dashboard if user is already logged in
  const authRoutes = ['/login', '/signup', '/reset-password'];
  
  if (authRoutes.includes(pathname) && session) {
    // Check for the 'fresh' flag or logout flag to prevent redirect loops
    const freshLogin = req.nextUrl.searchParams.get('fresh') === 'true';
    const isLogout = req.nextUrl.searchParams.get('logout') === 'true';
    
    if (!freshLogin && !isLogout) {
      console.log('Redirecting to dashboard from auth route');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  // For all other cases, return the response with any session cookie updates
  return res;
}
