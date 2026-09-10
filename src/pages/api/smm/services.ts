import type { APIRoute } from 'astro';
import { getSessionFromCookies } from '../../../lib/auth';
import { getServices } from '../../../lib/smm';

export const GET: APIRoute = async ({ cookies }) => {
  const session = await getSessionFromCookies(cookies);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const services = await getServices();
    return Response.json({ services });
  } catch (error) {
    console.error('Services API error:', error);
    return Response.json({ error: 'Error al obtener servicios' }, { status: 500 });
  }
};
