import type { APIRoute } from 'astro';
import { initDB } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    await initDB();
    return Response.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
};
