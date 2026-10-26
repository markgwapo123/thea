import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { User, Club, ClubStaff, Application, Membership, Announcement, Notification, AuditLog, Setting } from './models.js';

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Required: MONGODB_URI and a JWT_SECRET with at least 32 characters.');
  process.exit(1);
}
const app = express();
app.set('trust proxy', 1);
const production = process.env.NODE_ENV === 'production';
const origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:4000').split(',').map(s => s.trim()).filter(Boolean);
app.use(helmet({ contentSecurityPolicy: production ? undefined : false }));
app.use(cors({ origin(origin, cb) { if (!origin || origins.includes(origin)) return cb(null, true); cb(new Error('Origin not allowed')); }, credentials: true }));
// Require approved web origins for state-changing cross-site requests.
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) {
    return res.status(403).json({ error: 'Unapproved browser origin.' });
  }
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validId = id => mongoose.isValidObjectId(id);
const safe = u => ({ _id: u._id, fullName: u.fullName, email: u.email, studentId: u.studentId || '', yearLevel: u.yearLevel, department: u.department, role: u.role, status: u.status });
const cookieOpts = { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
const clean = (v, max = 150) => String(v ?? '').trim().slice(0, max);
const fail = (res, msg, code = 400) => res.status(code).json({ error: msg });
const year = async () => (await Setting.findOne({ key: 'academicYear' }))?.value || '2026–2027';
const audit = async (actorId, action, entityType, entityId, details = '') => AuditLog.create({ actorId, action, entityType, entityId, details });
const notify = async (userId, title, message) => Notification.create({ userId, title, message });

const auth = wrap(async (req, res, next) => {
  const token = req.cookies.haven_token;
  if (!token) return fail(res, 'Please sign in.', 401);
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return fail(res, 'Session expired. Please sign in.', 401); }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') return fail(res, 'Account unavailable.', 401);
  req.user = user;
  next();
});
const onlyAdmin = (req, res, next) => req.user.role === 'admin' ? next() : fail(res, 'Administrator permission required.', 403);
const scopeIds = async user => user.role === 'admin' ? null : (await ClubStaff.find({ userId: user._id })).map(x => x.clubId);
const canReview = async (user, clubId) => user.role === 'admin' || !!(await ClubStaff.exists({ userId: user._id, clubId, role: 'adviser' }));
const canManage = async (user, clubId) => user.role === 'admin' || !!(await ClubStaff.exists({ userId: user._id, clubId }));

