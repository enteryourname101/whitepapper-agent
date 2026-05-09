const { generateContent } = require('./agent/generateContent');
const { generatePDF }     = require('./agent/generatePDF');
const { uploadToGitHub }  = require('./agent/uploadGitHub');
const { storeOnNEAR }     = require('./agent/storeOnNEAR');

/**
 * Hlavní orchestrátor — řídí celý pipeline:
 *   1. Vygeneruj obsah (Claude AI)
 *   2. Vyrenderuj PDF
 *   3. Nahraj na GitHub
 *   4. Ulož hash na NEAR
 *
 * @param {string}   topic    – Téma whitepaperu od uživatele
 * @param {string}   walletId – NEAR wallet ID (pro on-chain záznam)
 * @param {Function} send     – SSE callback: send(event, data)
 */
async function runAgent(topic, walletId, send) {

  // ── Krok 1: Generování obsahu ─────────────────────────────
  send('progress', { step: 1, message: 'Generuji obsah whitepaperu (Claude AI)…' });
  const content = await generateContent(topic);
  send('progress', { step: 1, message: '✓ Obsah vygenerován.', done: true });

  // ── Krok 2: PDF rendering ─────────────────────────────────
  send('progress', { step: 2, message: 'Renderuji PDF…' });
  const { pdfBuffer, filename, pdfHash } = await generatePDF(topic, content);
  send('progress', { step: 2, message: `✓ PDF vytvořen (${filename}).`, done: true });

  // ── Krok 3: Upload na GitHub ──────────────────────────────
  send('progress', { step: 3, message: 'Nahrávám na GitHub…' });
  const { githubUrl, sha } = await uploadToGitHub(filename, pdfBuffer);
  send('progress', { step: 3, message: '✓ Soubor publikován na GitHubu.', done: true, url: githubUrl });

  // ── Krok 4: On-chain záznam na NEAR ──────────────────────
  send('progress', { step: 4, message: 'Ukládám hash na NEAR blockchain…' });
  const { txHash } = await storeOnNEAR({ topic, filename, pdfHash, githubUrl, walletId });
  send('progress', { step: 4, message: '✓ Hash uložen on-chain.', done: true, txHash });

  return { githubUrl, pdfHash, txHash, filename };
}

module.exports = { runAgent };
