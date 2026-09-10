import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import sql from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const token = formData.get('token')?.toString() || '';
    const password = formData.get('password')?.toString() || '';
    const confirmPassword = formData.get('confirmPassword')?.toString() || '';

    if (!token) {
      return Response.json({ error: 'Token inválido' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    if (!/[A-Z]/.test(password)) {
      return Response.json({ error: 'La contraseña debe tener al menos una mayúscula' }, { status: 400 });
    }

    if (!/[0-9]/.test(password)) {
      return Response.json({ error: 'La contraseña debe tener al menos un número' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return Response.json({ error: 'Las contraseñas no coinciden' }, { status: 400 });
    }

    // Find valid token
    const resets = await sql`
      SELECT pr.id, pr.user_id, pr.expires_at, u.email
      FROM password_resets pr
      JOIN users u ON u.id = pr.user_id
      WHERE pr.token = ${token}
        AND pr.used = FALSE
        AND pr.expires_at > NOW()
      LIMIT 1
    `;

    if (resets.length === 0) {
      return Response.json({ error: 'El enlace de recuperación es inválido o ya expiró. Solicitá uno nuevo.' }, { status: 400 });
    }

    const reset = resets[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password
    await sql`
      UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${reset.user_id}
    `;

    // Invalidate token
    await sql`
      UPDATE password_resets SET used = TRUE WHERE id = ${reset.id}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return Response.json({ error: 'Error del servidor. Intentá de nuevo.' }, { status: 500 });
  }
};
