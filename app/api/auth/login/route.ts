import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectTo = searchParams.get('redirectTo') || '/';

  const supabase = await createServerClientInstance();

  // Supabase will handle /auth/v1/callback internally
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Send user back to the correct page after login
      redirectTo: `${getURL()}${redirectTo}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  if (data.url) {
    return NextResponse.redirect(data.url);
  }

  // Fallback redirect
  return NextResponse.redirect(`${origin}/?auth=error`);
}
