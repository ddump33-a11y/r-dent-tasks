// OAuth helper for Gmail reorg script.
// First run: prints a URL, you click it, paste the code back in, token is saved.
// Subsequent runs: loads token from disk automatically.

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
];

const CRED_PATH  = path.resolve(__dirname, '.gmail-credentials.json');
const TOKEN_PATH = path.resolve(__dirname, '.gmail-token.json');

function loadCredentials() {
  if (!fs.existsSync(CRED_PATH)) {
    console.error(`\n✗ Missing ${CRED_PATH}`);
    console.error('  Get a Desktop-app OAuth client from Google Cloud Console:');
    console.error('  https://console.cloud.google.com/apis/credentials');
    console.error('  → Create Credentials → OAuth client ID → Desktop app');
    console.error('  → Download JSON → save as scripts/gmail-reorg/.gmail-credentials.json\n');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function authorize() {
  const creds = loadCredentials();
  const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
  console.log('\n─ Authorize this app by visiting the URL below ─');
  console.log(authUrl);
  console.log('─────────────────────────────────────────────────\n');
  const code = await prompt('Paste the authorization code here: ');
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`✓ Token saved to ${TOKEN_PATH}\n`);
  return oAuth2Client;
}

module.exports = { authorize };
