const SMM_API_URL = import.meta.env.SMM_API_URL || process.env.SMM_API_URL || 'https://smmsat.com/api/v2';
const SMM_API_KEY = import.meta.env.SMM_API_KEY || process.env.SMM_API_KEY || '85056b7713474f0a57923a3973d3ba10';

export interface SMMService {
  service: number;
  original_service: number;
  provider: string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
}

export interface SMMOrderStatus {
  charge: string;
  start_count: string;
  status: string;
  remains: string;
  currency: string;
  error?: string;
}

export interface SMMBalance {
  balance: string;
  currency: string;
  provider: string;
}

async function smmPost(params: Record<string, string>): Promise<unknown> {
  const apiKey = SMM_API_KEY || process.env.SMM_API_KEY || '85056b7713474f0a57923a3973d3ba10';
  const apiUrl = SMM_API_URL || process.env.SMM_API_URL || 'https://smmsat.com/api/v2';

  if (!apiKey) {
    throw new Error('API Key for SMM SAT is not configured.');
  }

  const body = new URLSearchParams({
    key: apiKey,
    ...params,
  });

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`SMM SAT API error: ${response.status}`);
  }

  return response.json();
}

// Simple in-memory cache for services
let servicesCache: SMMService[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getServices(): Promise<SMMService[]> {
  const MARKUP_MULTIPLIER = 2.2; // 220% markup

  if (servicesCache && Date.now() - lastCacheTime < CACHE_TTL) {
    return servicesCache;
  }

  try {
    const data = await smmPost({ action: 'services' });

    if (Array.isArray(data)) {
      const services: SMMService[] = data.map((s: any) => {
        const id = parseInt(s.service);
        return {
          ...s,
          service: id,
          original_service: id,
          provider: 'smmsat',
          rate: parseFloat((parseFloat(s.rate) * MARKUP_MULTIPLIER).toFixed(4)).toString(),
        };
      });

      servicesCache = services;
      lastCacheTime = Date.now();
      return services;
    }
  } catch (error) {
    console.error('Error fetching SMMSAT services:', error);
  }

  return servicesCache || [];
}

export async function addOrder(
  arg1: any,
  arg2: any,
  arg3?: any,
  arg4?: any
): Promise<{ order: number }> {
  let serviceId: number;
  let link: string;
  let quantity: number;

  if (typeof arg1 === 'string' && isNaN(Number(arg1))) {
    // Overload: addOrder(provider, serviceId, link, quantity)
    serviceId = typeof arg2 === 'number' ? arg2 : parseInt(arg2);
    link = arg3?.toString() || '';
    quantity = typeof arg4 === 'number' ? arg4 : parseInt(arg4 || '0');
  } else {
    // Direct: addOrder(serviceId, link, quantity)
    serviceId = typeof arg1 === 'number' ? arg1 : parseInt(arg1);
    link = arg2?.toString() || '';
    quantity = typeof arg3 === 'number' ? arg3 : parseInt(arg3 || '0');
  }

  const data = await smmPost({
    action: 'add',
    service: serviceId.toString(),
    link,
    quantity: quantity.toString(),
  });
  return data as { order: number };
}

export async function getOrderStatus(arg1: string, arg2?: string): Promise<SMMOrderStatus> {
  const orderId = arg2 !== undefined ? arg2 : arg1;
  const data = await smmPost({
    action: 'status',
    order: orderId,
  });
  return data as SMMOrderStatus;
}

export async function getAdminBalances(): Promise<SMMBalance[]> {
  try {
    const b = (await smmPost({ action: 'balance' })) as any;
    return [{ balance: b.balance || '0.00', currency: b.currency || 'USD', provider: 'smmsat' }];
  } catch (e) {
    console.error('Error fetching SMMSAT balance:', e);
    return [];
  }
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'Completed': 'var(--success)',
    'In progress': 'var(--accent)',
    'Pending': 'var(--warning)',
    'Partial': 'var(--info)',
    'Canceled': 'var(--danger)',
    'Processing': 'var(--accent)',
  };
  return map[status] || 'var(--text-muted)';
}

export async function createRefill(arg1: any, arg2?: any): Promise<{ refill: string }> {
  const orderId = typeof arg1 === 'string' && isNaN(Number(arg1)) ? arg2 : arg1;
  const data = await smmPost({
    action: 'refill',
    order: orderId.toString(),
  });
  return data as { refill: string };
}

export async function cancelOrders(arg1: any, arg2?: any): Promise<unknown> {
  const orderIds = Array.isArray(arg1) ? arg1 : Array.isArray(arg2) ? arg2 : [arg1];
  const data = await smmPost({
    action: 'cancel',
    orders: orderIds.join(','),
  });
  return data;
}
