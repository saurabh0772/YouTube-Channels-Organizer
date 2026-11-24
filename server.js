import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8788;
const AUTH_PASSCODE = (process.env.AUTH_PASSCODE || 'admin123').trim();
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '';
const CF_DATABASE_ID = process.env.CF_DATABASE_ID || '';
const CF_API_TOKEN = process.env.CF_API_TOKEN || '';

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ========================================================
// Database Layer: Cloudflare D1 Remote REST API or Fallback
// ========================================================
const isCloudflareConfigured = Boolean(CF_ACCOUNT_ID && CF_DATABASE_ID && CF_API_TOKEN);

console.log(
  `[Database] Mode: ${
    isCloudflareConfigured ? 'Remote Cloudflare D1 REST API' : 'Local In-Memory / File SQLite Mode'
  }`
);

// Memory fallback store if CF credentials not supplied
let memChannels = [
  { id: 'ch_toon_rivora', name: 'Toon Rivora', next_video_number: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ch_techno_slayer', name: 'Techno Slayer', next_video_number: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ch_rule_breaker', name: 'Rule Breaker', next_video_number: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ch_ssc_vertex', name: 'SSC Vertex', next_video_number: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];
let memVideos = [];
let memSessions = new Map();
let memRateLimits = new Map();

async function queryD1(sql, params = []) {
  if (isCloudflareConfigured) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DATABASE_ID}/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('Cloudflare D1 REST query error:', data);
      throw new Error(data.errors?.[0]?.message || 'Cloudflare D1 Query failed');
    }
    return data.result?.[0]?.results || [];
  }
  return null;
}

// Ensure remote D1 schema if connected
async function initRemoteD1() {
  if (!isCloudflareConfigured) return;
  try {
    const initSql = `
      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE,
        next_video_number INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        video_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        video_drive_url TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '',
        thumbnail_drive_url TEXT NOT NULL DEFAULT '',
        upload_status TEXT NOT NULL DEFAULT 'Draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
        UNIQUE(channel_id, video_number)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT NOT NULL,
        locked_until TEXT
      );
      INSERT OR IGNORE INTO channels (id, name, next_video_number, created_at, updated_at) VALUES 
        ('ch_toon_rivora', 'Toon Rivora', 1, datetime('now'), datetime('now')),
        ('ch_techno_slayer', 'Techno Slayer', 1, datetime('now'), datetime('now')),
        ('ch_rule_breaker', 'Rule Breaker', 1, datetime('now'), datetime('now')),
        ('ch_ssc_vertex', 'SSC Vertex', 1, datetime('now'), datetime('now'));
    `;
    await queryD1(initSql);
    console.log('[Database] Remote Cloudflare D1 tables initialized successfully');
  } catch (err) {
    console.warn('[Database] Remote D1 schema check warning:', err.message);
  }
}
initRemoteD1();

// ========================================================
// Helper Utilities
// ========================================================
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Authentication Middleware
async function authMiddleware(req, res, next) {
  const token = req.cookies.hq_session;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No session' });
  }

  const tokenHash = sha256(token);

  if (isCloudflareConfigured) {
    try {
      const results = await queryD1(
        'SELECT token_hash, expires_at, revoked_at FROM sessions WHERE token_hash = ? AND revoked_at IS NULL',
        [tokenHash]
      );
      if (!results || results.length === 0) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Session not found' });
      }
      const session = results[0];
      if (new Date(session.expires_at).getTime() <= Date.now()) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Session expired' });
      }
      return next();
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Auth check error' });
    }
  } else {
    const session = memSessions.get(tokenHash);
    if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid session' });
    }
    return next();
  }
}

// ========================================================
// API Routes
// ========================================================

