import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('card_a_name','card_b_name','card_shared_name')`;
    const out = { card_a_name: '卡片A', card_b_name: '卡片B', card_shared_name: '公共' };
    for (const row of rows) out[row.key] = row.value;
    return res.json(out);
  }

  if (req.method === 'PUT') {
    const allowed = ['card_a_name', 'card_b_name', 'card_shared_name'];
    for (const key of allowed) {
      const val = req.body?.[key];
      if (typeof val === 'string' && val.trim()) {
        await sql`
          INSERT INTO settings (key, value) VALUES (${key}, ${val.trim()})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `;
      }
    }
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
