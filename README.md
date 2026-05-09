# whitepapper-agent

Backend agent pro [whitepapper.click](https://whitepapper.click).  
Orchestruje pipeline: **Claude AI → PDF → GitHub → NEAR**.

---

## Instalace

```bash
npm install
cp .env.example .env
# Vyplň hodnoty v .env
```

## Spuštění (lokálně)

```bash
npm run dev
```

Server poběží na `http://localhost:3000`.

---

## API

### `POST /generate`

**Request:**
```json
{
  "topic": "Decentralizovaná AI governance na NEAR protokolu",
  "walletId": "user.testnet"
}
```

**Response (Server-Sent Events):**
```
event: progress
data: {"step":1,"message":"Generuji obsah whitepaperu..."}

event: progress
data: {"step":2,"message":"✓ PDF vytvořen.","done":true}

event: done
data: {"success":true,"githubUrl":"...","pdfHash":"...","txHash":"..."}
```

### `GET /health`
```json
{ "status": "ok" }
```

---

## Deploy na Railway

1. Vytvoř nový projekt na [railway.app](https://railway.app)
2. Propoj GitHub repozitář s tímto kódem
3. Přidej Environment Variables (viz `.env.example`)
4. Railway automaticky detekuje Node.js a nasadí

---

## Struktura

```
whitepapper-agent/
├── server.js              ← Express API server
├── agent/
│   ├── index.js           ← Hlavní orchestrátor
│   ├── generateContent.js ← Claude AI (krok 3)
│   ├── generatePDF.js     ← PDF rendering (krok 4)
│   ├── uploadGitHub.js    ← GitHub API (krok 5)
│   └── storeOnNEAR.js     ← NEAR blockchain (krok 6)
├── .env.example
├── Procfile
└── package.json
```

---

## Kroky integrace

| Krok | Status | Popis |
|------|--------|-------|
| Backend server | ✅ | Express + SSE |
| Claude AI | ✅ | Generování obsahu |
| PDF rendering | ✅ | pdfkit |
| GitHub upload | ✅ | REST API |
| NEAR on-chain | 🔜 | Krok 6 — smart contract |
