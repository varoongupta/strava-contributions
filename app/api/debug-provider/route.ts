import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try to import and initialize the provider
    const Strava = (await import('@/lib/strava-provider')).default;
    
    const provider = Strava({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
    });
    
    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        hasToken: !!provider.token,
        hasUserinfo: !!provider.userinfo,
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

