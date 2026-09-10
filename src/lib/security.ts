import sql from './db';

// Rate limiting: max attempts per window
const RATE_LIMIT_CONFIG: Record<string, { maxAttempts: number; windowMinutes: number }> = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  register: { maxAttempts: 3, windowMinutes: 60 },
  api: { maxAttempts: 100, windowMinutes: 1 },
};

export async function checkRateLimit(
  identifier: string,
  action: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const config = RATE_LIMIT_CONFIG[action] || { maxAttempts: 10, windowMinutes: 1 };
  const windowMs = config.windowMinutes * 60 * 1000;

  try {
    // Clean up expired entries
    await sql`
      DELETE FROM rate_limits 
      WHERE window_start < NOW() - INTERVAL '${sql.unsafe(config.windowMinutes.toString())} minutes'
      AND action = ${action}
    `;

    // Get or create rate limit entry
    const result = await sql`
      INSERT INTO rate_limits (identifier, action, attempts, window_start)
      VALUES (${identifier}, ${action}, 1, NOW())
      ON CONFLICT (identifier, action) 
      DO UPDATE SET attempts = rate_limits.attempts + 1
      RETURNING attempts, window_start
    `;

    const { attempts, window_start } = result[0];
    const windowStart = new Date(window_start).getTime();
    const resetIn = Math.max(0, windowMs - (Date.now() - windowStart));
    const remaining = Math.max(0, config.maxAttempts - attempts);

    return {
      allowed: attempts <= config.maxAttempts,
      remaining,
      resetIn: Math.ceil(resetIn / 1000),
    };
  } catch {
    // If rate limiting fails, allow the request
    return { allowed: true, remaining: 10, resetIn: 0 };
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 1000); // Limit length
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe tener al menos una mayúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe tener al menos un número' };
  }
  return { valid: true, message: '' };
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://kit.fontawesome.com https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' https://fonts.gstatic.com https://ka-f.fontawesome.com",
      "img-src 'self' data: https://images.unsplash.com https://source.unsplash.com blob:",
      "connect-src 'self' https://smmsat.com",
    ].join('; '),
  };
}

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}
