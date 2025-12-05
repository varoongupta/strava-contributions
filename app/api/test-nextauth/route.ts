import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try to import NextAuth config
    const authModule = await import('@/auth');
    
    // Try to get handlers
    const { handlers } = authModule;
    
    // Try to create a mock request to test
    const mockRequest = new Request('http://localhost:3000/api/auth/providers');
    
    try {
      const response = await handlers.GET(mockRequest);
      const text = await response.text();
      
      return NextResponse.json({
        success: true,
        status: response.status,
        responseText: text,
        hasHandlers: !!handlers,
      });
    } catch (handlerError: any) {
      return NextResponse.json({
        success: false,
        handlerError: handlerError.message,
        stack: handlerError.stack,
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      importError: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

