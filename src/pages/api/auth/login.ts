import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import sql from '../../../lib/db';
import { createToken, setSessionCookie } from '../../../lib/auth';
import { checkRateLimit, sanitizeInput, validateEmail, getClientIP } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const email = sanitizeInput(formData.get('email')?.toString() || '');
    const password = formData.get('password')?.toString() || '';
    const remember = formData.get('remember') === 'on';
    const redirectTo = sanitizeInput(formData.get('redirect')?.toString() || '/dashboard');

    // Validate redirect URL
    const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/dashboard';

    // Rate limiting
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(ip + ':' + email, 'login');

    if (!rateCheck.allowed) {
      return Response.json(
        { error: `Demasiados intentos. Intentá en ${Math.ceil(rateCheck.resetIn / 60)} minutos.` },
        { status: 429 }
      );
    }

    // Validate inputs
    if (!email || !validateEmail(email)) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (!password || password.length < 1) {
      return Response.json({ error: 'Contraseña requerida' }, { status: 400 });
    }

    // Find user
    const users = await sql`
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;

    if (users.length === 0) {
      // Timing attack prevention
      await bcrypt.hash(password, 1);
      return Response.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return Response.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, remember);

    // Set cookie
    setSessionCookie(cookies, token, remember);

    return Response.json({
      success: true,
      redirect: safeRedirect,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Error del servidor. Intentá de nuevo.' }, { status: 500 });
  }
};