app.get('/api/health', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'database_unavailable', timestamp: new Date().toISOString() }));
app.post('/api/auth/register', authLimit, wrap(async (req, res) => {
  const fullName = clean(req.body.fullName, 100), email = clean(req.body.email, 254).toLowerCase();
  const studentId = clean(req.body.studentId, 50), password = String(req.body.password || '');
  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !studentId || password.length < 8 || password.length > 128) return fail(res, 'Enter your name, valid email, student ID and password (8–128 characters).');
  const user = await User.create({ fullName, email, studentId, passwordHash: await bcrypt.hash(password, 12), department: clean(req.body.department, 100), yearLevel: clean(req.body.yearLevel, 40) });
  res.cookie('haven_token', jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' }), cookieOpts);
  res.status(201).json({ user: safe(user) });
}));
app.post('/api/auth/login', authLimit, wrap(async (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = user ? await bcrypt.compare(String(req.body.password || ''), user.passwordHash) : await bcrypt.compare(String(req.body.password || ''), '$2a$12$7EqJtq98hPqEX7fNZaFWoOMghwbxAmqszuRvMyZyB4bwbF/4IyLJa');
  if (!user || !matches || user.status !== 'active') return fail(res, 'Incorrect email or password.', 401);
  res.cookie('haven_token', jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' }), cookieOpts);
  res.json({ user: safe(user) });
}));
app.post('/api/auth/logout', (req, res) => { res.clearCookie('haven_token', { ...cookieOpts, maxAge: undefined }); res.json({ ok: true }); });
app.get('/api/me', auth, wrap(async (req, res) => res.json({ user: safe(req.user), staff: await ClubStaff.find({ userId: req.user._id }).populate('clubId', 'name') })));

app.get('/api/clubs', wrap(async (req, res) => {
  const clubs = await Club.find({ status: { $ne: 'archived' } }).sort({ createdAt: 1 }).lean();
  res.json({ clubs });
}));
app.post('/api/clubs', auth, onlyAdmin, wrap(async (req, res) => {
  const name = clean(req.body.name, 120), description = clean(req.body.description, 1400), category = clean(req.body.category, 80);
  const capacity = Number(req.body.capacity);
  if (!name || !description || !category || !Number.isSafeInteger(capacity) || capacity < 1) return fail(res, 'Name, category, description, and a valid capacity are required.');
  const club = await Club.create({ name, category, description, capacity, tagline: clean(req.body.tagline, 180), meetingSchedule: clean(req.body.meetingSchedule, 120) || 'To be announced', accent: ['gold','rose','sage','blue'].includes(req.body.accent) ? req.body.accent : 'gold' });
  await audit(req.user._id, 'club_created', 'Club', club._id);
  res.status(201).json({ club });
}));
app.patch('/api/clubs/:id', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid club ID.');
  const club = await Club.findById(req.params.id);
  if (!club) return fail(res, 'Club not found.', 404);
  for (const f of ['name','category','description','tagline','meetingSchedule']) if (req.body[f] !== undefined) club[f] = clean(req.body[f], f === 'description' ? 1400 : 180);
  if (req.body.capacity !== undefined) {
    const n = Number(req.body.capacity);
    if (!Number.isSafeInteger(n) || n < club.memberCount || n < 1) return fail(res, 'Capacity must be at least the existing member count and greater than zero.');
    club.capacity = n;
  }
  if (req.body.status !== undefined) {
    if (!['open','closed','archived'].includes(req.body.status)) return fail(res, 'Invalid status.');
    club.status = req.body.status;
  }
  if (req.body.accent !== undefined && ['gold','rose','sage','blue'].includes(req.body.accent)) club.accent = req.body.accent;
  await club.save();
  await audit(req.user._id, 'club_updated', 'Club', club._id);
  res.json({ club });
}));