// 1. Session Check
app.get('/api/auth/session', async (req, res) => {
  const token = req.cookies.hq_session;
  const isDefaultPasscode = AUTH_PASSCODE === 'admin123';
  if (!token) {
    return res.json({ authenticated: false, configured: true, isDefaultPasscode });
  }

  const tokenHash = sha256(token);
  if (isCloudflareConfigured) {
    try {
      const results = await queryD1(
        'SELECT token_hash, expires_at FROM sessions WHERE token_hash = ? AND revoked_at IS NULL',
        [tokenHash]
      );
      if (results && results.length > 0 && new Date(results[0].expires_at).getTime() > Date.now()) {
        return res.json({ authenticated: true, configured: true, isDefaultPasscode });
      }
    } catch {}
  } else {
    const session = memSessions.get(tokenHash);
    if (session && !session.revoked_at && new Date(session.expires_at).getTime() > Date.now()) {
      return res.json({ authenticated: true, configured: true, isDefaultPasscode });
    }
  }

  return res.json({ authenticated: false, configured: true, isDefaultPasscode });
});

// 2. Unlock with Passcode
app.post('/api/auth/unlock', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const enteredPasscode = (req.body.passcode || '').trim();

  // Rate limiting check
  const now = Date.now();
  const limit = memRateLimits.get(ip) || { attempts: 0, lockedUntil: 0 };
  if (limit.lockedUntil > now) {
    const waitMins = Math.ceil((limit.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      error: `Too many failed attempts. Device locked for ${waitMins} minute(s).`,
    });
  }

  if (!constantTimeEqual(enteredPasscode, AUTH_PASSCODE)) {
    limit.attempts += 1;
    if (limit.attempts >= 5) {
      limit.lockedUntil = now + 15 * 60000;
      memRateLimits.set(ip, limit);
      return res.status(429).json({
        success: false,
        error: 'Incorrect passcode. Too many failed attempts. Device locked for 15 minutes.',
      });
    }
    memRateLimits.set(ip, limit);
    return res.status(401).json({ success: false, error: 'Incorrect passcode. Please try again.' });
  }

  // Reset rate limits on success
  memRateLimits.delete(ip);

  // Generate session token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

  if (isCloudflareConfigured) {
    try {
      await queryD1('INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)', [
        tokenHash,
        new Date().toISOString(),
        expiresAt,
      ]);
    } catch (err) {
      console.error('Remote session insert error:', err);
    }
  } else {
    memSessions.set(tokenHash, {
      token_hash: tokenHash,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      revoked_at: null,
    });
  }

  res.cookie('hq_session', rawToken, {
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.json({ success: true, message: 'Device authorized', expiresAt });
});

// 3. Logout
app.post('/api/auth/logout', async (req, res) => {
  const token = req.cookies.hq_session;
  if (token) {
    const tokenHash = sha256(token);
    if (isCloudflareConfigured) {
      try {
        await queryD1('UPDATE sessions SET revoked_at = datetime("now") WHERE token_hash = ?', [tokenHash]);
      } catch {}
    } else {
      const s = memSessions.get(tokenHash);
      if (s) s.revoked_at = new Date().toISOString();
    }
  }
  res.clearCookie('hq_session', { path: '/' });
  return res.json({ success: true, message: 'Logged out successfully' });
});

// 4. Channels CRUD
app.get('/api/channels', authMiddleware, async (req, res) => {
  if (isCloudflareConfigured) {
    try {
      const results = await queryD1(`
        SELECT c.*, COUNT(v.id) AS video_count 
        FROM channels c 
        LEFT JOIN videos v ON c.id = v.channel_id 
        GROUP BY c.id 
        ORDER BY c.created_at ASC
      `);
      return res.json({ success: true, channels: results || [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
  const list = memChannels.map(c => ({
    ...c,
    video_count: memVideos.filter(v => v.channel_id === c.id).length,
  }));
  return res.json({ success: true, channels: list });
});

app.post('/api/channels', authMiddleware, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ success: false, error: 'Channel name required' });
  const id = `ch_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  if (isCloudflareConfigured) {
    try {
      await queryD1(
        'INSERT INTO channels (id, name, next_video_number, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
        [id, name, now, now]
      );
      return res.status(201).json({ success: true, channel: { id, name, next_video_number: 1, created_at: now, updated_at: now, video_count: 0 } });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const channel = { id, name, next_video_number: 1, created_at: now, updated_at: now, video_count: 0 };
  memChannels.push(channel);
  return res.status(201).json({ success: true, channel });
});

app.patch('/api/channels/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ success: false, error: 'Channel name required' });
  const now = new Date().toISOString();

  if (isCloudflareConfigured) {
    try {
      await queryD1('UPDATE channels SET name = ?, updated_at = ? WHERE id = ?', [name, now, id]);
      const ch = await queryD1('SELECT * FROM channels WHERE id = ?', [id]);
      return res.json({ success: true, channel: ch[0] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const ch = memChannels.find(c => c.id === id);
  if (!ch) return res.status(404).json({ success: false, error: 'Channel not found' });
  ch.name = name;
  ch.updated_at = now;
  return res.json({ success: true, channel: ch });
});

app.delete('/api/channels/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  if (isCloudflareConfigured) {
    try {
      await queryD1('DELETE FROM videos WHERE channel_id = ?', [id]);
      await queryD1('DELETE FROM channels WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Channel deleted' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  memVideos = memVideos.filter(v => v.channel_id !== id);
  memChannels = memChannels.filter(c => c.id !== id);
  return res.json({ success: true, message: 'Channel deleted' });
});

// 5. Videos CRUD
app.get('/api/channels/:id/videos', authMiddleware, async (req, res) => {
  const channelId = req.params.id;
  const search = (req.query.search || '').trim().toLowerCase();
  const sort = req.query.sort || 'newest';

  if (isCloudflareConfigured) {
    try {
      const ch = await queryD1('SELECT * FROM channels WHERE id = ?', [channelId]);
      if (!ch || ch.length === 0) return res.status(404).json({ success: false, error: 'Channel not found' });

      let orderBy = 'created_at DESC';
      if (sort === 'oldest') orderBy = 'created_at ASC';
      else if (sort === 'updated') orderBy = 'updated_at DESC';
      else if (sort === 'number_desc') orderBy = 'video_number DESC';
      else if (sort === 'number_asc') orderBy = 'video_number ASC';

      let query = `SELECT * FROM videos WHERE channel_id = ? ORDER BY ${orderBy}`;
      let params = [channelId];

      if (search) {
        const pattern = `%${search}%`;
        query = `SELECT * FROM videos WHERE channel_id = ? AND (name LIKE ? OR title LIKE ? OR CAST(video_number AS TEXT) LIKE ? OR tags LIKE ?) ORDER BY ${orderBy}`;
        params = [channelId, pattern, pattern, pattern, pattern];
      }

      const results = await queryD1(query, params);
      return res.json({ success: true, channel: ch[0], videos: results || [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const ch = memChannels.find(c => c.id === channelId);
  if (!ch) return res.status(404).json({ success: false, error: 'Channel not found' });

  let vList = memVideos.filter(v => v.channel_id === channelId);
  if (search) {
    vList = vList.filter(v =>
      v.name.toLowerCase().includes(search) ||
      v.title.toLowerCase().includes(search) ||
      String(v.video_number).includes(search)
    );
  }

  vList.sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sort === 'updated') return new Date(b.updated_at) - new Date(a.updated_at);
    if (sort === 'number_desc') return b.video_number - a.video_number;
    if (sort === 'number_asc') return a.video_number - b.video_number;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return res.json({ success: true, channel: ch, videos: vList });
});

app.post('/api/channels/:id/videos', authMiddleware, async (req, res) => {
  const channelId = req.params.id;
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ success: false, error: 'Video name is required' });

  const now = new Date().toISOString();
  const videoId = `vid_${crypto.randomUUID()}`;

  if (isCloudflareConfigured) {
    try {
      const chResults = await queryD1('SELECT id, next_video_number FROM channels WHERE id = ?', [channelId]);
      if (!chResults || chResults.length === 0) return res.status(404).json({ success: false, error: 'Channel not found' });
      const assignedNumber = chResults[0].next_video_number || 1;

      await queryD1(`
        INSERT INTO videos (
          id, channel_id, video_number, name, video_drive_url, 
          title, description, tags, thumbnail_drive_url, upload_status, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        videoId, channelId, assignedNumber, name,
        req.body.video_drive_url || '', req.body.title || '', req.body.description || '',
        req.body.tags || '', req.body.thumbnail_drive_url || '', req.body.upload_status || 'Draft',
        now, now
      ]);

      await queryD1('UPDATE channels SET next_video_number = next_video_number + 1, updated_at = ? WHERE id = ?', [now, channelId]);

      const created = {
        id: videoId, channel_id: channelId, video_number: assignedNumber, name,
        video_drive_url: req.body.video_drive_url || '', title: req.body.title || '',
        description: req.body.description || '', tags: req.body.tags || '',
        thumbnail_drive_url: req.body.thumbnail_drive_url || '', upload_status: req.body.upload_status || 'Draft',
        created_at: now, updated_at: now
      };
      return res.status(201).json({ success: true, video: created });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const ch = memChannels.find(c => c.id === channelId);
  if (!ch) return res.status(404).json({ success: false, error: 'Channel not found' });
  const assignedNumber = ch.next_video_number || 1;
  ch.next_video_number = assignedNumber + 1;
  ch.updated_at = now;

  const video = {
    id: videoId, channel_id: channelId, video_number: assignedNumber, name,
    video_drive_url: req.body.video_drive_url || '', title: req.body.title || '',
    description: req.body.description || '', tags: req.body.tags || '',
    thumbnail_drive_url: req.body.thumbnail_drive_url || '', upload_status: req.body.upload_status || 'Draft',
    created_at: now, updated_at: now
  };
  memVideos.push(video);
  return res.status(201).json({ success: true, video });
});

app.patch('/api/videos/:id', authMiddleware, async (req, res) => {
  const videoId = req.params.id;
  const now = new Date().toISOString();

  if (isCloudflareConfigured) {
    try {
      const existing = await queryD1('SELECT * FROM videos WHERE id = ?', [videoId]);
      if (!existing || existing.length === 0) return res.status(404).json({ success: false, error: 'Video not found' });
      const current = existing[0];

      await queryD1(`
        UPDATE videos SET 
          name = ?, video_drive_url = ?, title = ?, description = ?, 
          tags = ?, thumbnail_drive_url = ?, upload_status = ?, updated_at = ?
        WHERE id = ?
      `, [
        req.body.name !== undefined ? req.body.name.trim() : current.name,
        req.body.video_drive_url !== undefined ? req.body.video_drive_url.trim() : current.video_drive_url,
        req.body.title !== undefined ? req.body.title.trim() : current.title,
        req.body.description !== undefined ? req.body.description : current.description,
        req.body.tags !== undefined ? req.body.tags.trim() : current.tags,
        req.body.thumbnail_drive_url !== undefined ? req.body.thumbnail_drive_url.trim() : current.thumbnail_drive_url,
        req.body.upload_status !== undefined ? req.body.upload_status : current.upload_status,
        now, videoId
      ]);

      const updated = await queryD1('SELECT * FROM videos WHERE id = ?', [videoId]);
      return res.json({ success: true, video: updated[0] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const v = memVideos.find(item => item.id === videoId);
  if (!v) return res.status(404).json({ success: false, error: 'Video not found' });

  if (req.body.name !== undefined) v.name = req.body.name.trim();
  if (req.body.video_drive_url !== undefined) v.video_drive_url = req.body.video_drive_url.trim();
  if (req.body.title !== undefined) v.title = req.body.title.trim();
  if (req.body.description !== undefined) v.description = req.body.description;
  if (req.body.tags !== undefined) v.tags = req.body.tags.trim();
  if (req.body.thumbnail_drive_url !== undefined) v.thumbnail_drive_url = req.body.thumbnail_drive_url.trim();
  if (req.body.upload_status !== undefined) v.upload_status = req.body.upload_status;
  v.updated_at = now;

  return res.json({ success: true, video: v });
});

app.delete('/api/videos/:id', authMiddleware, async (req, res) => {
  const videoId = req.params.id;
  if (isCloudflareConfigured) {
    try {
      await queryD1('DELETE FROM videos WHERE id = ?', [videoId]);
      return res.json({ success: true, message: 'Video deleted' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  memVideos = memVideos.filter(v => v.id !== videoId);
  return res.json({ success: true, message: 'Video deleted' });
});

// 6. Export Backup
app.get('/api/export', authMiddleware, async (req, res) => {
  if (isCloudflareConfigured) {
    try {
      const channels = await queryD1('SELECT * FROM channels ORDER BY created_at ASC');
      const videos = await queryD1('SELECT * FROM videos ORDER BY channel_id ASC, video_number ASC');
      return res.json({
        success: true,
        backup: {
          app: 'YouTube Content HQ',
          version: 1,
          exported_at: new Date().toISOString(),
          channels: channels || [],
          videos: videos || [],
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.json({
    success: true,
    backup: {
      app: 'YouTube Content HQ',
      version: 1,
      exported_at: new Date().toISOString(),
      channels: memChannels,
      videos: memVideos,
    },
  });
});

// 7. Import Backup
app.post('/api/import', authMiddleware, async (req, res) => {
  const { mode, backupData } = req.body;
  if (!backupData || !Array.isArray(backupData.channels) || !Array.isArray(backupData.videos)) {
    return res.status(400).json({ success: false, error: 'Invalid backup structure' });
  }

  if (isCloudflareConfigured) {
    try {
      if (mode === 'replace') {
        await queryD1('DELETE FROM videos');
        await queryD1('DELETE FROM channels');
      }

      for (const ch of backupData.channels) {
        await queryD1(
          'INSERT INTO channels (id, name, next_video_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name',
          [ch.id, ch.name, ch.next_video_number || 1, ch.created_at, ch.updated_at]
        );
      }

      for (const vid of backupData.videos) {
        await queryD1(`
          INSERT INTO videos (
            id, channel_id, video_number, name, video_drive_url,
            title, description, tags, thumbnail_drive_url, upload_status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, video_drive_url = excluded.video_drive_url,
            title = excluded.title, description = excluded.description,
            tags = excluded.tags, thumbnail_drive_url = excluded.thumbnail_drive_url,
            upload_status = excluded.upload_status
        `, [
          vid.id, vid.channel_id, vid.video_number, vid.name,
          vid.video_drive_url || '', vid.title || '', vid.description || '',
          vid.tags || '', vid.thumbnail_drive_url || '', vid.upload_status || 'Draft',
          vid.created_at, vid.updated_at
        ]);
      }

      return res.json({
        success: true,
        message: `Successfully imported ${backupData.channels.length} channels and ${backupData.videos.length} videos.`,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (mode === 'replace') {
    memChannels = [...backupData.channels];
    memVideos = [...backupData.videos];
  } else {
    for (const ch of backupData.channels) {
      const idx = memChannels.findIndex(c => c.id === ch.id);
      if (idx >= 0) memChannels[idx] = ch;
      else memChannels.push(ch);
    }
    for (const vid of backupData.videos) {
      const idx = memVideos.findIndex(v => v.id === vid.id);
      if (idx >= 0) memVideos[idx] = vid;
      else memVideos.push(vid);
    }
  }

  return res.json({
    success: true,
    message: `Successfully imported ${backupData.channels.length} channels and ${backupData.videos.length} videos.`,
  });
});

// ========================================================
// Serve Production Frontend Build from dist/
// ========================================================
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 YouTube Content HQ is running on http://0.0.0.0:${PORT}`);
});
