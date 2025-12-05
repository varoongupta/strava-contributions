import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try to import handlers to see if there's an error
    const { handlers } = await import('@/auth');
    
    // Try to call the providers endpoint internally
    const req = new NextRequest('http://localhost:3000/api/auth/providers');
    const res = await handlers.GET(req);
    const data = await res.json();
    
    return NextResponse.json({
      success: true,
      providersResponse: data,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      name: error.name,
    }, { status: 500 });
  }
}

