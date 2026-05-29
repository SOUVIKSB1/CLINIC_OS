const fs = require('fs');
const path = require('path');

const walletDir = path.join(__dirname, '..', 'wallet');
const outputFile = path.join(__dirname, '..', 'render_wallet_env.txt');

function generate() {
  const cwalletPath = path.join(walletDir, 'cwallet.sso');
  const tnsnamesPath = path.join(walletDir, 'tnsnames.ora');

  if (!fs.existsSync(cwalletPath) || !fs.existsSync(tnsnamesPath)) {
    console.error('❌ Error: Oracle Wallet files (cwallet.sso or tnsnames.ora) not found in clinic_backend/wallet.');
    console.log('Please make sure you have copied them into the clinic_backend/wallet directory.');
    process.exit(1);
  }

  const cwalletB64 = fs.readFileSync(cwalletPath).toString('base64');
  const tnsnamesB64 = fs.readFileSync(tnsnamesPath).toString('base64');

  const outputContent = `=== RENDER ENVIRONMENT VARIABLES ===

Name: WALLET_CWALLET_SSO_B64
Value:
${cwalletB64}

=======================================

Name: WALLET_TNSNAMES_ORA_B64
Value:
${tnsnamesB64}

=======================================
Copy the above values and paste them into the "Environment Variables" section of your Render service dashboard.
`;

  fs.writeFileSync(outputFile, outputContent);
  console.log('✅ Base64 strings generated successfully!');
  console.log(`Open file://${outputFile} to copy the values.`);
}

generate();
