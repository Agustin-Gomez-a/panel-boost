import type { APIRoute } from 'astro';
import { getSessionFromCookies } from '../../../lib/auth';
import { addOrder } from '../../../lib/smm';
import sql from '../../../lib/db';
import { sanitizeInput } from '../../../lib/security';

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSessionFromCookies(cookies);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const serviceId = parseInt(formData.get('service_id')?.toString() || '0');
    const link = sanitizeInput(formData.get('link')?.toString() || '');
    const quantity = parseInt(formData.get('quantity')?.toString() || '0');
    const serviceName = sanitizeInput(formData.get('service_name')?.toString() || '');
    const category = sanitizeInput(formData.get('category')?.toString() || '');
    const rate = parseFloat(formData.get('rate')?.toString() || '0');

    if (!serviceId || !link || !quantity) {
      return Response.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      return Response.json({ error: 'El enlace debe comenzar con http:// o https://' }, { status: 400 });
    }

    // Calculate cost
    const charge = (rate * quantity) / 1000;

    // Check user balance
    const [user] = await sql`SELECT balance FROM users WHERE id = ${session.userId}`;
    if (!user || parseFloat(user.balance) < charge) {
      return Response.json({ error: 'Saldo insuficiente. Por favor, agregá fondos.' }, { status: 400 });
    }

    // Determine original service ID (supporting backward compatibility with 100xxx prefix)
    const serviceIdStr = serviceId.toString();
    const originalServiceId = serviceIdStr.startsWith('100')
      ? parseInt(serviceIdStr.substring(3))
      : serviceId;

    // Place order on SMM SAT API
    const smmResult = await addOrder(originalServiceId, link, quantity);
    
    // Check if the API returned an error or didn't return an order ID
    if (!smmResult || !smmResult.order) {
      const errorMsg = (smmResult as any)?.error || 'Error desconocido del proveedor SMM';
      console.error('Error placing order on smmsat:', errorMsg);
      return Response.json({ error: `Error del proveedor: ${errorMsg}` }, { status: 500 });
    }
    
    // Deduct balance and add to spent
    await sql`
      UPDATE users 
      SET balance = balance - ${charge}, 
          spent = spent + ${charge} 
      WHERE id = ${session.userId}
    `;

    // Save to local DB
    await sql`
      INSERT INTO orders (user_id, smm_order_id, service_id, service_name, category, link, quantity, charge, status, provider, provider_order_id)
      VALUES (
        ${session.userId},
        ${smmResult.order},
        ${serviceId},
        ${serviceName},
        ${category},
        ${link},
        ${quantity},
        ${charge.toFixed(6)},
        'Pending',
        'smmsat',
        ${smmResult.order.toString()}
      )
    `;

    return Response.json({
      success: true,
      order_id: smmResult.order,
      message: 'Pedido creado exitosamente',
    });
  } catch (error) {
    console.error('Order error:', error);
    return Response.json({ error: 'Error al crear el pedido' }, { status: 500 });
  }
};
