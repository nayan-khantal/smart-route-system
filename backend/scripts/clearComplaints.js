const db = require('../db');

function clearComplaints() {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM Complaints', (err, result) => {
      if (err) {
        console.error('Error clearing complaints:', err.message);
        reject(err);
      } else {
        console.log(`✓ Deleted ${result.affectedRows} complaints`);
        resolve(result);
      }
    });
  });
}

async function run() {
  try {
    await clearComplaints();
    console.log('✓ All complaints have been cleared');
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear complaints:', err);
    process.exit(1);
  }
}

if (require.main === module) run();

module.exports = {clearComplaints};
