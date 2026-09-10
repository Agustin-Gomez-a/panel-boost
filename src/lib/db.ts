import postgres from 'postgres';

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default sql;

// Initialize database tables
export async function initDB() {
  try {
    try { await sql`ALTER TABLE users ADD COLUMN balance DECIMAL(10,4) DEFAULT 0.0000`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN spent DECIMAL(10,4) DEFAULT 0.0000`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE`; } catch (e) {}
    try { await sql`ALTER TABLE orders ADD COLUMN provider VARCHAR(50) DEFAULT 'smmsat'`; } catch (e) {}
    try { await sql`ALTER TABLE orders ADD COLUMN provider_order_id VARCHAR(255)`; } catch (e) {}

    await sql`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        api_key VARCHAR(64),
        balance DECIMAL(10,4) DEFAULT 0.0000,
        spent DECIMAL(10,4) DEFAULT 0.0000,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        smm_order_id INTEGER,
        service_id INTEGER NOT NULL,
        service_name VARCHAR(255),
        category VARCHAR(255),
        link TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        charge DECIMAL(10,6),
        status VARCHAR(50) DEFAULT 'Pending',
        remains INTEGER,
        start_count INTEGER,
        provider VARCHAR(50) DEFAULT 'smmsat',
        provider_order_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identifier VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        attempts INTEGER DEFAULT 1,
        window_start TIMESTAMP DEFAULT NOW(),
        UNIQUE(identifier, action)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10,4) NOT NULL,
        method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        order_id VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        is_admin BOOLEAN DEFAULT FALSE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(64)`; } catch (e) {}
    try { await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS order_id VARCHAR(100)`; } catch (e) {}

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
