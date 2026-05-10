const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const MUNICIPALITIES = [
  { name: 'Olongapo', latitude: 14.8386, longitude: 120.2842 },
  { name: 'Subic', latitude: 14.8799, longitude: 120.2312 },
  { name: 'San Marcelino', latitude: 14.9742, longitude: 120.1579 },
  { name: 'San Antonio', latitude: 14.9471, longitude: 120.0897 },
  { name: 'San Narciso', latitude: 15.0167, longitude: 120.0833 },
  { name: 'San Felipe', latitude: 15.0622, longitude: 120.0708 },
  { name: 'Cabangan', latitude: 15.1673, longitude: 120.0334 },
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLocation(value) {
  return String(value || '').trim().toLowerCase();
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deriveMunicipality({ manual_location: manualLocation, latitude, longitude }) {
  const normalizedLocation = normalizeLocation(manualLocation);
  const textMatch = MUNICIPALITIES.find((municipality) => normalizedLocation.includes(municipality.name.toLowerCase()));

  if (textMatch) {
    return textMatch.name;
  }

  const numericLatitude = toNumber(latitude);
  const numericLongitude = toNumber(longitude);

  if (numericLatitude === null || numericLongitude === null) {
    return 'Unspecified';
  }

  const nearestMunicipality = MUNICIPALITIES.reduce((closest, municipality) => {
    const distanceKm = getDistanceKm(
      numericLatitude,
      numericLongitude,
      municipality.latitude,
      municipality.longitude
    );

    if (!closest || distanceKm < closest.distanceKm) {
      return { name: municipality.name, distanceKm };
    }

    return closest;
  }, null);

  return nearestMunicipality?.name || 'Unspecified';
}

function getPublicMediaUrl(req, media) {
  if (media.file_data) {
    return `${req.protocol}://${req.get('host')}/reports/media/${media.id}`;
  }

  if (media.file_url && media.file_url.startsWith('data:')) {
    return `${req.protocol}://${req.get('host')}/reports/media/${media.id}`;
  }

  if (media.file_url) {
    return media.file_url;
  }

  if (!media.file_path) {
    return null;
  }

  const filename = path.basename(media.file_path);
  return `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(filename)}`;
}

async function deleteReportChildren(client, tableName, reportId) {
  const table = await client.query('SELECT to_regclass($1) AS name', [tableName]);
  if (!table.rows[0]?.name) {
    return;
  }

  await client.query(`DELETE FROM ${tableName} WHERE report_id = $1`, [reportId]);
}

// Admin login with email/password
router.post('/login', async (req, res) => {
  const identifier = String(req.body?.username || req.body?.email || '').trim();
  const { password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'email/name and password required' });
  try {
    console.log('Admin login attempt identifier=', identifier)
    console.log('Admin login request body:', req.body);
    // allow admin to sign in using email or display name (case-insensitive)
    const q = await db.query(
      `SELECT id, email, password_hash, name, is_active FROM admin_users
       WHERE LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1`,
      [identifier]
    );
    console.log('Admin login query returned rows=', q.rows.length)
    if (q.rows.length === 0) return res.status(401).json({ error: 'invalid_credentials' });
    const row = q.rows[0];
    if (row.is_active === false) return res.status(403).json({ error: 'account_inactive' });
    console.log('password type:', typeof password, 'len:', password ? password.length : 0);
    try {
      console.log('password hex:', password ? Buffer.from(String(password)).toString('hex') : '');
    } catch (e) {
      console.log('password hex error', e.message);
    }
    try {
      console.log('hash hex:', Buffer.from(String(row.password_hash)).toString('hex'));
    } catch (e) {
      console.log('hash hex error', e.message);
    }
    // Temporary bypass for debugging: allow plain match to confirm flow
    let ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok && password === 'Admin_DENR') {
      console.log('Debug bypass: accepting plain password match');
      ok = true;
    }
    console.log('bcrypt compare result=', ok, 'hash_len=', String(row.password_hash || '').length);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const token = jwt.sign(
      { sub: row.id, role: 'admin', email: row.email, name: row.name },
      process.env.JWT_SECRET || 'change_me',
      { expiresIn: '30d' }
    );
    return res.json({ ok: true, token, admin: { id: row.id, email: row.email, name: row.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// middleware to protect admin endpoints
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'unauthorized' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    if (payload.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// Return categories with counts (image, name, count)
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const q = await db.query(
      `SELECT c.id, c.name, c.image_url, COUNT(r.id) AS report_count
       FROM categories c
       LEFT JOIN reports r ON r.category_id = c.id
       GROUP BY c.id, c.name, c.image_url
       ORDER BY c.name`);
    return res.json({ ok: true, categories: q.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/reports/overview', requireAdmin, async (req, res) => {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS report_media (
         id SERIAL PRIMARY KEY,
         report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
         file_path TEXT,
         file_url TEXT,
         file_data BYTEA,
         mime_type TEXT,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       )`
    );
    await db.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_data BYTEA');

    const result = await db.query(
      `SELECT
         r.id,
         r.reference_number,
         r.violation_type,
         r.latitude,
         r.longitude,
         r.manual_location,
         r.status,
         r.created_at,
         r.description,
         u.full_name,
         u.phone
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    );

    const mediaResult = await db.query(
      `SELECT id, report_id, file_path, file_url, file_data, mime_type, created_at
       FROM report_media
       ORDER BY created_at ASC, id ASC`
    );

    const mediaByReport = mediaResult.rows.reduce((groups, media) => {
      const url = getPublicMediaUrl(req, media);
      if (!url) {
        return groups;
      }

      if (!groups[media.report_id]) {
        groups[media.report_id] = [];
      }

      groups[media.report_id].push({
        id: media.id,
        url,
        mime_type: media.mime_type || null,
        is_image: String(media.mime_type || '').startsWith('image/'),
      });

      return groups;
    }, {});

    const reports = result.rows.map((row) => {
      const municipality = deriveMunicipality({ manual_location: row.manual_location, latitude: row.latitude, longitude: row.longitude });

      return {
        id: row.id,
        reference_number: row.reference_number,
        violation_type: row.violation_type,
        municipality,
        latitude: toNumber(row.latitude),
        longitude: toNumber(row.longitude),
        manual_location: row.manual_location,
        status: row.status,
        created_at: row.created_at,
        description: row.description || null,
        submitter_name: row.full_name || null,
        phone: row.phone || null,
        evidence_media: mediaByReport[row.id] || [],
      };
    });

    const municipalityCounts = MUNICIPALITIES.map((municipality) => ({
      municipality: municipality.name,
      count: reports.filter((report) => report.municipality === municipality.name).length,
    }));

    const highestCount = municipalityCounts.reduce((max, entry) => Math.max(max, entry.count), 0);
    const topMunicipality = municipalityCounts.find((entry) => entry.count === highestCount && highestCount > 0)?.municipality || null;

    return res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      top_municipality: topMunicipality,
      municipality_counts: municipalityCounts,
      reports,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.delete('/reports/:id', requireAdmin, async (req, res) => {
  const client = await db.pool.connect();

  try {
    const reportId = parseInt(req.params.id, 10);
    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    await client.query('BEGIN');

    await deleteReportChildren(client, 'report_media', reportId);
    await deleteReportChildren(client, 'report_activities', reportId);

    const result = await client.query('DELETE FROM reports WHERE id = $1 RETURNING id', [reportId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Report deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

router.patch('/reports/:id/status', requireAdmin, async (req, res) => {
  const client = await db.pool.connect();

  try {
    const reportId = parseInt(req.params.id, 10);
    const status = String(req.body?.status || '').trim().toLowerCase();
    const notes = String(req.body?.notes || '').trim();

    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    if (!['resolved', 'completed', 'done', 'closed', 'in_review', 'submitted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status' });
    }

    await client.query('BEGIN');

    await client.query(
      `CREATE TABLE IF NOT EXISTS report_activities (
         id SERIAL PRIMARY KEY,
         report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
         admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
         activity_type VARCHAR(50),
         old_status VARCHAR(50),
         new_status VARCHAR(50),
         notes TEXT,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
       )`
    );

    const currentReport = await client.query('SELECT id, status FROM reports WHERE id = $1 FOR UPDATE', [reportId]);

    if (currentReport.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    const oldStatus = currentReport.rows[0].status;
    const resolvedAt = ['resolved', 'completed', 'done', 'closed'].includes(status) ? 'NOW()' : 'NULL';

    const updateResult = await client.query(
      `UPDATE reports
       SET status = $1,
           resolution_date = ${resolvedAt},
           resolution_notes = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, status, resolution_date, resolution_notes, updated_at`,
      [status, notes || null, reportId]
    );

    await client.query(
      `INSERT INTO report_activities (report_id, admin_id, activity_type, old_status, new_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reportId, req.admin.sub, 'status_update', oldStatus, status, notes || null]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, report: updateResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

module.exports = router;
