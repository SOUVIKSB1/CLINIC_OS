const fs = require('fs');
const path = require('path');

const walletDir = path.join(__dirname, '..', 'wallet');
const outputFile = path.join(__dirname, '..', 'render_wallet_env.txt');

function generate() {
  if (!fs.existsSync(walletDir)) {
    console.error(`❌ Error: Wallet directory not found at ${walletDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(walletDir);
  const walletData = {};

  // Files to ignore
  const ignoreFiles = ['.DS_Store', 'README', '.afiedt.buf.swp', 'afiedt.buf'];

  files.forEach(file => {
    if (ignoreFiles.includes(file)) return;
    
    const filePath = path.join(walletDir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      const content = fs.readFileSync(filePath);
      walletData[file] = content.toString('base64');
      console.log(`📦 Packaged: ${file} (${content.length} bytes)`);
    }
  });

  if (Object.keys(walletData).length === 0) {
    console.error('❌ Error: No wallet files found to package.');
    process.exit(1);
  }

  // Convert the JSON object to a string, then base64 encode the entire JSON
  const jsonString = JSON.stringify(walletData);
  const finalB64 = Buffer.from(jsonString).toString('base64');

  const outputContent = `=== RENDER SETUP OPTIONS ===

OPTION A: RENDER SECRET FILE (Recommended - bypasses size limits)
Filename: wallet_data.b64
Contents:
${finalB64}

===================================

OPTION B: ENVIRONMENT VARIABLE
Name: WALLET_DATA_B64
Value:
${finalB64}

===================================
Copy the long string above. We recommend using OPTION A (Secret File) because some hosting environments restrict environment variable sizes to 4KB.
`;

  fs.writeFileSync(outputFile, outputContent);
  console.log('\n✅ Single-variable Base64 package generated successfully!');
  console.log(`Open file://${outputFile} to copy the value.`);
}

generate();
