import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);
  const id = req.query?.id ? Number(req.query.id) : null;

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, created_at, expense_date, merchant, amount_jpy, fx_rate, amount_twd,
             category, payment_method, card, note, confidence, items_summary, source
      FROM expenses
      ORDER BY expense_date DESC, id DESC
    `;
    return res.json({ expenses: rows });
  }

  if (req.method === 'POST') {
    const { merchant, amount_jpy, expense_date, category, card, note, payment_method } = req.body || {};
    if (!merchant || !amount_jpy || !expense_date) return res.status(400).json({ error: 'missing required fields' });
    const fxRate = Number(process.env.JPY_TO_TWD_RATE) || 0.22;
    const jpy = Math.round(Number(amount_jpy));
    const twd = Math.round(jpy * fxRate);
    const [row] = await sql`
      INSERT INTO expenses
        (expense_date, merchant, amount_jpy, fx_rate, amount_twd, category, payment_method, card, note, source)
      VALUES
        (${expense_date}::date, ${merchant}, ${jpy}, ${fxRate}, ${twd},
         ${category || '其他'}, ${payment_method || ''}, ${card || 'shared'}, ${note || ''}, 'manual')
      RETURNING id
    `;
    return res.json({ ok: true, id: row.id });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'missing id' });
    const { merchant, amount_jpy, expense_date, category, card, note } = req.body || {};
    const [row] = await sql`SELECT fx_rate FROM expenses WHERE id = ${id}`;
    if (!row) return res.status(404).json({ error: 'not found' });
    const jpy = amount_jpy != null ? Math.round(Number(amount_jpy)) : null;
    const twd = jpy != null ? Math.round(jpy * Number(row.fx_rate)) : null;
    await sql`
      UPDATE expenses SET
        merchant     = COALESCE(${merchant ?? null}, merchant),
        amount_jpy   = COALESCE(${jpy}, amount_jpy),
        amount_twd   = COALESCE(${twd}, amount_twd),
        expense_date = COALESCE(${expense_date ?? null}::date, expense_date),
        category     = COALESCE(${category ?? null}, category),
        card         = COALESCE(${card ?? null}, card),
        note         = COALESCE(${note ?? null}, note)
      WHERE id = ${id}
    `;
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'missing id' });
    await sql`DELETE FROM expenses WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
