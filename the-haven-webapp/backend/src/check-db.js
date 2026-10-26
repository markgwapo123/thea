import 'dotenv/config';
import mongoose from 'mongoose';

// Run npm run db:check. Never print connection strings or passwords.
const uri = process.env.MONGODB_URI;
const expectedDatabase = process.env.MONGODB_DB_NAME || 'the_haven_db';
if (!uri || /YOUR_|<[^>]+>|REPLACE_WITH_/.test(uri)) {
  console.error('Set a private MONGODB_URI in backend/.env. Do not commit .env to GitHub.');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { dbName: expectedDatabase, serverSelectionTimeoutMS: 12000 });
  const connectedDatabase = mongoose.connection.name;
  if (connectedDatabase !== expectedDatabase) {
    throw new Error('Wrong database selected. Expected ' + expectedDatabase);
  }
  await mongoose.connection.db.command({ ping: 1 });
  console.log('MongoDB Atlas connected successfully to database: ' + connectedDatabase);
  console.log('Ping OK. Initialize the database with: npm run seed');
} catch (error) {
  console.error('MongoDB Atlas connection test failed.');
  console.error('Error type: ' + (error?.name || 'UnknownError'));
  console.error('Check credentials, database user permissions, Atlas Network Access IP allowlist, and database name. Do not share credentials.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
