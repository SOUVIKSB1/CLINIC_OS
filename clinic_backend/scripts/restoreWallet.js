const fs = require('fs');
const path = require('path');

const walletDir = path.join(__dirname, '..', 'wallet');

function restore() {
  let walletDataB64 = process.env.WALLET_DATA_B64;
  const walletLocation = process.env.WALLET_LOCATION;

  // Render secret file paths
  const secretPaths = [
    '/etc/secrets/wallet_data.b64',
    path.join(__dirname, '..', 'wallet_data.b64'),
    path.join(process.cwd(), 'wallet_data.b64')
  ];

  // If environment variable is not present, check Secret Files
  if (!walletDataB64) {
    for (const secretPath of secretPaths) {
      if (fs.existsSync(secretPath)) {
        try {
          walletDataB64 = fs.readFileSync(secretPath, 'utf8').trim();
          console.log(`✅ Loaded wallet package from Secret File: ${secretPath}`);
          break;
        } catch (e) {
          console.error(`⚠️ Failed to read Secret File at ${secretPath}:`, e.message);
        }
      }
    }
  }

  console.log('--- Oracle Wallet Diagnostic Info ---');
  console.log(`WALLET_DATA_B64 resolved: ${!!walletDataB64}`);
  console.log(`WALLET_LOCATION: ${walletLocation}`);
  console.log(`Current working directory: ${process.cwd()}`);
  console.log('-------------------------------------');

  if (!walletDataB64) {
    console.log('ℹ️ No wallet data source found (env or secret file). Skipping wallet restoration. (Normal for local development).');
    return;
  }

  console.log('🔄 Restoring Oracle Wallet files from WALLET_DATA_B64...');

  try {
    if (!fs.existsSync(walletDir)) {
      fs.mkdirSync(walletDir, { recursive: true });
      console.log(`Created directory: ${walletDir}`);
    }

    // Decode the entire JSON object from base64
    const decodedJson = Buffer.from(walletDataB64, 'base64').toString('utf-8');
    const walletData = JSON.parse(decodedJson);

    // Reconstruct each file
    Object.keys(walletData).forEach(filename => {
      const fileB64 = walletData[filename];
      const fileBuffer = Buffer.from(fileB64, 'base64');
      fs.writeFileSync(path.join(walletDir, filename), fileBuffer);
      console.log(`✅ Restored: ${filename} (${fileBuffer.length} bytes)`);
    });

    console.log('🎉 Oracle Wallet restoration complete.');
  } catch (error) {
    console.error('❌ Failed to restore Oracle Wallet:', error.message);
    process.exit(1);
  }
}

restore();
