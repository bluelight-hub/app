const bcrypt = require('bcryptjs');

const password = 'SecurePassword123!';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Password:', password);
console.log('Hash:', hash);

// Test the hash
console.log('Verify:', bcrypt.compareSync(password, hash));