import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/';

    const supabase = await createServerClientInstance();

    // Supabase will handle /auth/v1/callback internally
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Send user back to the correct page after login
        redirectTo: `${getURL()}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${origin}/?auth=error&message=${encodeURIComponent(error.message)}`);
    }

    if (data.url) {
      return NextResponse.redirect(data.url);
    }

    // Fallback redirect
    return NextResponse.redirect(`${origin}/?auth=error&message=no_url_returned`);
  } catch (err) {
    console.error('Login route error:', err);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/?auth=error&message=server_error`);
  }
}
