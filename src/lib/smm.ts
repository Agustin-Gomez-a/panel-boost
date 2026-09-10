const PROVIDERS = {
  smmsat: {
    url: import.meta.env.SMM_API_URL || 'https://smmsat.com/api/v2',
    key: import.meta.env.SMM_API_KEY,
  },
  jap: {
    url: import.meta.env.JAP_API_URL || 'https://justanotherpanel.com/api/v2',
    key: import.meta.env.JAP_API_KEY || '01456f86856eefa422bc8c55ddb9b521',
  }
};

export interface SMMService {
  service: number; // Internal unified ID or string, but SMM panels expect ints. We can use a unified string ID but frontend might break. 
  // Wait! SMM service IDs from different providers might collide (e.g. ID 12 on smmsat and ID 12 on mysmm).
  // To avoid collisions, we can prefix the ID with a number, e.g. smmsat is 10000 + ID, mysmm is 20000 + ID.
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

async function smmPost(providerId: 'smmsat' | 'jap', params: Record<string, string>): Promise<unknown> {
  const provider = PROVIDERS[providerId];
  if (!provider.key) {
    throw new Error(`API Key for ${providerId} is not configured.`);
  }

  const body = new URLSearchParams({
    key: provider.key,
    ...params,
  });

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`${providerId} API error: ${response.status}`);
  }

  return response.json();
}

// Simple in-memory cache for services
let servicesCache: SMMService[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getServices(): Promise<SMMService[]> {
  const MARKUP_MULTIPLIER = 2.2; // 220% markup (user requested)

  if (servicesCache && Date.now() - lastCacheTime < CACHE_TTL) {
    return servicesCache;
  }

  let allServices: SMMService[] = [];

  try {
    const [smmsatRes, japRes] = await Promise.allSettled([
      smmPost('smmsat', { action: 'services' }),
      smmPost('jap', { action: 'services' })
    ]);

    if (smmsatRes.status === 'fulfilled' && Array.isArray(smmsatRes.value)) {
      allServices.push(...smmsatRes.value.map((s: any) => ({
        ...s,
        original_service: s.service,
        service: parseInt(`100${s.service}`),
        provider: 'smmsat',
        rate: parseFloat((parseFloat(s.rate) * MARKUP_MULTIPLIER).toFixed(4)).toString()
      })));
    } else if (smmsatRes.status === 'rejected') {
      console.error('Error fetching SMMSAT services:', smmsatRes.reason);
    }

    if (japRes.status === 'fulfilled' && Array.isArray(japRes.value)) {
      allServices.push(...japRes.value.map((s: any) => ({
        ...s,
        original_service: s.service,
        service: parseInt(`200${s.service}`),
        provider: 'jap',
        rate: parseFloat((parseFloat(s.rate) * MARKUP_MULTIPLIER).toFixed(4)).toString()
      })));
    } else if (japRes.status === 'rejected') {
      console.error('Error fetching JAP services:', japRes.reason);
    }
  } catch (error) {
    console.error('Error in getServices:', error);
  }

  // Update cache
  if (allServices.length > 0) {
    servicesCache = allServices;
    lastCacheTime = Date.now();
  }

  return allServices;
}

export async function addOrder(
  provider: 'smmsat' | 'jap',
  originalServiceId: number,
  link: string,
  quantity: number
): Promise<{ order: number }> {
  const data = await smmPost(provider, {
    action: 'add',
    service: originalServiceId.toString(),
    link,
    quantity: quantity.toString(),
  });
  return data as { order: number };
}

export async function getOrderStatus(provider: 'smmsat' | 'jap', orderId: string): Promise<SMMOrderStatus> {
  const data = await smmPost(provider, {
    action: 'status',
    order: orderId,
  });
  return data as SMMOrderStatus;
}

// Para obtener saldos de ambas cuentas de administrador
export async function getAdminBalances(): Promise<SMMBalance[]> {
  const balances: SMMBalance[] = [];
  try {
    const b1 = await smmPost('smmsat', { action: 'balance' }) as any;
    balances.push({ balance: b1.balance, currency: b1.currency, provider: 'smmsat' });
  } catch (e) {}
  
  try {
    const b2 = await smmPost('jap', { action: 'balance' }) as any;
    balances.push({ balance: b2.balance, currency: b2.currency, provider: 'jap' });
  } catch (e) {}

  return balances;
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

export async function createRefill(provider: 'smmsat' | 'jap', orderId: number): Promise<{ refill: string }> {
  const data = await smmPost(provider, {
    action: 'refill',
    order: orderId.toString(),
  });
  return data as { refill: string };
}

export async function cancelOrders(provider: 'smmsat' | 'jap', orderIds: number[]): Promise<unknown> {
  const data = await smmPost(provider, {
    action: 'cancel',
    orders: orderIds.join(','),
  });
  return data;
}
