import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    return NextResponse.json({
      success: true,
      session: session ? 'exists' : 'null',
      env: {
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasStravaClientId: !!process.env.STRAVA_CLIENT_ID,
        hasStravaSecret: !!process.env.STRAVA_CLIENT_SECRET,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

