const db = require('../db');
const bcrypt = require('bcrypt');
const {signToken} = require('../utils/auth');

const ADMIN_LOGIN_USERNAME = process.env.ADMIN_LOGIN_USERNAME || 'admin';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidGmailAddress(value) {
  return /^[a-z0-9._%+-]+@gmail\.com$/.test(normalizeEmail(value));
}

function queryAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function isBcryptHash(value){
  return typeof value === 'string' && /^\$2[aby]?\$/.test(value);
}

async function comparePassword(password, storedPassword){
  if (!storedPassword) {
    return false;
  }

  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(password, storedPassword);
  }

  return password === storedPassword;
}

async function adminLogin(req,res){
  try {
    const {username,password} = req.body;
    if(!username || !password) return res.status(400).json({error:'Username and password are required'});
    if(username !== ADMIN_LOGIN_USERNAME) return res.status(401).json({error:'Invalid Credentials'});
    const rows = await queryAsync('SELECT * FROM Admins WHERE username=?',[ADMIN_LOGIN_USERNAME]);
    if(!rows || rows.length===0) return res.status(401).json({error:'Invalid Credentials'});
    const admin = rows[0];
    const ok = await comparePassword(password, admin.password);
    if(!ok) return res.status(401).json({error:'Invalid Credentials'});
    const token = signToken({id:admin.admin_id,role:'admin',username:admin.username});
    return res.json({token});
  } catch (e) {
    return res.status(500).json({error:e.message || 'Login failed'});
  }
}

async function userLogin(req,res){
  try {
    const email = normalizeEmail(req.body.email);
    if(!email) return res.status(400).json({error:'Gmail is required'});
    if(!isValidGmailAddress(email)) {
      return res.status(400).json({error:'Please use a valid Gmail address'});
    }

    const rows = await queryAsync('SELECT * FROM Users WHERE LOWER(email)=LOWER(?)',[email]);
    if(!rows || rows.length===0){
      return res.status(401).json({error:'User not found. Please register first.'});
    }

    const u = rows[0];
    const token = signToken({id:u.user_id,role:'user',email:normalizeEmail(u.email),name:u.name});
    return res.json({token});
  } catch (e) {
    return res.status(500).json({error:e.message || 'User login failed'});
  }
}

// Explicit registration endpoint for citizen users
async function registerUser(req, res){
  try {
    const email = normalizeEmail(req.body.email);
    let name = req.body.name || '';
    const password = req.body.password;

    if(!email) return res.status(400).json({error:'Gmail is required'});
    if(!isValidGmailAddress(email)) return res.status(400).json({error:'Please use a valid Gmail address'});

    // ensure not already exists
    const existing = await queryAsync('SELECT * FROM Users WHERE LOWER(email)=LOWER(?)',[email]);
    if(existing && existing.length>0) return res.status(409).json({error:'User with this email already exists'});

    // derive name if not provided
    if(!name || String(name).trim().length===0){
      const localPart = email.split('@')[0] || `guest_${Date.now()}`;
      name = localPart.replace(/\.+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim() || `guest_${Date.now()}`;
    }

    // if password provided, hash it; otherwise create a harmless placeholder hash
    const pwdToHash = password ? String(password) : `gmail:${email}`;
    const hashed = await bcrypt.hash(pwdToHash, 10);

    const result = await queryAsync('INSERT INTO Users(name,email,password) VALUES (?,?,?)',[name,email,hashed]);
    const token = signToken({id:result.insertId,role:'user',email,name});
    return res.status(201).json({token});
  } catch (e) {
    return res.status(500).json({error:e.message || 'Registration failed'});
  }
}

async function driverLogin(req,res){
  try {
    const {name, phone} = req.body;
    if(!name || !phone) return res.status(400).json({error:'Driver name and phone number are required'});

    const rows = await queryAsync(
      'SELECT driver_id, name, phone, assigned_truck_id, assigned_route_id FROM Drivers WHERE LOWER(TRIM(name))=LOWER(TRIM(?)) AND TRIM(phone)=TRIM(?)',
      [name, String(phone)],
    );

    if(!rows || rows.length===0) return res.status(401).json({error:'Invalid driver name or phone number'});

    const d = rows[0];
    const token = signToken({
      id:d.driver_id,
      role:'driver',
      name:d.name,
      phone:d.phone,
      assigned_truck_id:d.assigned_truck_id || null,
      assigned_route_id:d.assigned_route_id || null,
    });
    return res.json({token});
  } catch (e) {
    return res.status(500).json({error:e.message || 'Driver login failed'});
  }
}

module.exports = {adminLogin,userLogin,driverLogin,registerUser};