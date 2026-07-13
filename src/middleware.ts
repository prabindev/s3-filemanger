import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    
    const isAuthRoute = path === '/login' || path === '/signup';

    // If logged in and trying to access login/signup -> go to dashboard
    if (token && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If NOT logged in and trying to access protected routes -> go to login
    if (!token && !isAuthRoute && path !== '/') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  },
  {
    callbacks: {
      authorized: () => true 
    }
  }
);

export const config = {
  matcher: ['/login', '/signup', '/dashboard/:path*', '/bucket/:path*']
};
