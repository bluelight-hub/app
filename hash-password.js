const bcrypt = require('bcryptjs');
const { logger } = require('./packages/frontend/src/utils/logger');

const password = 'SecurePassword123!';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

logger.log('Password:', password);
logger.log('Hash:', hash);

// Test the hash
logger.log('Verify:', bcrypt.compareSync(password, hash));