app.get('/api/applications', auth, wrap(async (req, res) => {
  let filter = {};
  if (req.query.mine === '1') filter.studentId = req.user._id;
  else if (req.user.role !== 'admin') {
    const scopes = (await ClubStaff.find({ userId: req.user._id })).map(x => x.clubId);
    filter.clubId = { $in: scopes };
  }
  const applications = await Application.find(filter).populate('studentId', 'fullName email studentId department yearLevel').populate('clubId', 'name category capacity memberCount').sort({ createdAt: -1 }).lean();
  res.json({ applications });
}));
app.post('/api/applications', auth, wrap(async (req, res) => {
  if (!validId(req.body.clubId)) return fail(res, 'Select a valid club.');
  const club = await Club.findById(req.body.clubId);
  if (!club || club.status !== 'open') return fail(res, 'Registration is not open for this club.');
  const motivation = clean(req.body.motivation, 1000);
  if (motivation.length < 15) return fail(res, 'Please enter at least 15 characters for your motivation.');
  const academicYear = await year();
  const exists = await Application.exists({ studentId: req.user._id, clubId: club._id, academicYear });
  if (exists) return fail(res, 'You have already applied to this club for this academic year.', 409);
  const application = await Application.create({ studentId: req.user._id, clubId: club._id, academicYear, motivation, status: club.memberCount >= club.capacity ? 'waitlisted' : 'pending' });
  await notify(req.user._id, 'Application submitted', `${club.name}: Your application is ${application.status === 'waitlisted' ? 'waitlisted because this club is full' : 'pending review'}.`);
  await audit(req.user._id, 'application_submitted', 'Application', application._id);
  res.status(201).json({ application });
}));
app.patch('/api/applications/:id/cancel', auth, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid application ID.');
  const application = await Application.findOneAndUpdate({ _id: req.params.id, studentId: req.user._id, status: { $in: ['pending','waitlisted'] } }, { $set: { status: 'cancelled' } }, { new: true });
  if (!application) return fail(res, 'Only pending or waitlisted applications may be cancelled.', 409);
  await audit(req.user._id, 'application_cancelled', 'Application', application._id);
  res.json({ application });
}));
app.patch('/api/applications/:id/review', auth, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid application ID.');
  const status = req.body.status;
  if (!['approved','rejected','waitlisted','under_review'].includes(status)) return fail(res, 'Invalid review decision.');
  const current = await Application.findById(req.params.id).populate('clubId', 'name');
  if (!current) return fail(res, 'Application not found.', 404);
  if (!(await canReview(req.user, current.clubId._id))) return fail(res, 'Assigned adviser or administrator required.', 403);
  if (!['pending','waitlisted','under_review'].includes(current.status)) return fail(res, 'Application already finalized.', 409);
  const remarks = clean(req.body.remarks, 500);
  let finalStatus = status;
  if (status === 'approved') {
    // Atomic club-capacity increment; MongoDB Atlas transactions keep all 3 records consistent.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const appRow = await Application.findOne({ _id: current._id, status: { $in: ['pending','waitlisted','under_review'] } }).session(session);
        if (!appRow) throw Object.assign(new Error('Application was already reviewed.'), { statusCode: 409 });
        const slot = await Club.findOneAndUpdate({ _id: current.clubId._id, status: { $ne: 'archived' }, $expr: { $lt: ['$memberCount','$capacity'] } }, { $inc: { memberCount: 1 } }, { new: true, session });
        if (!slot) throw Object.assign(new Error('Club capacity reached. Choose Waitlisted.'), { statusCode: 409 });
        await Membership.create([{ studentId: appRow.studentId, clubId: appRow.clubId, academicYear: appRow.academicYear }], { session });
        appRow.status = 'approved'; appRow.remarks = remarks; appRow.reviewedAt = new Date(); appRow.reviewedBy = req.user._id;
        await appRow.save({ session });
      });
    } finally { await session.endSession(); }
  } else {
    const updated = await Application.findOneAndUpdate({ _id: current._id, status: { $in: ['pending','waitlisted','under_review'] } }, { $set: { status, remarks, reviewedBy: req.user._id, reviewedAt: new Date() } }, { new: true });
    if (!updated) return fail(res, 'Application was already reviewed.', 409);
  }
  await notify(current.studentId, 'Application update', `${current.clubId.name}: Your application is now ${finalStatus.replace('_',' ')}.${remarks ? ' Note: ' + remarks : ''}`);
  await audit(req.user._id, 'application_reviewed', 'Application', current._id, finalStatus);
  res.json({ ok: true, status: finalStatus });
}));

app.get('/api/memberships', auth, wrap(async (req, res) => {
  let filter;
  if (req.query.clubId) {
    if (!validId(req.query.clubId) || !(await canManage(req.user, req.query.clubId))) return fail(res, 'Not authorized for club members.', 403);
    filter = { clubId: req.query.clubId };
  } else filter = { studentId: req.user._id };
  const memberships = await Membership.find(filter).populate('studentId', 'fullName studentId department yearLevel').populate('clubId', 'name category').sort({ joinedAt: -1 });
  res.json({ memberships });
}));
app.get('/api/staff', auth, wrap(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  const staff = await ClubStaff.find(filter).populate('userId', 'fullName email').populate('clubId', 'name');
  res.json({ staff });
}));
app.post('/api/staff', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.body.userId) || !validId(req.body.clubId) || !['adviser','officer'].includes(req.body.role)) return fail(res, 'Valid user, club and staff role required.');
  if (!(await User.exists({ _id: req.body.userId })) || !(await Club.exists({ _id: req.body.clubId }))) return fail(res, 'User or club not found.', 404);
  const staff = await ClubStaff.findOneAndUpdate({ userId: req.body.userId, clubId: req.body.clubId, role: req.body.role }, { $setOnInsert: { userId: req.body.userId, clubId: req.body.clubId, role: req.body.role } }, { upsert: true, new: true });
  await audit(req.user._id, 'club_staff_assigned', 'ClubStaff', staff._id);
  res.status(201).json({ staff });
}));

