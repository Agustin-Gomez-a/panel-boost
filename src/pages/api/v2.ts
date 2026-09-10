import type { APIRoute } from 'astro';
import sql from '../../lib/db';
import { getServices, addOrder, getOrderStatus } from '../../lib/smm';

export const POST: APIRoute = async ({ request }) => {
  try {
    let params: Record<string, string> = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((val, key) => {
        params[key] = val.toString();
      });
    } else if (contentType.includes('application/json')) {
      params = await request.json();
    }

    const { key, action } = params;

    if (!key) {
      return new Response(JSON.stringify({ error: 'Incorrect request. Key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Authenticate user by API key
    const [user] = await sql`SELECT id, balance FROM users WHERE api_key = ${key}`;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. SERVICES
    if (action === 'services') {
      const services = await getServices();
      const output = services.map(s => ({
        service: s.service,
        name: s.name,
        type: s.type,
        category: s.category,
        rate: s.rate,
        min: s.min,
        max: s.max,
        refill: s.refill,
        cancel: s.cancel,
      }));
      return new Response(JSON.stringify(output), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. BALANCE
    if (action === 'balance') {
      return new Response(JSON.stringify({
        balance: parseFloat(user.balance).toFixed(4),
        currency: 'USD',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. ADD ORDER
    if (action === 'add') {
      const serviceId = parseInt(params.service);
      const link = params.link;
      const quantity = parseInt(params.quantity);

      if (!serviceId || !link || !quantity) {
        return new Response(JSON.stringify({ error: 'Missing required parameters: service, link, quantity' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const services = await getServices();
      const service = services.find(s => s.service === serviceId);
      if (!service) {
        return new Response(JSON.stringify({ error: 'Service not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const charge = (parseFloat(service.rate) * quantity) / 1000;
      if (parseFloat(user.balance) < charge) {
        return new Response(JSON.stringify({ error: 'Not enough funds on balance' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const smmRes = await addOrder(
        service.provider as 'smmsat' | 'jap',
        service.original_service,
        link,
        quantity
      );

      // Deduct balance and record order
      await sql`
        UPDATE users 
        SET balance = balance - ${charge}, spent = spent + ${charge}
        WHERE id = ${user.id}
      `;

      await sql`
        INSERT INTO orders (user_id, service_id, service_name, category, link, quantity, charge, smm_order_id, status)
        VALUES (${user.id}, ${service.service}, ${service.name}, ${service.category}, ${link}, ${quantity}, ${charge}, ${smmRes.order?.toString() || '0'}, 'Pending')
      `;

      return new Response(JSON.stringify({ order: smmRes.order }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. STATUS
    if (action === 'status') {
      const orderId = params.order;
      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Order ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const [orderRecord] = await sql`SELECT smm_order_id, charge, status FROM orders WHERE smm_order_id = ${orderId} AND user_id = ${user.id}`;
      if (!orderRecord) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        charge: parseFloat(orderRecord.charge).toFixed(4),
        start_count: '0',
        status: orderRecord.status,
        remains: '0',
        currency: 'USD',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
