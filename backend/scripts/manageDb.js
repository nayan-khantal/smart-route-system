#!/usr/bin/env node
/* CLI to run backend DB maintenance scripts from a single entry point.

Usage:
  node manageDb.js <task>

Tasks:
  seed                  - seed hashed passwords (seed.js)
  seed-data             - insert Mysuru demo data (seedData.js)
*/

const task = process.argv[2];

async function runTask(name){
  try{
    switch(name){
      case 'seed':
        return require('./seed').run();
      case 'seed-data':
        return require('./seedData').run();
      default:
        console.log('Usage: node manageDb.js <task>');
        console.log('Tasks: seed, seed-data');
        process.exit(1);
    }
  }catch(e){
    console.error('Task failed:', e && e.message || e);
    process.exit(1);
  }
}

if(require.main === module){
  runTask(task);
}

module.exports = {runTask};
