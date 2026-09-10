import type { APIRoute } from 'astro';
import crypto from 'crypto';
import sql from '../../../lib/db';
import { sanitizeInput, validateEmail, checkRateLimit, getClientIP } from '../../../lib/security';

// HTML email template
function buildResetEmail(userName: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar contraseña — Pulse Panel Boost</title>
</head>
<body style="margin:0;padding:0;background:#0d0e14;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0e14;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#06b6d4);border-radius:12px;padding:14px 20px;display:inline-block;">
                    <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-0.5px;">⚡ PulseBoost</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:rgba(22,24,34,0.95);border:1px solid #2a2d4a;border-radius:20px;padding:40px 36px;">

              <!-- Icon -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:64px;height:64px;background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(6,182,212,0.2));border:1px solid #7c3aed;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;text-align:center;line-height:64px;">🔐</div>
                  </td>
                </tr>
              </table>

              <h1 style="color:#f0f0fa;font-size:24px;font-weight:800;margin:0 0 8px;text-align:center;letter-spacing:-0.5px;">Recuperá tu contraseña</h1>
              <p style="color:#9898b8;font-size:15px;text-align:center;margin:0 0 28px;line-height:1.6;">Hola <strong style="color:#f0f0fa;">${userName}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>

              <!-- Divider -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,#2a2d4a,transparent);margin-bottom:28px;"></div>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.01em;box-shadow:0 8px 30px rgba(124,58,237,0.4);">
                      Restablecer mi contraseña →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- URL fallback -->
              <p style="color:#6060a0;font-size:12px;text-align:center;margin:0 0 28px;line-height:1.6;">
                Si el botón no funciona, copiá este enlace en tu navegador:<br>
                <a href="${resetUrl}" style="color:#9d5cf5;word-break:break-all;">${resetUrl}</a>
              </p>

              <!-- Divider -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,#2a2d4a,transparent);margin-bottom:24px;"></div>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:14px 16px;">
                    <p style="color:#f59e0b;font-size:13px;margin:0;line-height:1.5;">
                      ⏱️ <strong>Este enlace expira en 1 hora.</strong><br>
                      Si no solicitaste este cambio, ignorá este email. Tu contraseña no será modificada.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#6060a0;font-size:12px;margin:0;line-height:1.6;">
                © 2026 Pulse Panel Boost · Panel SMM Profesional<br>
                <a href="#" style="color:#6060a0;">Política de Privacidad</a> · <a href="#" style="color:#6060a0;">Términos de Uso</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = sanitizeInput(formData.get('email')?.toString() || '');

    if (!email || !validateEmail(email)) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Rate limiting
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(ip + ':forgot:' + email, 'forgot_password');
    if (!rateCheck.allowed) {
      return Response.json(
        { error: `Demasiados intentos. Intentá en ${Math.ceil(rateCheck.resetIn / 60)} minutos.` },
        { status: 429 }
      );
    }

    // Check user exists
    const users = await sql`
      SELECT id, name, email FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
    `;

    // Always return success to avoid email enumeration
    if (users.length === 0) {
      return Response.json({ success: true });
    }

    const user = users[0];

    // Invalidate previous tokens
    await sql`
      UPDATE password_resets SET used = TRUE WHERE user_id = ${user.id} AND used = FALSE
    `;

    // Create reset token
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await sql`
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt})
    `;

    const baseUrl = import.meta.env.SITE_URL || 'http://localhost:4321';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send email
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Pulse Panel Boost <onboarding@resend.dev>',
          reply_to: 'panelboostsmm@gmail.com',
          to: user.email,
          subject: 'Recuperá tu contraseña — Pulse Panel Boost',
          html: buildResetEmail(user.name, resetUrl),
        }),
      });
      const resendData = await resendRes.json();
      console.log('Resend Response:', resendData);
    } else {
      // Dev mode: log the URL
      console.log(`[DEV] Password reset URL for ${user.email}: ${resetUrl}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return Response.json({ error: 'Error del servidor. Intentá de nuevo.' }, { status: 500 });
  }
};
