import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Club, User, Setting } from './models.js';

if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before seeding.');
await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME || 'the_haven_db',
  serverSelectionTimeoutMS: 12000
});
const demoClubs = [
  { name: 'Peer Support Circle', category: 'Wellness', tagline: 'A listening ear, a stronger community.', description: 'Connect with peers, build compassionate communication skills, and support a caring campus environment. Example club — edit in Admin Dashboard.', capacity: 50, meetingSchedule: 'Thursdays · 3:30 PM', accent: 'rose' },
  { name: 'Leadership & Mentorship', category: 'Leadership', tagline: 'Grow together. Lead with purpose.', description: 'Explore peer facilitation, leadership workshops, and mentoring opportunities with fellow students. Example club — edit in Admin Dashboard.', capacity: 40, meetingSchedule: 'Wednesdays · 4:00 PM', accent: 'gold' },
  { name: 'Community Outreach', category: 'Service', tagline: 'Small acts. Meaningful impact.', description: 'Join student-led service projects, campus initiatives, and collaborative outreach activities. Example club — edit in Admin Dashboard.', capacity: 35, meetingSchedule: 'Fridays · 2:00 PM', accent: 'sage' },
  { name: 'Creative Expression Club', category: 'Arts', tagline: 'Create. Connect. Express.', description: 'Express ideas through art, conversation, creative storytelling, and supportive group activities. Example club — edit in Admin Dashboard.', capacity: 45, meetingSchedule: 'Tuesdays · 3:00 PM', accent: 'blue' }
];
for (const item of demoClubs) {
  if (!(await Club.exists({ name: item.name }))) await Club.create(item);
}
await Setting.updateOne({ key: 'academicYear' }, { $setOnInsert: { value: '2026–2027' } }, { upsert: true });
if (process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD) {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) both required to bootstrap admin.');
  }
  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  if (!(await User.exists({ email }))) {
    await User.create({ fullName: process.env.ADMIN_NAME || 'Haven Administrator', email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: 'admin', status: 'active' });
    console.log('Administrator created:', email);
  } else {
    console.log('Administrator email already exists; seed does not modify it.');
  }
} else {
  console.log('No administrator created. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, then rerun seed.');
}
console.log('Club examples and academic year seeded.');
await mongoose.disconnect();
