import type { APIRoute } from 'astro';
import { getSessionFromCookies } from '../../../lib/auth';
import sql from '../../../lib/db';

export const GET: APIRoute = async ({ cookies }) => {
  const session = await getSessionFromCookies(cookies);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [user] = await sql`SELECT balance FROM users WHERE id = ${session.userId}`;
    return Response.json({ 
      balance: { 
        balance: user ? parseFloat(user.balance).toFixed(2) : '0.00',
        currency: 'USD'
      } 
    });
  } catch (error) {
    console.error('Balance API error:', error);
    return Response.json({ error: 'Error al obtener el balance' }, { status: 500 });
  }
};
