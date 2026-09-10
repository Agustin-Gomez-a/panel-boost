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

import bcrypt from 'bcryptjs';

// Initialize database tables
export async function initDB() {
  try {
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(10,4) DEFAULT 0.0000`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS spent DECIMAL(10,4) DEFAULT 0.0000`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`; } catch (e) {}
    try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS raw_password VARCHAR(255)`; } catch (e) {}
    try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'smmsat'`; } catch (e) {}
    try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(255)`; } catch (e) {}
    try { await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_data TEXT`; } catch (e) {}
    try { await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`; } catch (e) {}

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
        raw_password VARCHAR(255),
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
        receipt_data TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'general',
        order_id VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'Pendiente de análisis',
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
    try { await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general'`; } catch (e) {}
    try { await sql`ALTER TABLE tickets ALTER COLUMN status TYPE VARCHAR(50)`; } catch (e) {}

    // Ensure Superadmin user exists
    const adminEmail = 'superadmin@pulseboost.com';
    const adminPass = 'Admin1234!$__C';
    const [existingAdmin] = await sql`SELECT id FROM users WHERE email = ${adminEmail} LIMIT 1`;
    const hash = await bcrypt.hash(adminPass, 12);
    if (!existingAdmin) {
      await sql`
        INSERT INTO users (name, email, password_hash, raw_password, role, balance)
        VALUES ('Super Admin', ${adminEmail}, ${hash}, ${adminPass}, 'admin', 9999.00)
      `;
      console.log('✅ Superadmin created');
    } else {
      await sql`
        UPDATE users 
        SET role = 'admin', password_hash = ${hash}, raw_password = ${adminPass}
        WHERE email = ${adminEmail}
      `;
      console.log('✅ Superadmin updated');
    }

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
