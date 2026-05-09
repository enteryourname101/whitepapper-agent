require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { runAgent } = require('./agent');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Main endpoint: generate whitepaper ───────────────────────
app.post('/generate', async (req, res) => {
  const { topic, walletId } = req.body;

  if (!topic || typeof topic !== 'string' || topic.trim().length < 5) {
    return res.status(400).json({ error: 'Téma je příliš krátké nebo chybí.' });
  }

  // Stream progress events back to the client (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await runAgent(topic.trim(), walletId, send);
    send('done', { success: true, ...result });
  } catch (err) {
    console.error('[agent] error:', err.message);
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`✓ whitepapper-agent listening on port ${PORT}`);
});
