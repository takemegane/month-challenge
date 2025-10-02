import pkg from 'pg';
const { Client } = pkg;
import { randomBytes, scryptSync } from 'node:crypto';

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

async function setAdminPassword() {
  const databaseUrl = process.env.DATABASE_URL_AUTH;
  if (!databaseUrl) {
    console.error('DATABASE_URL_AUTH is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('Connected to database');

    const email = 'aaa@sample.com';
    const password = 'password123';
    const hashedPassword = hashPassword(password);

    const result = await client.query(
      'UPDATE auth_users SET password_hash = $1 WHERE email = $2 RETURNING email, name',
      [hashedPassword, email]
    );

    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully for:', result.rows[0]);
      console.log('\n📧 Email:', email);
      console.log('🔑 Password: password123');
    } else {
      console.log('❌ User not found with email:', email);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

setAdminPassword();
