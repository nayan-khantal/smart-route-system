require('dotenv').config();
const db = require('../db');
const bcrypt = require('bcrypt');

function queryAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

async function run() {
  try {
    await queryAsync('USE smart_waste');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await queryAsync(
      'INSERT INTO Admins(username,password) VALUES (?,?) ON DUPLICATE KEY UPDATE password=VALUES(password)',
      ['admin', adminPassword],
    );

    const drivers = [
      ['Ramesh Nayak', 'driver123'],
      ['Suresh Kumar', 'driver456'],
    ];
    for (const [name, password] of drivers) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await queryAsync(
        'UPDATE Drivers SET password=? WHERE name=?',
        [hashedPassword, name],
      );
    }

    console.log('Seeded demo login credentials');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed login credentials:', error);
    process.exit(1);
  }
}

if (require.main === module) run();
module.exports = {run};
