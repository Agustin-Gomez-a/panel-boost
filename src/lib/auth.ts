import { SignJWT, jwtVerify } from 'jose';
import type { AstroCookies } from 'astro';

const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.JWT_SECRET || 'fallback_secret_change_in_production'
);

const COOKIE_NAME = 'ppb_session';
const JWT_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export async function createToken(payload: JWTPayload, remember = false): Promise<string> {
  const expiry = remember ? '30d' : '24h';
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(cookies: AstroCookies, token: string, remember = false) {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days or 24h
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export async function getSessionFromCookies(cookies: AstroCookies): Promise<JWTPayload | null> {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(cookies: AstroCookies): Promise<JWTPayload> {
  const session = await getSessionFromCookies(cookies);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
