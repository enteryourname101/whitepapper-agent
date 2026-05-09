const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Jsi expert na tvorbu odborných whitepaperů pro blockchain a Web3 projekty.
Vygeneruj profesionální whitepaper v češtině nebo angličtině (podle tématu).
Výstup musí být čistý text strukturovaný pomocí těchto sekcí — každou odděl řádkem "---":

TITLE: [název whitepaperu]
ABSTRACT: [shrnutí 2-3 věty]
---
1. INTRODUCTION
[text sekce]
---
2. PROBLEM STATEMENT
[text sekce]
---
3. PROPOSED SOLUTION
[text sekce]
---
4. TECHNICAL ARCHITECTURE
[text sekce]
---
5. TOKENOMICS & INCENTIVES
[text sekce — pokud není relevantní, napiš N/A]
---
6. ROADMAP
[milníky a timeline]
---
7. CONCLUSION
[závěr]
---
REFERENCES
[3-5 relevantní reference ve formátu: [1] Autor, Název, Rok]

Buď konkrétní, technicky přesný a odborný. Rozsah: 600-900 slov celkem.`;

async function generateContent(topic) {
  const message = await client.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 2000,
    system:     SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Vytvoř whitepaper na téma: ${topic}` }
    ]
  });

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  if (!text) throw new Error('Claude nevrátil žádný obsah.');
  return text;
}

module.exports = { generateContent };