app.get('/api/announcements', wrap(async (req, res) => {
  const announcements = await Announcement.find().populate('clubId','name').populate('authorId','fullName').sort({ createdAt: -1 }).limit(40);
  res.json({ announcements });
}));
app.post('/api/announcements', auth, wrap(async (req, res) => {
  const title = clean(req.body.title, 160), body = clean(req.body.body, 3000), clubId = req.body.clubId || null;
  if (title.length < 3 || body.length < 8) return fail(res, 'Announcement title and message are required.');
  if (!clubId && req.user.role !== 'admin') return fail(res, 'Only administrators can publish school-wide announcements.', 403);
  if (clubId && (!validId(clubId) || !(await canManage(req.user, clubId)))) return fail(res, 'Not authorized to post for this club.', 403);
  const announcement = await Announcement.create({ authorId: req.user._id, clubId, title, body });
  await audit(req.user._id, 'announcement_created', 'Announcement', announcement._id);
  res.status(201).json({ announcement });
}));

app.get('/api/notifications', auth, wrap(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(80);
  res.json({ notifications });
}));
app.patch('/api/notifications/:id/read', auth, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid notification ID.');
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { $set: { read: true } });
  res.json({ ok: true });
}));

app.get('/api/users', auth, onlyAdmin, wrap(async (req, res) => {
  res.json({ users: (await User.find().sort({ createdAt: -1 }).limit(500)).map(safe) });
}));
app.patch('/api/users/:id', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid user ID.');
  const status = req.body.status;
  if (!['active','disabled'].includes(status)) return fail(res, 'Invalid account status.');
  if (String(req.user._id) === req.params.id && status === 'disabled') return fail(res, 'You cannot disable your own admin account.');
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!user) return fail(res, 'User not found.', 404);
  await audit(req.user._id, 'user_status_changed', 'User', user._id, status);
  res.json({ user: safe(user) });
}));
app.get('/api/stats', auth, wrap(async (req, res) => {
  const scopes = await scopeIds(req.user);
  const clubFilter = scopes === null ? {} : { _id: { $in: scopes } };
  const appFilter = scopes === null ? {} : { clubId: { $in: scopes } };
  const [clubs, applications, memberships, members] = await Promise.all([
    Club.countDocuments(clubFilter), Application.countDocuments(appFilter), Membership.countDocuments({ ...appFilter, status: 'active' }), scopes === null ? User.countDocuments({ role: 'student' }) : Promise.resolve(null)
  ]);
  res.json({ stats: { clubs, applications, memberships, students: members, pending: await Application.countDocuments({ ...appFilter, status: { $in: ['pending','under_review'] } }) } });
}));
app.get('/api/settings', wrap(async (req, res) => res.json({ academicYear: await year() })));
app.put('/api/settings/academic-year', auth, onlyAdmin, wrap(async (req, res) => {
  const value = clean(req.body.academicYear, 20);
  if (!/^\d{4}[-–]\d{4}$/.test(value)) return fail(res, 'Use academic year format 2026–2027.');
  await Setting.updateOne({ key: 'academicYear' }, { $set: { value } }, { upsert: true });
  await audit(req.user._id, 'academic_year_updated', 'Setting', null, value);
  res.json({ academicYear: value });
}));

// Local single-server development: the same frontend can be served at http://localhost:4000.
if (!production) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');
  app.use(express.static(root));
  app.get('/', (req, res) => res.sendFile(path.join(root, 'index.html')));
}
app.use((req, res) => fail(res, 'Endpoint not found.', 404));
app.use((err, req, res, next) => {
  if (err.code === 11000) return fail(res, 'A record with these details already exists.', 409);
  if (err.name === 'ValidationError' || err.name === 'CastError') return fail(res, 'Invalid input data.');
  if (err.statusCode) return fail(res, err.message, err.statusCode);
  console.error(err);
  return fail(res, production ? 'Server error. Please try again.' : err.message, 500);
});

const PORT = Number(process.env.PORT || 4000);
mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME || 'the_haven_db',
  serverSelectionTimeoutMS: 12000
}).then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`THE HAVEN API listening on ${PORT}`));
}).catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
