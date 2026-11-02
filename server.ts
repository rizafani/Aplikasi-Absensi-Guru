import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import {
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_TIME_SLOTS,
  INITIAL_SCHEDULES,
  INITIAL_ATTENDANCE
} from './src/data/initialData';
import { DEFAULT_SCHOOL_LOCATION } from './src/utils/geo';
import { DEFAULT_SMILE_CAPTURE_CONFIG, TeacherFaceProfile } from './src/types';
import { syncPiketAccountsWithTeachers } from './src/utils/piketAuth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.resolve(__dirname, 'dist');
const DB_FILE = path.resolve(__dirname, 'data', 'school_database.json');

// Support large payloads (base64 selfie photos up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initial default database generator
function getDefaultDatabase() {
  const initialPiket = syncPiketAccountsWithTeachers(INITIAL_TEACHERS, []);
  return {
    version: Date.now(),
    lastUpdated: new Date().toISOString(),
    school: 'SMA NEGERI 1 JULOK',
    teachers: INITIAL_TEACHERS,
    classes: INITIAL_CLASSES,
    subjects: INITIAL_SUBJECTS,
    timeSlots: INITIAL_TIME_SLOTS,
    schedules: INITIAL_SCHEDULES,
    attendance: INITIAL_ATTENDANCE,
    piketAccounts: initialPiket,
    locationConfig: DEFAULT_SCHOOL_LOCATION,
    logos: { acehLogo: '/logo-aceh.svg' },
    smileCaptureConfig: DEFAULT_SMILE_CAPTURE_CONFIG,
    faceProfiles: [] as TeacherFaceProfile[]
  };
}

let currentDatabase = getDefaultDatabase();

function loadDatabaseFromDisk() {
  try {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      currentDatabase = {
        ...getDefaultDatabase(),
        ...parsed,
        // Ensure arrays are valid
        teachers: Array.isArray(parsed.teachers) ? parsed.teachers : INITIAL_TEACHERS,
        classes: Array.isArray(parsed.classes) ? parsed.classes : INITIAL_CLASSES,
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : INITIAL_SUBJECTS,
        timeSlots: Array.isArray(parsed.timeSlots) ? parsed.timeSlots : INITIAL_TIME_SLOTS,
        schedules: Array.isArray(parsed.schedules) ? parsed.schedules : INITIAL_SCHEDULES,
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : INITIAL_ATTENDANCE,
        piketAccounts: Array.isArray(parsed.piketAccounts) ? parsed.piketAccounts : syncPiketAccountsWithTeachers(INITIAL_TEACHERS, []),
        faceProfiles: Array.isArray(parsed.faceProfiles) ? parsed.faceProfiles : []
      };
      console.log(`[Server DB] Successfully loaded database from ${DB_FILE}. Teachers: ${currentDatabase.teachers.length}, Schedules: ${currentDatabase.schedules.length}`);
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(currentDatabase, null, 2), 'utf-8');
      console.log(`[Server DB] Initialized fresh central database at ${DB_FILE}`);
    }
  } catch (err) {
    console.error('[Server DB] Error loading database from disk:', err);
  }
}

function persistDatabaseToDisk() {
  try {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(currentDatabase, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server DB] Error persisting database to disk:', err);
  }
}

// Initialize database from disk at startup
loadDatabaseFromDisk();

// Real-Time Server-Sent Events (SSE) clients
const sseClients = new Set<express.Response>();

