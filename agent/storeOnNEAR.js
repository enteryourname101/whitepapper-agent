/**
 * Uloží hash PDF a metadata whitepaperu na NEAR blockchain.
 *
 * ⚠️  Tento modul je připravený placeholder — plná NEAR integrace
 *     přijde v Kroku 6 (smart contract + near-api-js).
 *
 * Zatím simuluje tx hash pro testování celého pipeline.
 */
async function storeOnNEAR({ topic, filename, pdfHash, githubUrl, walletId }) {
  const NEAR_ENABLED = process.env.NEAR_ENABLED === 'true';

  if (!NEAR_ENABLED) {
    // Dev mode — vrátí fake tx hash
    console.log('[NEAR] Placeholder — přeskakuji on-chain zápis.');
    const fakeTx = 'near_tx_' + pdfHash.slice(0, 16);
    return { txHash: fakeTx };
  }

  // ── Plná integrace (Krok 6) ───────────────────────────────
  // Sem přijde volání NEAR smart contractu:
  //
  // const near    = await connect(nearConfig);
  // const account = await near.account(walletId);
  // const result  = await account.functionCall({
  //   contractId: process.env.NEAR_CONTRACT_ID,
  //   methodName: 'store_whitepaper',
  //   args: { topic, filename, pdf_hash: pdfHash, github_url: githubUrl },
  //   gas: '30000000000000',
  //   attachedDeposit: '0',
  // });
  // return { txHash: result.transaction.hash };

  throw new Error('NEAR integrace není ještě implementována. Nastav NEAR_ENABLED=false pro dev mode.');
}

module.exports = { storeOnNEAR };
