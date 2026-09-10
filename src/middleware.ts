import { defineMiddleware } from 'astro:middleware';
import { getSessionFromCookies } from './lib/auth';
import { getSecurityHeaders } from './lib/security';

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, redirect } = context;

  // Add security headers to all responses
  const response = await next();
  const headers = getSecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Protected dashboard routes
  const protectedPaths = ['/dashboard'];
  const isProtected = protectedPaths.some((path) => url.pathname.startsWith(path));

  if (isProtected) {
    const session = await getSessionFromCookies(cookies);
    if (!session) {
      return redirect('/login?redirect=' + encodeURIComponent(url.pathname));
    }
    // Attach user to locals
    context.locals.user = session;

    // Protect superadmin routes
    if (url.pathname.startsWith('/dashboard/admin')) {
      if (session.role !== 'admin') {
        return redirect('/dashboard');
      }
    }
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/register'];
  const isAuthPage = authPaths.includes(url.pathname);

  if (isAuthPage) {
    const session = await getSessionFromCookies(cookies);
    if (session) {
      return redirect('/dashboard');
    }
  }

  return response;
});
