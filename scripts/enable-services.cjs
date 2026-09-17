const fs = require('fs');
const path = require('path');
const https = require('https');

const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let accessToken = config.tokens.access_token;

async function refreshAccessToken() {
  const params = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    grant_type: 'refresh_token',
    refresh_token: config.tokens.refresh_token
  });

  return new Promise((resolve, reject) => {
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const body = JSON.parse(data);
        resolve(body.access_token);
      });
    });
    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

async function enableService(serviceName) {
  const token = await refreshAccessToken();
  const projectId = 'lacurandera-97c3e';

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'serviceusage.googleapis.com',
      path: `/v1/projects/${projectId}/services/${serviceName}:enable`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': 0
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Response for ${serviceName} (${res.statusCode}):`, data);
        resolve(data);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Enabling firestore.googleapis.com...');
  await enableService('firestore.googleapis.com');
  console.log('Enabling firebasestorage.googleapis.com...');
  await enableService('firebasestorage.googleapis.com');
}

main().catch(console.error);
