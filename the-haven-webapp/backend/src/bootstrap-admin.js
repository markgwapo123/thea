import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models.js';

// Provision the *first* real administrator; never seed placeholder users or clubs.
// No credentials or personally identifying details are printed to logs.
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'the_haven_db';
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const fullName = String(process.env.ADMIN_NAME || 'THE HAVEN Administrator').trim();

if (!uri || /YOUR_|<[^>]+>|REPLACE_WITH_/.test(uri)) {
  console.error('Missing valid private MONGODB_URI.');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  console.error('Set a valid private ADMIN_EMAIL secret.');
  process.exit(1);
}
if (password.length < 12 || password.length > 128) {
  console.error('ADMIN_PASSWORD must be 12 to 128 characters.');
  process.exit(1);
}
if (fullName.length < 2 || fullName.length > 100) {
  console.error('ADMIN_NAME must be 2 to 100 characters.');
  process.exit(1);
}

try {
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 12000,
    autoIndex: false,
    autoCreate: false
  });
  if (mongoose.connection.name !== 'the_haven_db') {
    throw new Error('Unexpected database target: administrator creation blocked');
  }
  if (await User.exists({ role: 'admin' })) {
    console.error('An administrator already exists. No account was created or modified.');
    process.exitCode = 1;
  } else if (await User.exists({ email })) {
    console.error('That email already belongs to an account. No existing role was modified.');
    process.exitCode = 1;
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ fullName, email, passwordHash, role: 'admin', status: 'active' });
    console.log('First THE HAVEN administrator created in the_haven_db.');
    console.log('Password securely hashed; no login credentials were logged.');
  }
} catch (error) {
  // Don't leak URLs, credentials, or sensitive MongoDB driver error details.
  console.error('Administrator setup unsuccessful (' + (error?.code === 11000 ? 'duplicate account' : error?.name || 'UnknownError') + ').');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
