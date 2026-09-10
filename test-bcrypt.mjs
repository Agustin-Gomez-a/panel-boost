import bcrypt from 'bcryptjs';

async function test() {
  console.log('Testing bcrypt...');
  const start = Date.now();
  await bcrypt.hash('password', 1);
  console.log('bcrypt.hash took', Date.now() - start, 'ms');
  
  const start2 = Date.now();
  await bcrypt.compare('password', '$2a$10$89Jd/31R.Tf4c172Xz9lY.kRj3.G/j9r0C05Q4y0oW7M8gI5CqI/i'); // just some random hash
  console.log('bcrypt.compare took', Date.now() - start2, 'ms');
}

test();
