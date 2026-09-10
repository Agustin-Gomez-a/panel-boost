import sql from '../src/lib/db.js';

async function migrate() {
  try {
    console.log('Running migrations...');
    
    try {
      await sql`ALTER TABLE users ADD COLUMN balance DECIMAL(10,4) DEFAULT 0.0000`;
      console.log('Added balance to users');
    } catch (e: any) { console.log('balance column might already exist:', e.message); }

    try {
      await sql`ALTER TABLE users ADD COLUMN spent DECIMAL(10,4) DEFAULT 0.0000`;
      console.log('Added spent to users');
    } catch (e: any) { console.log('spent column might already exist:', e.message); }

    try {
      await sql`ALTER TABLE orders ADD COLUMN provider VARCHAR(50) DEFAULT 'smmsat'`;
      console.log('Added provider to orders');
    } catch (e: any) { console.log('provider column might already exist:', e.message); }

    try {
      await sql`ALTER TABLE orders ADD COLUMN provider_order_id VARCHAR(255)`;
      console.log('Added provider_order_id to orders');
    } catch (e: any) { console.log('provider_order_id column might already exist:', e.message); }

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
    console.log('Created payments table');
    
    console.log('Migrations complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
