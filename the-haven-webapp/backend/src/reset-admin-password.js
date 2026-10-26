import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models.js';

// Manually reset only the existing administrator identified by ADMIN_EMAIL.
// Never log credentials, connection strings, or password hashes.
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'the_haven_db';
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const newPassword = String(process.env.ADMIN_PASSWORD || '');

if (!uri || /YOUR_|<[^>]+>|REPLACE_WITH_/.test(uri)) {
  console.error('Missing valid MONGODB_URI repository secret.');
  process.exit(1);
}
if (dbName !== 'the_haven_db') {
  console.error('Admin password reset blocked: unexpected database name.');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  console.error('ADMIN_EMAIL must be the existing administrator email.');
  process.exit(1);
}
if (newPassword.length < 12 || newPassword.length > 128) {
  console.error('ADMIN_PASSWORD must contain 12–128 characters.');
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
    throw new Error('UnexpectedDatabase');
  }

  const account = await User.findOne({ email, role: 'admin' });
  if (!account) {
    console.error('No administrator matches ADMIN_EMAIL. No accounts changed.');
    process.exitCode = 1;
  } else if (account.status !== 'active') {
    console.error('The matching administrator is not active. No accounts changed.');
    process.exitCode = 1;
  } else {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const result = await User.updateOne(
      { _id: account._id, email, role: 'admin', status: 'active' },
      { $set: { passwordHash } }
    );
    if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
      throw new Error('AdminUpdateNotApplied');
    }
    console.log('Existing THE HAVEN administrator password successfully reset.');
    console.log('No new administrator was created. No credentials were printed.');
  }
} catch (error) {
  // Error details can contain connection strings; log only a sanitized category.
  const category = error?.name === 'MongoServerSelectionError' ? 'DatabaseConnectionError' : 'ResetFailed';
  console.error('Administrator password reset unsuccessful (' + category + ').');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
