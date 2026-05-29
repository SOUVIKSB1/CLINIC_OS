const fs = require('fs');
const path = require('path');

const walletDir = path.join(__dirname, '..', 'wallet');

function restore() {
  const walletDataB64 = process.env.WALLET_DATA_B64;
  const walletLocation = process.env.WALLET_LOCATION;

  console.log('--- Oracle Wallet Diagnostic Info ---');
  console.log(`WALLET_DATA_B64 present: ${!!walletDataB64}`);
  console.log(`WALLET_LOCATION: ${walletLocation}`);
  console.log(`Current working directory: ${process.cwd()}`);
  console.log('-------------------------------------');

  if (!walletDataB64) {
    console.log('ℹ️ WALLET_DATA_B64 environment variable not found. Skipping wallet restoration. (Normal for local development).');
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
