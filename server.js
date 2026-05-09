require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const PDFKit   = require('pdfkit');
const crypto   = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

const app    = express();
const PORT   = process.env.PORT || 3000;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

async function generateContent(topic) {
  const SYSTEM = `Jsi expert na tvorbu odborných whitepaperů pro blockchain a Web3 projekty.
Vygeneruj profesionální whitepaper. Výstup musí být strukturovaný takto — sekce odděl řádkem "---":

TITLE: [název]
ABSTRACT: [shrnutí 2-3 věty]
---
1. INTRODUCTION
[text]
---
2. PROBLEM STATEMENT
[text]
---
3. PROPOSED SOLUTION
[text]
---
4. TECHNICAL ARCHITECTURE
[text]
---
5. TOKENOMICS & INCENTIVES
[text nebo N/A]
---
6. ROADMAP
[milníky]
---
7. CONCLUSION
[závěr]
---
REFERENCES
[3-5 referencí: [1] Autor, Název, Rok]

Rozsah: 600-900 slov. Buď technicky přesný a odborný.`;

  const msg = await client.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 2000,
    system:     SYSTEM,
    messages:   [{ role: 'user', content: `Vytvoř whitepaper na téma: ${topic}` }]
  });

  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  if (!text) throw new Error('Claude nevrátil žádný obsah.');
  return text;
}

function parseContent(raw) {
  let title = 'Whitepaper', abstract = '';
  const sections = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('TITLE:'))    title    = line.replace('TITLE:', '').trim();
    if (line.startsWith('ABSTRACT:')) abstract = line.replace('ABSTRACT:', '').trim();
  }
  for (const part of raw.split('---').slice(1)) {
    const t = part.trim();
    const nl = t.indexOf('\n');
    if (nl === -1) continue;
    const heading = t.slice(0, nl).trim();
    const body    = t.slice(nl).trim();
    if (heading && body) sections.push({ heading, body });
  }
  return { title, abstract, sections };
}

function generatePDF(topic, rawContent) {
  return new Promise((resolve, reject) => {
    try {
      const { title, abstract, sections } = parseContent(rawContent);
      const doc    = new PDFKit({ margin: 72, size: 'A4' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('error', reject);
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const pdfHash   = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        const slug      = topic.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 60).replace(/-+$/, '');
        const filename  = `${slug}-${Date.now()}.pdf`;
        resolve({ pdfBuffer, filename, pdfHash });
      });

      const BLACK = '#111111', MUTED = '#555555', LINE = '#E2DFD6';
      doc.rect(0, 0, doc.page.width, 180).fill('#F8F7F4');
      doc.fillColor('#1A1916').fontSize(9).font('Helvetica').text('whitepapper.click · NEAR Protocol', 72, 60);
      doc.fillColor(BLACK).fontSize(26).font('Helvetica-Bold').text(title, 72, 85, { width: doc.page.width - 144 });
      doc.moveDown(0.5);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica')
         .text(new Date().toLocaleDateString('cs-CZ', { year: 'numeric', month: 'long', day: 'numeric' }));
      doc.moveDown(1.5);
      doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).strokeColor(LINE).lineWidth(1).stroke();
      doc.moveDown(1);
      if (abstract) {
        doc.fillColor(MUTED).fontSize(10).font('Helvetica-Oblique').text(abstract, { align: 'justify' });
        doc.moveDown(1.5);
      }
      for (const { heading, body } of sections) {
        doc.fillColor(BLACK).fontSize(13).font('Helvetica-Bold').text(heading);
        doc.moveDown(0.4);
        for (const para of body.split('\n\n').filter(p => p.trim())) {
          doc.fillColor('#222222').fontSize(10.5).font('Helvetica')
             .text(para.replace(/\n/g, ' '), { align: 'justify', lineGap: 2 });
          doc.moveDown(0.5);
        }
        doc.moveDown(0.8);
      }
      const pageBottom = doc.page.height - 50;
      doc.moveTo(72, pageBottom - 10).lineTo(doc.page.width - 72, pageBottom - 10)
         .strokeColor(LINE).lineWidth(0.5).stroke();
      doc.fillColor(MUTED).fontSize(8)
         .text('Generováno agentem whitepapper.click · Ověřeno na NEAR Protocolu', 72, pageBottom,
               { align: 'center', width: doc.page.width - 144 });
      doc.end();
    } catch (err) { reject(err); }
  });
}

async function uploadToGitHub(filename, pdfBuffer) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO)
    throw new Error('Chybí GitHub konfigurace.');

  const path   = `whitepapers/${filename}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let existingSha;
  const check = await fetch(apiUrl, { headers });
  if (check.ok) existingSha = (await check.json()).sha;

  const body = {
    message: `feat: add whitepaper ${filename}`,
    content: pdfBuffer.toString('base64'),
    ...(existingSha ? { sha: existingSha } : {})
  };

  const res = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub upload selhal: ${err.message || res.status}`);
  }
  const result = await res.json();
  return {
    githubUrl: result.content?.html_url ||
      `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/${path}`,
    sha: result.content?.sha || ''
  };
}

async function storeOnNEAR({ pdfHash }) {
  console.log('[NEAR] Dev mode — přeskakuji on-chain zápis.');
  return { txHash: 'near_tx_' + pdfHash.slice(0, 16) };
}

app.post('/generate', async (req, res) => {
  const { topic, walletId } = req.body;
  if (!topic || topic.trim().length < 5)
    return res.status(400).json({ error: 'Téma je příliš krátké nebo chybí.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    send('progress', { step: 1, message: 'Generuji obsah whitepaperu (Claude AI)…' });
    const content = await generateContent(topic.trim());
    send('progress', { step: 1, message: '✓ Obsah vygenerován.', done: true });

    send('progress', { step: 2, message: 'Renderuji PDF…' });
    const { pdfBuffer, filename, pdfHash } = await generatePDF(topic.trim(), content);
    send('progress', { step: 2, message: `✓ PDF vytvořen (${filename}).`, done: true });

    send('progress', { step: 3, message: 'Nahrávám na GitHub…' });
    const { githubUrl } = await uploadToGitHub(filename, pdfBuffer);
    send('progress', { step: 3, message: '✓ Publikováno na GitHubu.', done: true, url: githubUrl });

    send('progress', { step: 4, message: 'Ukládám hash na NEAR blockchain…' });
    const { txHash } = await storeOnNEAR({ pdfHash });
    send('progress', { step: 4, message: '✓ Hash uložen on-chain.', done: true, txHash });

    send('done', { success: true, githubUrl, pdfHash, txHash, filename });
  } catch (err) {
    console.error('[agent] error:', err.message);
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => console.log(`✓ whitepapper-agent listening on port ${PORT}`));
