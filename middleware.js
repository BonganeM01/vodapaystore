//middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  const requestHeaders = new Headers(req.headers);

  const lower = new Headers();
  for (const [key, value] of requestHeaders.entries()) {
    lower.set(key.toLowerCase(), value);
  }

  // Rewrite request with lowercase headers
  const url = req.nextUrl.clone();
  return NextResponse.next({
    request: {
      headers: lower
    }
  });
}

// Only run for notify endpoint
export const config = {
  matcher: '/api/notify',
};