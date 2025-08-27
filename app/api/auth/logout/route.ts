import { createServerClientInstance } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  
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
