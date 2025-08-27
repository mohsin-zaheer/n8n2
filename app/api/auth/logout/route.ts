import { createServerClientInstance } from '@/lib/supabase';
import { getEnv } from '@/lib/config/env';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const env = getEnv();
  const baseUrl = env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  
  const supabase = await createServerClientInstance();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
  }
  
  // Always redirect to home after logout attempt
  return NextResponse.redirect(`${baseUrl}/`, {
    status: 302,
  });
}

export async function GET(request: Request) {
  // Support GET for easier testing, but POST is preferred
  return POST(request);
}
