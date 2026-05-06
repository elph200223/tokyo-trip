import { neon } from '@neondatabase/serverless';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-sync-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const raw = (req.headers['x-sync-token'] || '').trim();
  const token = raw.replace(/[^a-zA-Z0-9_-]/g, '');
  if (token.length < 6) return res.status(401).json({ error: 'invalid token' });

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    const rows = await sql`SELECT data FROM trip_data WHERE token = ${token}`;
    return res.json({ data: rows[0]?.data ?? null });
  }

  if (req.method === 'POST') {
    await sql`
      INSERT INTO trip_data (token, data, updated_at)
      VALUES (${token}, ${JSON.stringify(req.body)}::jsonb, NOW())
      ON CONFLICT (token) DO UPDATE
        SET data = EXCLUDED.data, updated_at = NOW()
    `;
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