function broadcastDatabaseUpdate() {
  currentDatabase.version = Date.now();
  currentDatabase.lastUpdated = new Date().toISOString();
  persistDatabaseToDisk();

  const payload = `data: ${JSON.stringify({
    type: 'db_update',
    version: currentDatabase.version,
    lastUpdated: currentDatabase.lastUpdated
  })}\n\n`;

  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Health check endpoint for Cloud Run
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// SSE endpoint for instant real-time multi-device synchronization
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Nginx
  res.flushHeaders?.();

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    version: currentDatabase.version,
    message: 'Terhubung ke Database Pusat SMA Negeri 1 Julok'
  })}\n\n`);

  sseClients.add(res);

  // Heartbeat ping every 25 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// Check database version (lightweight polling)
app.get('/api/version', (_req, res) => {
  res.json({
    version: currentDatabase.version,
    lastUpdated: currentDatabase.lastUpdated
  });
});

// Get full central database state
app.get('/api/db', (_req, res) => {
  res.json(currentDatabase);
});

// Full database sync / import
app.post('/api/sync', (req, res) => {
  try {
    const dump = req.body;
    if (dump && typeof dump === 'object') {
      if (Array.isArray(dump.teachers)) currentDatabase.teachers = dump.teachers;
      if (Array.isArray(dump.classes)) currentDatabase.classes = dump.classes;
      if (Array.isArray(dump.subjects)) currentDatabase.subjects = dump.subjects;
      if (Array.isArray(dump.timeSlots)) currentDatabase.timeSlots = dump.timeSlots;
      if (Array.isArray(dump.schedules)) currentDatabase.schedules = dump.schedules;
      if (Array.isArray(dump.attendance)) currentDatabase.attendance = dump.attendance;
      if (Array.isArray(dump.piketAccounts)) currentDatabase.piketAccounts = dump.piketAccounts;
      if (dump.locationConfig) currentDatabase.locationConfig = dump.locationConfig;
      if (dump.logos) currentDatabase.logos = dump.logos;
      if (dump.smileCaptureConfig) currentDatabase.smileCaptureConfig = dump.smileCaptureConfig;
      if (Array.isArray(dump.faceProfiles)) currentDatabase.faceProfiles = dump.faceProfiles;

      broadcastDatabaseUpdate();
      res.json({ success: true, version: currentDatabase.version });
    } else {
      res.status(400).json({ error: 'Invalid dump format' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Reset to default school database
app.post('/api/reset-default', (_req, res) => {
  currentDatabase = getDefaultDatabase();
  broadcastDatabaseUpdate();
  res.json({ success: true, version: currentDatabase.version });
});

// --- ENTITY CRUD API ENDPOINTS ---

// Attendance
app.post('/api/attendance', (req, res) => {
  const record = req.body;
  if (!record || !record.id) {
    res.status(400).json({ error: 'Record and ID required' });
    return;
  }
  const existingIdx = currentDatabase.attendance.findIndex((r) => r.id === record.id);
  if (existingIdx >= 0) {
    currentDatabase.attendance[existingIdx] = record;
  } else {
    currentDatabase.attendance = [record, ...currentDatabase.attendance];
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.delete('/api/attendance/:id', (req, res) => {
  const id = req.params.id;
  currentDatabase.attendance = currentDatabase.attendance.filter((r) => r.id !== id);
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

// Teachers
app.post('/api/teachers', (req, res) => {
  const teacher = req.body;
  if (!teacher || !teacher.id) {
    res.status(400).json({ error: 'Teacher and ID required' });
    return;
  }
  const idx = currentDatabase.teachers.findIndex((t) => t.id === teacher.id);
  if (idx >= 0) {
    currentDatabase.teachers[idx] = teacher;
  } else {
    currentDatabase.teachers.push(teacher);
  }
  // Automatically sync piket accounts
  currentDatabase.piketAccounts = syncPiketAccountsWithTeachers(
    currentDatabase.teachers,
    currentDatabase.piketAccounts
  );
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.post('/api/teachers/bulk', (req, res) => {
  const { teachers } = req.body;
  if (!Array.isArray(teachers)) {
    res.status(400).json({ error: 'teachers array required' });
    return;
  }
  for (const t of teachers) {
    const idx = currentDatabase.teachers.findIndex((x) => x.id === t.id);
    if (idx >= 0) {
      currentDatabase.teachers[idx] = t;
    } else {
      currentDatabase.teachers.push(t);
    }
  }
  currentDatabase.piketAccounts = syncPiketAccountsWithTeachers(
    currentDatabase.teachers,
    currentDatabase.piketAccounts
  );
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.delete('/api/teachers/:id', (req, res) => {
  const id = req.params.id;
  currentDatabase.teachers = currentDatabase.teachers.filter((t) => t.id !== id);
  // Also clean up schedules assigned to this teacher
  currentDatabase.schedules = currentDatabase.schedules.filter((s) => s.teacherId !== id);
  currentDatabase.piketAccounts = syncPiketAccountsWithTeachers(
    currentDatabase.teachers,
    currentDatabase.piketAccounts
  );
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

// Classes
app.post('/api/classes', (req, res) => {
  const cls = req.body;
  if (!cls || !cls.id) {
    res.status(400).json({ error: 'Class and ID required' });
    return;
  }
  const idx = currentDatabase.classes.findIndex((c) => c.id === cls.id);
  if (idx >= 0) {
    currentDatabase.classes[idx] = cls;
  } else {
    currentDatabase.classes.push(cls);
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.post('/api/classes/bulk', (req, res) => {
  const { classes } = req.body;
  if (!Array.isArray(classes)) {
    res.status(400).json({ error: 'classes array required' });
    return;
  }
  for (const c of classes) {
    const idx = currentDatabase.classes.findIndex((x) => x.id === c.id);
    if (idx >= 0) {
      currentDatabase.classes[idx] = c;
    } else {
      currentDatabase.classes.push(c);
    }
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.delete('/api/classes/:id', (req, res) => {
  const id = req.params.id;
  currentDatabase.classes = currentDatabase.classes.filter((c) => c.id !== id);
  currentDatabase.schedules = currentDatabase.schedules.filter((s) => s.classRoomId !== id);
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

// Subjects
app.post('/api/subjects', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.id) {
    res.status(400).json({ error: 'Subject and ID required' });
    return;
  }
  const idx = currentDatabase.subjects.findIndex((s) => s.id === sub.id);
  if (idx >= 0) {
    currentDatabase.subjects[idx] = sub;
  } else {
    currentDatabase.subjects.push(sub);
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.post('/api/subjects/bulk', (req, res) => {
  const { subjects } = req.body;
  if (!Array.isArray(subjects)) {
    res.status(400).json({ error: 'subjects array required' });
    return;
  }
  for (const s of subjects) {
    const idx = currentDatabase.subjects.findIndex((x) => x.id === s.id);
    if (idx >= 0) {
      currentDatabase.subjects[idx] = s;
    } else {
      currentDatabase.subjects.push(s);
    }
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.delete('/api/subjects/:id', (req, res) => {
  const id = req.params.id;
  currentDatabase.subjects = currentDatabase.subjects.filter((s) => s.id !== id);
  currentDatabase.schedules = currentDatabase.schedules.filter((s) => s.subjectId !== id);
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

// Schedules
app.post('/api/schedules', (req, res) => {
  const schedule = req.body;
  if (!schedule || !schedule.id) {
    res.status(400).json({ error: 'Schedule and ID required' });
    return;
  }
  const idx = currentDatabase.schedules.findIndex((s) => s.id === schedule.id);
  if (idx >= 0) {
    currentDatabase.schedules[idx] = schedule;
  } else {
    currentDatabase.schedules.push(schedule);
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.post('/api/schedules/bulk', (req, res) => {
  const { schedules } = req.body;
  if (!Array.isArray(schedules)) {
    res.status(400).json({ error: 'schedules array required' });
    return;
  }
  for (const s of schedules) {
    const idx = currentDatabase.schedules.findIndex((x) => x.id === s.id);
    if (idx >= 0) {
      currentDatabase.schedules[idx] = s;
    } else {
      currentDatabase.schedules.push(s);
    }
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.post('/api/schedules/replace-all', (req, res) => {
  const { schedules } = req.body;
  if (!Array.isArray(schedules)) {
    res.status(400).json({ error: 'schedules array required' });
    return;
  }
  currentDatabase.schedules = schedules;
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.delete('/api/schedules/:id', (req, res) => {
  const id = req.params.id;
  currentDatabase.schedules = currentDatabase.schedules.filter((s) => s.id !== id);
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

// TimeSlots
app.post('/api/timeslots', (req, res) => {
  const slot = req.body;
  if (!slot || !slot.id) {
    res.status(400).json({ error: 'TimeSlot and ID required' });
    return;
  }
  const idx = currentDatabase.timeSlots.findIndex((t) => t.id === slot.id);
  if (idx >= 0) {
    currentDatabase.timeSlots[idx] = slot;
  } else {
    currentDatabase.timeSlots.push(slot);
  }
  currentDatabase.timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.post('/api/timeslots/bulk', (req, res) => {
  const { timeSlots } = req.body;
  if (!Array.isArray(timeSlots)) {
    res.status(400).json({ error: 'timeSlots array required' });
    return;
  }
  currentDatabase.timeSlots = timeSlots;
  currentDatabase.timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.delete('/api/timeslots/:id', (req, res) => {
  const id = req.params.id;
  currentDatabase.timeSlots = currentDatabase.timeSlots.filter((t) => t.id !== id);
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

// Piket Accounts
app.post('/api/piket', (req, res) => {
  const account = req.body;
  if (!account || !account.id) {
    res.status(400).json({ error: 'Account and ID required' });
    return;
  }
  const idx = currentDatabase.piketAccounts.findIndex((p) => p.id === account.id);
  if (idx >= 0) {
    currentDatabase.piketAccounts[idx] = account;
  } else {
    currentDatabase.piketAccounts.push(account);
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.post('/api/piket/bulk', (req, res) => {
  const { accounts } = req.body;
  if (!Array.isArray(accounts)) {
    res.status(400).json({ error: 'accounts array required' });
    return;
  }
  currentDatabase.piketAccounts = accounts;
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

// Settings & Config
app.post('/api/location', (req, res) => {
  const config = req.body;
  if (config) {
    currentDatabase.locationConfig = config;
    broadcastDatabaseUpdate();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Config required' });
  }
});

app.post('/api/logos', (req, res) => {
  const logos = req.body;
  if (logos) {
    currentDatabase.logos = logos;
    broadcastDatabaseUpdate();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Logos required' });
  }
});

app.post('/api/smile-config', (req, res) => {
  const config = req.body;
  if (config) {
    currentDatabase.smileCaptureConfig = config;
    broadcastDatabaseUpdate();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Config required' });
  }
});

// Face Profiles
app.post('/api/face-profiles', (req, res) => {
  const profile = req.body;
  if (!profile || !profile.teacherId) {
    res.status(400).json({ error: 'Profile and teacherId required' });
    return;
  }
  const idx = currentDatabase.faceProfiles.findIndex((p) => p.teacherId === profile.teacherId);
  if (idx >= 0) {
    currentDatabase.faceProfiles[idx] = profile;
  } else {
    currentDatabase.faceProfiles.push(profile);
  }
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

app.delete('/api/face-profiles/:teacherId', (req, res) => {
  const teacherId = req.params.teacherId;
  currentDatabase.faceProfiles = currentDatabase.faceProfiles.filter(
    (p) => p.teacherId !== teacherId
  );
  broadcastDatabaseUpdate();
  res.json({ success: true });
});

// Server Initialization with Vite middleware or Static files
async function setupServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In development mode, mount Vite middleware for instant HMR and React compilation
    console.log('[Server] Initializing Vite middleware for development...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built dist files with SPA fallback
    console.log('[Server] Serving static production build from dist...');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Index file not found. Please build the frontend.');
        }
      });
    } else {
      app.get('*', (_req, res) => {
        res.status(200).send('Server is running. Run npm run build to generate dist assets.');
      });
    }
  }

  const defaultPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isNginxPresent = fs.existsSync('/etc/nginx/nginx.conf');
  const targetPort = isNginxPresent ? 3000 : defaultPort;

  function startServer(port: number, attemptFallback = true) {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[Server] SMAN 1 Julok Server running on http://0.0.0.0:${port}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attemptFallback) {
        const fallbackPort = port === 3000 ? 8080 : 3000;
        console.warn(`[Server] Port ${port} is in use. Falling back to port ${fallbackPort}...`);
        startServer(fallbackPort, false);
      } else {
        console.error(`[Server] Error on port ${port}:`, err);
        process.exit(1);
      }
    });

    process.on('SIGTERM', () => {
      console.log('[Server] SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('[Server] HTTP server closed');
      });
    });
  }

  startServer(targetPort);
}

setupServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
