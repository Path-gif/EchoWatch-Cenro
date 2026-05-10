const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer')
const db = require('../db');
const { sendServerError } = require('../utils/errors');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 5 },
})

const MUNICIPALITIES = [
  { name: 'Olongapo', code: 'OLO', latitude: 14.8386, longitude: 120.2842 },
  { name: 'Subic', code: 'SUB', latitude: 14.8799, longitude: 120.2312 },
  { name: 'San Marcelino', code: 'SM', latitude: 14.9742, longitude: 120.1579 },
  { name: 'San Antonio', code: 'SA', latitude: 14.9471, longitude: 120.0897 },
  { name: 'San Narciso', code: 'SN', latitude: 15.0167, longitude: 120.0833 },
  { name: 'San Felipe', code: 'SF', latitude: 15.0622, longitude: 120.0708 },
  { name: 'Cabangan', code: 'CAB', latitude: 15.1673, longitude: 120.0334 },
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function deriveMunicipality(latitude, longitude) {
  const numericLatitude = toNumber(latitude);
  const numericLongitude = toNumber(longitude);
  if (numericLatitude === null || numericLongitude === null) {
    return { name: 'Unspecified', code: 'UNS' };
  }
  const nearestMunicipality = MUNICIPALITIES.reduce((closest, municipality) => {
    const distanceKm = getDistanceKm(numericLatitude, numericLongitude, municipality.latitude, municipality.longitude);
    if (!closest || distanceKm < closest.distanceKm) {
      return { ...municipality, distanceKm };
    }
    return closest;
  }, null);
  return { name: nearestMunicipality?.name || 'Unspecified', code: nearestMunicipality?.code || 'UNS' };
}

async function ensureReportMediaColumns(client) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS report_media (
       id SERIAL PRIMARY KEY,
       report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
       file_path TEXT,
       file_url TEXT,
       mime_type TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     )`
  );

  await client.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_path TEXT');
  await client.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_url TEXT');
  await client.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_data BYTEA');
  await client.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS mime_type TEXT');
  await client.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)');
  await client.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_size INTEGER');
  await client.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS uploaded_by_user BOOLEAN DEFAULT false');
  await client.query('ALTER TABLE report_media ALTER COLUMN file_url DROP NOT NULL');
}

function requireUser(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');

    if (!payload?.sub || payload.role === 'admin') {
      return res.status(403).json({ error: 'Invalid user token' });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function normalizeViolationType(violationType) {
  return String(violationType || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveCategoryName(violationType) {
  const normalized = normalizeViolationType(violationType).toLowerCase();

  if (normalized.startsWith('illegal cutting')) return 'Illegal Cutting';
  if (normalized.startsWith('illegal occupation')) return 'Illegal Occupation';
  if (normalized.includes('wildlife')) return 'Wildlife Poaching';
  if (normalized.includes('mining')) return 'Mining Violation';
  if (normalized.includes('pollution')) return 'Pollution';
  if (normalized.includes('waste')) return 'Waste Dumping';

  return null;
}

async function generateReferenceNumber(client, municipalityCode) {
  const year = new Date().getFullYear();
  const prefix = `${municipalityCode}-${year}-`;

  const result = await client.query(
    `SELECT reference_number
     FROM reports
     WHERE reference_number LIKE $1
     ORDER BY id DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  const lastReference = result.rows[0]?.reference_number;
  const lastSequence = lastReference ? Number(lastReference.split('-').pop()) : 0;
  const nextSequence = String(lastSequence + 1).padStart(4, '0');

  return `${prefix}${nextSequence}`;
}

function uploadEvidence(req, res, next) {
  upload.array('media')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Evidence file is too large. Upload images smaller than 4 MB.' });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many evidence files. Upload up to 5 files only.' });
    }

    console.error('Evidence upload error:', error);
    return res.status(400).json({ error: 'Unable to upload evidence. Please try a smaller image.' });
  });
}

function parseDataUrl(value) {
  const match = /^data:([^;,]+)?;base64,(.+)$/i.exec(String(value || ''));
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1] || 'application/octet-stream',
    buffer: Buffer.from(match[2], 'base64'),
  };
}

