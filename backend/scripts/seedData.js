const db = require('../db');
const bcrypt = require('bcrypt');

function q(sql, params=[]) { return new Promise((res, rej)=> db.query(sql, params, (e,r)=> e?rej(e):res(r))); }

async function run(){
  try{
    await q('USE smart_waste');

    // Clear old sample data so the seed reflects the current Mysuru-focused demo set.
    await q('SET FOREIGN_KEY_CHECKS=0');
    await q('DELETE FROM Complaints');
    await q('DELETE FROM Collection_Records');
    await q('DELETE FROM Trucks');
    await q('DELETE FROM Users');
    await q('DELETE FROM Drivers');
    await q('DELETE FROM Route_Areas');
    await q('DELETE FROM Routes');
    await q('DELETE FROM Areas');
    await q('DELETE FROM Recycling_Centers');
    await q('DELETE FROM Waste_Types');
    await q('ALTER TABLE Complaints AUTO_INCREMENT=1');
    await q('ALTER TABLE Collection_Records AUTO_INCREMENT=1');
    await q('ALTER TABLE Trucks AUTO_INCREMENT=1');
    await q('ALTER TABLE Users AUTO_INCREMENT=1');
    await q('ALTER TABLE Drivers AUTO_INCREMENT=1');
    await q('ALTER TABLE Routes AUTO_INCREMENT=1');
    await q('ALTER TABLE Areas AUTO_INCREMENT=1');
    await q('ALTER TABLE Recycling_Centers AUTO_INCREMENT=1');
    await q('ALTER TABLE Waste_Types AUTO_INCREMENT=1');
    await q('SET FOREIGN_KEY_CHECKS=1');

    // Areas
    await q('INSERT IGNORE INTO Areas(area_name, zone, population) VALUES ?',[ [
      ['Kuvempunagar','West',28600],
      ['Saraswathipuram','North',21400],
      ['Vijayanagar','South',34100],
      ['Gokulam','East',19300],
      ['Lakshmipuram','Central',12700]
    ]]);

    // Routes
    await q('INSERT IGNORE INTO Routes(route_name, zone) VALUES ?',[ [
      ['Mysuru Heritage Route','Central'],
      ['North Zone Route','North'],
      ['West Residential Route','West']
    ]]);

    await q('INSERT IGNORE INTO Route_Areas(route_id, area_id, sequence_number) VALUES ?',[ [
      [1,5,1],
      [1,1,2],
      [2,2,1],
      [2,4,2],
      [3,3,1]
    ]]);

    // Waste types
    await q('INSERT IGNORE INTO Waste_Types(type_name,recyclable) VALUES ?',[ [
      ['Organic Waste',0],['Plastic Waste',1],['Paper Waste',1],['Metal Waste',1]
    ]]);

    // Drivers
    const d1 = await bcrypt.hash('driver123',10);
    const d2 = await bcrypt.hash('driver456',10);
    const d3 = await bcrypt.hash('driver789',10);
    await q('INSERT INTO Drivers(name,phone,password,assigned_route_id) VALUES ? ON DUPLICATE KEY UPDATE password=VALUES(password), assigned_route_id=VALUES(assigned_route_id)',[ [
      ['Ramesh Nayak','9988776601',d1,1],
      ['Suresh Kumar','9988776602',d2,2],
      ['Manjunath H','9988776603',d3,3]
    ]]);

    // Users
    const u1 = await bcrypt.hash('gmail:priya@gmail.com',10);
    const u2 = await bcrypt.hash('gmail:arun@gmail.com',10);
    const u3 = await bcrypt.hash('gmail:ananya@gmail.com',10);
    await q('INSERT INTO Users(name,email,password,area_id) VALUES ? ON DUPLICATE KEY UPDATE password=VALUES(password), area_id=VALUES(area_id)',[ [
      ['Priya Rao','priya@gmail.com',u1,1],
      ['Arun Shetty','arun@gmail.com',u2,3],
      ['Ananya Bhat','ananya@gmail.com',u3,4]
    ]]);

    // Trucks
    await q('INSERT IGNORE INTO Trucks(truck_number,capacity,driver_id,route_id) VALUES ?',[ [
      ['KA-09-MY-1101',12.5,1,1],
      ['KA-09-MY-2202',15.0,2,2],
      ['KA-09-MY-3303',10.0,3,3]
    ]]);

    // Collection records
    await q('INSERT IGNORE INTO Collection_Records(truck_id,area_id,waste_type_id,collection_time,waste_amount,status) VALUES ?',[ [
      [1,1,1,'2026-05-13 07:30:00',185.5,'completed'],
      [2,3,2,'2026-05-13 09:10:00',142.0,'completed'],
      [3,4,3,'2026-05-13 11:45:00',96.5,'completed'],
      [1,5,1,'2026-05-14 07:20:00',201.0,'completed']
    ]]);

    // Complaint categories (should exist) and sample complaints
    const cats = await q('SELECT category_id FROM Complaint_Categories LIMIT 3');
    const cat1 = (cats[0] && cats[0].category_id) || 1;
    const cat2 = (cats[1] && cats[1].category_id) || 2;
    const cat3 = (cats[2] && cats[2].category_id) || 3;

    await q(`INSERT INTO Complaints(user_id,area_id,description,category_id,status,priority,created_at)
      VALUES ?`,[ [
        [1,1,'Garbage not collected near Kuvempunagar main road for two days',cat1,'pending','high', new Date()],
        [2,3,'Overflowing bins near Vijayanagar shopping stretch',cat2,'pending','medium', new Date()],
        [3,4,'Plastic waste left behind near Gokulam park entrance',cat3,'assigned','high', new Date()]
    ]]);

    // Recycling centers
    await q('INSERT IGNORE INTO Recycling_Centers(location,capacity,waste_type_id) VALUES ?',[ [
      ['Mysuru North Recycling Center',500.0,2],
      ['Vijayanagar Material Recovery Facility',650.0,3],
      ['Kuvempunagar Composting Unit',420.0,1]
    ]]);

    console.log('Sample data inserted');
    process.exit(0);
  }catch(err){
    console.error('Seed data error:', err);
    process.exit(1);
  }
}

if (require.main === module) run();

module.exports = {run};
