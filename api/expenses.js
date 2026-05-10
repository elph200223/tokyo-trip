import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT id, created_at, expense_date, merchant, amount_jpy, fx_rate, amount_twd,
           category, payment_method, card, note, confidence, items_summary, source
    FROM expenses
    ORDER BY expense_date DESC, id DESC
  `;
  return res.json({ expenses: rows });
}
