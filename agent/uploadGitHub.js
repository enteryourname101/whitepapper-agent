/**
 * Uploaduje PDF soubor do GitHub repozitáře pomocí REST API.
 * Nevyžaduje žádnou extra knihovnu — používá fetch (Node 18+).
 */
async function uploadToGitHub(filename, pdfBuffer) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER; // tvůj GitHub username
  const GITHUB_REPO  = process.env.GITHUB_REPO;  // název repozitáře

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error('Chybí GitHub konfigurace (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO).');
  }

  const path    = `whitepapers/${filename}`;
  const content = pdfBuffer.toString('base64');
  const apiUrl  = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

  // Zkus nejdřív načíst existující soubor (pro případ update → potřebujeme SHA)
  let existingSha;
  const checkRes = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept:        'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  });
  if (checkRes.ok) {
    const data  = await checkRes.json();
    existingSha = data.sha;
  }

  // Upload (create nebo update)
  const body = {
    message: `feat: add whitepaper ${filename}`,
    content,
    ...(existingSha ? { sha: existingSha } : {})
  };

  const uploadRes = await fetch(apiUrl, {
    method:  'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept:        'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(body)
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`GitHub upload selhal: ${err.message || uploadRes.status}`);
  }

  const result    = await uploadRes.json();
  const githubUrl = result.content?.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/${path}`;
  const sha       = result.content?.sha || '';

  return { githubUrl, sha };
}

module.exports = { uploadToGitHub };
