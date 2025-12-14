import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

export async function POST(request: NextRequest) {
  if (!AUTH_PASSWORD) {
    console.error('AUTH_PASSWORD is not defined in environment variables');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (password === AUTH_PASSWORD) {
      // Create response
      const response = NextResponse.json({ success: true });
      
      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set('auth_token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
