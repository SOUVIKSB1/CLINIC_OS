const fs = require('fs');
const path = require('path');

const walletDir = path.join(__dirname, '..', 'wallet');

function restore() {
  const cwalletB64 = process.env.WALLET_CWALLET_SSO_B64;
  const tnsnamesB64 = process.env.WALLET_TNSNAMES_ORA_B64;

  if (!cwalletB64 && !tnsnamesB64) {
    console.log('ℹ️ No wallet environment variables found. Skipping wallet restoration. (This is normal for local development).');
    return;
  }

  console.log('🔄 Restoring Oracle Wallet files from environment variables...');

  try {
    if (!fs.existsSync(walletDir)) {
      fs.mkdirSync(walletDir, { recursive: true });
      console.log(`Created directory: ${walletDir}`);
    }

    if (cwalletB64) {
      const cwalletBuffer = Buffer.from(cwalletB64, 'base64');
      fs.writeFileSync(path.join(walletDir, 'cwallet.sso'), cwalletBuffer);
      console.log('✅ Restored cwallet.sso');
    } else {
      console.warn('⚠️ WALLET_CWALLET_SSO_B64 is missing!');
    }

    if (tnsnamesB64) {
      const tnsnamesBuffer = Buffer.from(tnsnamesB64, 'base64');
      fs.writeFileSync(path.join(walletDir, 'tnsnames.ora'), tnsnamesBuffer);
      console.log('✅ Restored tnsnames.ora');
    } else {
      console.warn('⚠️ WALLET_TNSNAMES_ORA_B64 is missing!');
    }

    console.log('🎉 Oracle Wallet restoration complete.');
  } catch (error) {
    console.error('❌ Failed to restore Oracle Wallet:', error.message);
    process.exit(1);
  }
}

restore();
