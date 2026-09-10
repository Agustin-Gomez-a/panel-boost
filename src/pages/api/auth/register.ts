import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import sql from '../../../lib/db';
import { createToken, setSessionCookie } from '../../../lib/auth';
import {
  checkRateLimit,
  sanitizeInput,
  validateEmail,
  validatePassword,
  getClientIP,
} from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const name = sanitizeInput(formData.get('name')?.toString() || '');
    const email = sanitizeInput(formData.get('email')?.toString() || '');
    const password = formData.get('password')?.toString() || '';
    const confirmPassword = formData.get('confirmPassword')?.toString() || '';
    const terms = formData.get('terms') === 'on';

    // Rate limiting
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(ip, 'register');

    if (!rateCheck.allowed) {
      return Response.json(
        { error: 'Demasiados registros desde esta IP. Intentá más tarde.' },
        { status: 429 }
      );
    }

    // Validate inputs
    if (!name || name.length < 2 || name.length > 100) {
      return Response.json({ error: 'El nombre debe tener entre 2 y 100 caracteres' }, { status: 400 });
    }

    if (!email || !validateEmail(email)) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return Response.json({ error: passwordValidation.message }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return Response.json({ error: 'Las contraseñas no coinciden' }, { status: 400 });
    }

    if (!terms) {
      return Response.json({ error: 'Debés aceptar los términos de uso' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
    `;

    if (existing.length > 0) {
      return Response.json(
        { error: 'Este email ya está registrado. ¿Querés iniciar sesión?' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUsers = await sql`
      INSERT INTO users (name, email, password_hash, raw_password)
      VALUES (${name}, ${email.toLowerCase()}, ${passwordHash}, ${password})
      RETURNING id, name, email, role
    `;

    const user = newUsers[0];

    // Create JWT
    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    setSessionCookie(cookies, token);

    return Response.json({
      success: true,
      redirect: '/dashboard',
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Register error:', error);
    return Response.json({ error: 'Error del servidor. Intentá de nuevo.' }, { status: 500 });
  }
};
