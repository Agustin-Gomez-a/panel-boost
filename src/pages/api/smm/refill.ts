import type { APIRoute } from 'astro';
import { getSessionFromCookies } from '../../../lib/auth';
import { createRefill } from '../../../lib/smm';
import sql from '../../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSessionFromCookies(cookies);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const orderId = parseInt(formData.get('order_id')?.toString() || '0');

    if (!orderId) {
      return Response.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const [order] = await sql`SELECT provider, provider_order_id FROM orders WHERE id = ${orderId} OR smm_order_id = ${orderId} LIMIT 1`;
    if (!order) {
      return Response.json({ error: 'Pedido no encontrado en la base de datos' }, { status: 404 });
    }

    const providerOrderId = parseInt(order.provider_order_id || order.smm_order_id);

    const result = await createRefill(providerOrderId);
    return Response.json({ success: true, refill_id: result.refill });
  } catch (error) {
    console.error('Refill error:', error);
    return Response.json({ error: 'Error al crear refill' }, { status: 500 });
  }
};
