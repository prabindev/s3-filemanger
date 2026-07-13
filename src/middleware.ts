import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    
    // If the user is logged in and trying to access login/signup, redirect to dashboard
    if (token && (path === '/login' || path === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  },
  {
    callbacks: {
      // Let the middleware function handle all routing logic
      authorized: () => true 
    }
  }
);

// Only run the middleware on these specific routes
export const config = {
  matcher: ['/login', '/signup']
};
