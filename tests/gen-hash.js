// gen-hash.js
const bcrypt = require('bcryptjs');

async function main() {
  const adminPass = 'admin1';
  const clientPass = 'cliente1';

  const adminHash = await bcrypt.hash(adminPass, 10);
  const clientHash = await bcrypt.hash(clientPass, 10);

  console.log('Admin hash:', adminHash);
  console.log('Cliente hash:', clientHash);
}

main();