router.post('/', requireUser, uploadEvidence, async (req, res) => {
  // when multipart/form-data is used, req.body fields are strings
  const {
    violation_type: rawViolationType,
    description,
    latitude: latitudeRaw,
    longitude: longitudeRaw,
    location_manual,
    manual_location,
    is_anonymous,
  } = req.body;

  const latitude = latitudeRaw != null && latitudeRaw !== '' ? Number(latitudeRaw) : null
  const longitude = longitudeRaw != null && longitudeRaw !== '' ? Number(longitudeRaw) : null

  const violationType = normalizeViolationType(rawViolationType);
  const trimmedDescription = String(description || '').trim();
  const manualLocation = String(location_manual || manual_location || '').trim();
  const hasCoordinates = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;

  if (!violationType || !trimmedDescription) {
    return res.status(400).json({ error: 'violation_type and description are required' });
  }

  if (!hasCoordinates && !manualLocation) {
    return res.status(400).json({ error: 'Location is required' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const categoryName = deriveCategoryName(violationType);
    let categoryId = null;

    if (categoryName) {
      const categoryResult = await client.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [categoryName]
      );
      categoryId = categoryResult.rows[0]?.id || null;
    }

    const municipality = deriveMunicipality(latitude, longitude);
    const referenceNumber = await generateReferenceNumber(client, municipality.code);

      const insertResult = await client.query(
        `INSERT INTO reports (
         reference_number,
         user_id,
         category_id,
         violation_type,
         description,
         latitude,
         longitude,
         manual_location,
         is_anonymous,
         status,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', NOW(), NOW())
       RETURNING id, reference_number, status, created_at`,
      [
        referenceNumber,
        req.user.sub,
        categoryId,
        violationType,
        trimmedDescription,
        hasCoordinates ? latitude : null,
        hasCoordinates ? longitude : null,
        manualLocation || null,
        ['1', 'true', 'yes', 'on'].includes(String(is_anonymous).toLowerCase()),
      ]
      );

    // save uploaded media records if any
    if (req.files && req.files.length) {
      await ensureReportMediaColumns(client);

      const insertMediaText = `
        INSERT INTO report_media (report_id, file_path, file_url, file_data, file_name, file_size, mime_type, uploaded_by_user)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      `;
      for (const f of req.files) {
        await client.query(insertMediaText, [
          insertResult.rows[0].id,
          null,
          null,
          f.buffer,
          f.originalname,
          f.size,
          f.mimetype,
        ])
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ ok: true, ...insertResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create report error:', error);
    return sendServerError(res, 'Failed to create report', error);
  } finally {
    client.release();
  }
});

router.get('/media/:id', async (req, res) => {
  try {
    const mediaId = Number(req.params.id);
    if (!Number.isFinite(mediaId)) {
      return res.status(400).send('Invalid media id');
    }

    const result = await db.query(
      `SELECT file_data, file_url, file_name, mime_type
       FROM report_media
       WHERE id = $1
       LIMIT 1`,
      [mediaId]
    );

    const media = result.rows[0];
    if (!media) {
      return res.status(404).send('Media not found');
    }

    if (media.file_data) {
      res.setHeader('Content-Type', media.mime_type || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', `inline; filename="${String(media.file_name || 'evidence').replace(/"/g, '')}"`);
      return res.send(media.file_data);
    }

    const parsedDataUrl = parseDataUrl(media.file_url);
    if (parsedDataUrl) {
      res.setHeader('Content-Type', media.mime_type || parsedDataUrl.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', `inline; filename="${String(media.file_name || 'evidence').replace(/"/g, '')}"`);
      return res.send(parsedDataUrl.buffer);
    }

    if (media.file_url) {
      return res.redirect(media.file_url);
    }

    return res.status(404).send('Media file unavailable');
  } catch (error) {
    console.error('Fetch media error:', error);
    return res.status(500).send('Failed to fetch media');
  }
});

router.get('/', requireUser, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id,
         reference_number,
         violation_type,
         description,
         latitude,
         longitude,
         manual_location,
         status,
         is_anonymous,
         created_at,
         updated_at
       FROM reports
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.sub]
    );

    return res.json({ ok: true, reports: result.rows });
  } catch (error) {
    console.error('Fetch reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/notifications', requireUser, async (req, res) => {
  try {
    await db.query(
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

    const result = await db.query(
      `SELECT
         r.id,
         r.reference_number,
         r.violation_type,
         r.status,
         r.resolution_date,
         r.resolution_notes,
         r.updated_at,
         r.created_at,
         latest_activity.activity_type,
         latest_activity.notes AS activity_notes,
         latest_activity.created_at AS activity_created_at
       FROM reports r
       LEFT JOIN LATERAL (
         SELECT activity_type, notes, created_at
         FROM report_activities
         WHERE report_id = r.id
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       ) latest_activity ON true
       WHERE r.user_id = $1
         AND LOWER(r.status) IN ('resolved', 'completed', 'done', 'closed')
       ORDER BY COALESCE(r.resolution_date, latest_activity.created_at, r.updated_at, r.created_at) DESC`,
      [req.user.sub]
    );

    const notifications = result.rows.map((row) => ({
      id: `report-${row.id}-${row.status}`,
      report_id: row.id,
      reference_number: row.reference_number,
      title: 'Report activity completed',
      message: `${row.reference_number} has been marked ${String(row.status || '').replaceAll('_', ' ')}.`,
      violation_type: row.violation_type,
      status: row.status,
      notes: row.resolution_notes || row.activity_notes || null,
      created_at: row.resolution_date || row.activity_created_at || row.updated_at || row.created_at,
    }));

    return res.json({ ok: true, notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

module.exports = router;
