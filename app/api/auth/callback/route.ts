import { createServerClientInstance } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const redirectTo = searchParams.get('redirectTo') || '/';

    // Handle OAuth errors from provider
    if (error) {
      console.error('OAuth provider error:', error);
      return NextResponse.redirect(`${origin}/?auth=error&message=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error('No authorization code provided');
      return NextResponse.redirect(`${origin}/?auth=error&message=no_code`);
    }

    const supabase = await createServerClientInstance();
    
    const { data: authData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Auth callback error:', exchangeError);
      // Clear any stale cookies on error
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-') || cookie.name === 'just_authenticated') {
          cookieStore.delete(cookie.name);
        }
      });
      return NextResponse.redirect(`${origin}/?auth=error&message=${encodeURIComponent(exchangeError.message)}`);
    }
    
    if (!authData?.user) {
      console.error('No user data after successful exchange');
      return NextResponse.redirect(`${origin}/?auth=error&message=no_user_data`);
    }

    // Check if this is a user returning from login with a pending workflow
    // The redirectTo will be like /workflow/wf_123456_abc
    if (redirectTo.startsWith('/workflow/')) {
      // Store a flag in cookies to indicate user just authenticated
      const cookieStore = await cookies();
      cookieStore.set('just_authenticated', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60, // 1 minute expiry
        path: '/'
      });
    }
    
    // Redirect to the intended destination (will be /workflow/[sessionId])
    return NextResponse.redirect(`${origin}${redirectTo}`);
    
  } catch (err) {
    console.error('Callback route error:', err);
    const { origin } = new URL(request.url);
    
    // Clear any potentially corrupted cookies
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-') || cookie.name === 'just_authenticated') {
          cookieStore.delete(cookie.name);
        }
      });
    } catch (cookieError) {
      console.error('Error clearing cookies:', cookieError);
    }
    
    return NextResponse.redirect(`${origin}/?auth=error&message=server_error`);
  }
}
