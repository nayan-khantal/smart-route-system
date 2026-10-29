const db = require('../db');

const IMPORTANT_COMPLAINT_CATEGORIES = [
  'Garbage Not Collected',
  'Damaged Bins',
  'Overflowing Bins',
  'Missed Collection',
  'Improper Waste Segregation',
  'Hazardous Waste',
  'General Complaint'
];

function queryAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

async function dashboard(req,res){
  try {
    const summaryRows = await queryAsync(`SELECT 
      (SELECT COUNT(*) FROM Areas) AS total_areas,
      (SELECT COUNT(*) FROM Trucks) AS total_trucks,
      (SELECT IFNULL(SUM(waste_amount),0) FROM Collection_Records) AS total_waste,
      (SELECT IFNULL(SUM(waste_amount),0) FROM Collection_Records WHERE DATE(collection_time)=CURDATE()) AS total_waste_today,
      (SELECT COUNT(*) FROM Collection_Records) AS total_collection_records,
      (SELECT COUNT(*) FROM Trucks WHERE driver_id IS NOT NULL) AS active_trucks,
      (SELECT COUNT(*) FROM Complaints WHERE status='pending') AS pending_complaints`);

    const recentActivities = await queryAsync(
      `SELECT c.collection_id, c.collection_time, c.waste_amount, c.status,
              t.truck_number, d.name AS driver_name, a.area_name, w.type_name
       FROM Collection_Records c
       LEFT JOIN Trucks t ON c.truck_id=t.truck_id
       LEFT JOIN Drivers d ON t.driver_id=d.driver_id
       JOIN Areas a ON c.area_id=a.area_id
       JOIN Waste_Types w ON c.waste_type_id=w.waste_type_id
       ORDER BY c.collection_id ASC
       LIMIT 10`
    );

    const pendingComplaints = await queryAsync(
      `SELECT cp.complaint_id, cp.status, cp.priority, cp.created_at,
              u.name AS user_name, a.area_name, cc.category_name
       FROM Complaints cp
       JOIN Users u ON cp.user_id=u.user_id
       JOIN Areas a ON cp.area_id=a.area_id
       LEFT JOIN Complaint_Categories cc ON cp.category_id=cc.category_id
       WHERE cp.status IN ('pending','assigned','in progress','escalated')
        ORDER BY cp.complaint_id ASC
       LIMIT 8`
    );

    const collectionTrend = await queryAsync(
      `SELECT DATE(c.collection_time) AS day,
              COUNT(c.collection_id) AS collection_count,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Collection_Records c
       WHERE c.collection_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(c.collection_time)
       ORDER BY day ASC`
    );

    const areaPerformance = await queryAsync(
      `SELECT a.area_id, a.area_name,
              COUNT(c.collection_id) AS collection_count,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Areas a
       LEFT JOIN Collection_Records c ON c.area_id=a.area_id
       GROUP BY a.area_id, a.area_name
       ORDER BY a.area_id ASC
       LIMIT 5`
    );

    return res.json({
      ...(summaryRows[0] || {}),
      recent_activities: recentActivities,
      recent_collections: recentActivities,
      pending_complaints_preview: pendingComplaints,
      collection_trend: collectionTrend,
      area_performance: areaPerformance,
    });
  } catch (e) {
    return res.status(500).json({error:e.message || 'Failed to load dashboard'});
  }
}

// Areas CRUD
function listAreas(req,res){ db.query('SELECT * FROM Areas',(e,r)=> e?res.status(500).json({error:e}):res.json(r)); }
function createArea(req,res){ const {area_name,zone,population}=req.body; db.query('INSERT INTO Areas(area_name,zone,population) VALUES (?,?,?)',[area_name,zone,population],(e)=> e?res.status(500).json({error:e}):res.json({ok:true})); }
function updateArea(req,res){ const id=req.params.id; const {area_name,zone,population}=req.body; db.query('UPDATE Areas SET area_name=?,zone=?,population=? WHERE area_id=?',[area_name,zone,population,id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true})); }
function deleteArea(req,res){ const id=req.params.id; db.query('DELETE FROM Areas WHERE area_id=?',[id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true})); }

// Routes CRUD
async function listRoutes(req,res){
  try {
    const rows = await queryAsync(
      `SELECT r.route_id, r.route_name, r.zone,
              COALESCE(GROUP_CONCAT(a.area_name ORDER BY ra.sequence_number SEPARATOR ', '), '') AS area_names,
              COALESCE(GROUP_CONCAT(a.area_id ORDER BY ra.sequence_number SEPARATOR ','), '') AS area_ids
       FROM Routes r
       LEFT JOIN Route_Areas ra ON ra.route_id = r.route_id
       LEFT JOIN Areas a ON a.area_id = ra.area_id
       GROUP BY r.route_id, r.route_name, r.zone
       ORDER BY r.route_id ASC`
    );
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({error:e.message || 'Failed to load routes'});
  }
}

async function syncRouteAreas(routeId, areaIds = []) {
  await queryAsync('DELETE FROM Route_Areas WHERE route_id=?', [routeId]);
  if (!Array.isArray(areaIds) || areaIds.length === 0) {
    return;
  }

  const values = areaIds
    .map((areaId, index) => [routeId, Number(areaId), index + 1])
    .filter(([, areaId]) => Number.isFinite(areaId) && areaId > 0);

  if (!values.length) {
    return;
  }

  await queryAsync('INSERT INTO Route_Areas(route_id, area_id, sequence_number) VALUES ?', [values]);
}

async function createRoute(req,res){
  const {route_name,zone,area_ids}=req.body;
  try {
    const insert = await queryAsync('INSERT INTO Routes(route_name,zone) VALUES (?,?)',[route_name,zone]);
    await syncRouteAreas(insert.insertId, area_ids);
    return res.json({ok:true,route_id:insert.insertId});
  } catch (e) {
    return res.status(500).json({error:e.message || 'Failed to create route'});
  }
}

async function updateRoute(req,res){
  const id=req.params.id;
  const {route_name,zone,area_ids}=req.body;
  try {
    await queryAsync('UPDATE Routes SET route_name=?,zone=? WHERE route_id=?',[route_name,zone,id]);
    await syncRouteAreas(id, area_ids);
    return res.json({ok:true});
  } catch (e) {
    return res.status(500).json({error:e.message || 'Failed to update route'});
  }
}

function deleteRoute(req,res){ const id=req.params.id; db.query('DELETE FROM Routes WHERE route_id=?',[id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true})); }

// Trucks CRUD
function listTrucks(req,res){ const q = `SELECT t.*, d.name AS driver_name, r.route_name FROM Trucks t LEFT JOIN Drivers d ON t.driver_id=d.driver_id LEFT JOIN Routes r ON t.route_id=r.route_id`; db.query(q,(e,r)=> e?res.status(500).json({error:e}):res.json(r)); }
async function createTruck(req,res){
  const {truck_number,capacity,driver_id,route_id}=req.body;
  try {
    const insert = await queryAsync('INSERT INTO Trucks(truck_number,capacity,driver_id,route_id) VALUES (?,?,?,?)',[truck_number,capacity,driver_id||null,route_id||null]);
    if(driver_id){
      await queryAsync('UPDATE Drivers SET assigned_truck_id=?, assigned_route_id=? WHERE driver_id=?',[insert.insertId, route_id || null, driver_id]);
    }
    return res.json({ok:true,truck_id:insert.insertId});
  } catch (e) {
    return res.status(500).json({error:e.message || 'Failed to create truck'});
  }
}
async function updateTruck(req,res){
  const id=req.params.id;
  const {truck_number,capacity,driver_id,route_id}=req.body;
  try {
    const current = await queryAsync('SELECT driver_id FROM Trucks WHERE truck_id=?',[id]);
    const oldDriverId = current[0]?.driver_id || null;

    await queryAsync('UPDATE Trucks SET truck_number=?,capacity=?,driver_id=?,route_id=? WHERE truck_id=?',[truck_number,capacity,driver_id||null,route_id||null,id]);

    if(oldDriverId && Number(oldDriverId) !== Number(driver_id || 0)){
      await queryAsync('UPDATE Drivers SET assigned_truck_id=NULL, assigned_route_id=NULL WHERE driver_id=? AND assigned_truck_id=?',[oldDriverId,id]);
    }

    if(driver_id){
      await queryAsync('UPDATE Drivers SET assigned_truck_id=?, assigned_route_id=? WHERE driver_id=?',[id, route_id || null, driver_id]);
    }

    return res.json({ok:true});
  } catch (e) {
    return res.status(500).json({error:e.message || 'Failed to update truck'});
  }
}
async function deleteTruck(req,res){
  const id=req.params.id;
  try {
    await queryAsync('UPDATE Drivers SET assigned_truck_id=NULL, assigned_route_id=NULL WHERE assigned_truck_id=?',[id]);
    await queryAsync('DELETE FROM Trucks WHERE truck_id=?',[id]);
    return res.json({ok:true});
  } catch (e) {
    return res.status(500).json({error:e.message || 'Failed to delete truck'});
  }
}

// Drivers CRUD
function listDrivers(req,res){
  const q = `SELECT d.driver_id, d.name, d.phone,
                    d.assigned_truck_id, d.assigned_route_id,
                    t.truck_number AS assigned_truck_number,
                    r.route_name AS assigned_route_name
             FROM Drivers d
             LEFT JOIN Trucks t ON d.assigned_truck_id=t.truck_id
             LEFT JOIN Routes r ON d.assigned_route_id=r.route_id
             ORDER BY d.driver_id ASC`;
  db.query(q,(e,r)=> e?res.status(500).json({error:e}):res.json(r));
}
async function createDriver(req,res){
  const {name,phone,assigned_truck_id,assigned_route_id} = req.body;
  if(!name || !phone){
    return res.status(400).json({error:'Name and phone are required'});
  }

  try {
    return new Promise((resolve) => {
      db.query('INSERT INTO Drivers(name,phone,assigned_truck_id,assigned_route_id) VALUES (?,?,?,?)',[name,phone,assigned_truck_id || null,assigned_route_id || null],(e,result)=> {
        if(e){
          if(e.code === 'ER_DUP_ENTRY'){
            res.status(400).json({error:'Phone number already exists'});
          } else {
            res.status(500).json({error: e.message || 'Failed to create driver'});
          }
        } else {
          res.json({ok:true,driver_id:result.insertId});
        }
        resolve();
      });
    });
  } catch (err) {
    res.status(500).json({error:err.message || 'Failed to hash password'});
  }
}
async function updateDriver(req,res){
  const id=req.params.id;
  const {name,phone,assigned_truck_id,assigned_route_id} = req.body;

  try {
    return new Promise((resolve) => {
      db.query('UPDATE Drivers SET name=?,phone=?,assigned_truck_id=?,assigned_route_id=? WHERE driver_id=?',[name,phone,assigned_truck_id || null,assigned_route_id || null,id],(e,result)=> {
        if(e){
          if(e.code === 'ER_DUP_ENTRY'){
            res.status(400).json({error:'Phone number already exists'});
          } else {
            res.status(500).json({error: e.message || 'Failed to update driver'});
          }
        } else {
          res.json({ok:true});
        }
        resolve();
      });
    });
  } catch (err) {
    res.status(500).json({error:err.message || 'Failed to update driver'});
  }
}
function deleteDriver(req,res){ const id=req.params.id; db.query('DELETE FROM Drivers WHERE driver_id=?',[id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true})); }

// Users
function listUsers(req,res){ 
  const q = `SELECT u.user_id, u.name, u.email, u.created_at
    FROM Users u
    ORDER BY u.user_id ASC`;
  db.query(q,(e,r)=> e?res.status(500).json({error:e}):res.json(r)); 
}

// Collection records
function listCollections(req,res){ const q = `SELECT c.collection_id, c.collection_time, c.waste_amount, c.status, t.truck_number, d.name AS driver_name, a.area_name, w.type_name FROM Collection_Records c LEFT JOIN Trucks t ON c.truck_id=t.truck_id LEFT JOIN Drivers d ON t.driver_id=d.driver_id JOIN Areas a ON c.area_id=a.area_id JOIN Waste_Types w ON c.waste_type_id=w.waste_type_id ORDER BY c.collection_id ASC`; db.query(q,(e,r)=> e?res.status(500).json({error:e}):res.json(r)); }

// Complaints
function listComplaints(req,res){
  const q = `SELECT cp.*, u.name AS user_name, a.area_name, d.name AS assigned_driver_name, COALESCE(rd.name, NULL) AS resolved_by_driver_name, cc.category_name
             FROM Complaints cp
             JOIN Users u ON cp.user_id=u.user_id
             JOIN Areas a ON cp.area_id=a.area_id
             LEFT JOIN Drivers d ON cp.assigned_driver_id=d.driver_id
             LEFT JOIN Drivers rd ON cp.resolved_by_driver_id=rd.driver_id
             LEFT JOIN Complaint_Categories cc ON cp.category_id=cc.category_id
             ORDER BY cp.complaint_id ASC`;
  db.query(q,(e,r)=>{
    if(e){
      console.error('Complaint query error:', e);
      return res.status(500).json({error: e.message || 'Failed to load complaints'});
    }
    res.json(r);
  });
}
function updateComplaintStatus(req,res){ const id=req.params.id; const {status} = req.body; db.query('UPDATE Complaints SET status=? WHERE complaint_id=?',[status,id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true})); }
function assignComplaintToDriver(req,res){
  const id = req.params.id;
  const {driver_id,status='assigned'} = req.body;
  const assignedByAdminId = req.user?.id || null;
  const q = 'UPDATE Complaints SET assigned_driver_id=?, assigned_by_admin_id=?, assigned_at=NOW(), status=?, resolution_type=? WHERE complaint_id=?';
  db.query(q,[driver_id||null,assignedByAdminId,status,driver_id?'driver_assigned':null,id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true}));
}

// Get all complaint categories
function listComplaintCategories(req,res){
  const placeholders = IMPORTANT_COMPLAINT_CATEGORIES.map(() => '?').join(',');
  const orderExpr = IMPORTANT_COMPLAINT_CATEGORIES.map(() => '?').join(',');
  const q = `SELECT * FROM Complaint_Categories
             WHERE category_name IN (${placeholders})
             ORDER BY FIELD(category_name, ${orderExpr})`;
  db.query(q,[...IMPORTANT_COMPLAINT_CATEGORIES, ...IMPORTANT_COMPLAINT_CATEGORIES],(e,r)=> e?res.status(500).json({error:e}):res.json(r));
}

// Handle admin actions on complaints
function handleComplaintAdmin(req,res){
  const id = req.params.id;
  const {action, driver_id, notes, priority, escalation_level} = req.body;
  const adminId = req.user?.id || null;
  
  if(!action) return res.status(400).json({error:'Action required'});

  if(action === 'assign'){
    if(!driver_id) return res.status(400).json({error:'Driver ID required'});
    const q = 'UPDATE Complaints SET assigned_driver_id=?, assigned_by_admin_id=?, assigned_at=NOW(), status=?, resolution_type=?, priority=? WHERE complaint_id=?';
    return db.query(q,[driver_id,adminId,'assigned','driver_assigned',priority||'medium',id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true}));
  }

  if(action === 'close'){
    const clearDriver = req.body.clear_driver === true;
    if(!notes || !String(notes).trim()){
      return res.status(400).json({error:'Closure note is required'});
    }
    const q = 'UPDATE Complaints SET status=?, resolution_type=?, admin_notes=?, resolved_by_driver_id=NULL, resolved_by_driver_at=NULL WHERE complaint_id=?';
    return db.query(q,['resolved','admin_closed',String(notes).trim(),id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true}));
  }

  if(action === 'escalate'){
    const q = 'UPDATE Complaints SET status=?, resolution_type=?, escalation_level=?, admin_notes=?, priority=? WHERE complaint_id=?';
    return db.query(q,['escalated','escalated',escalation_level||1,notes||null,priority||'high',id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true}));
  }

  if(action === 'add-notes'){
    const q = 'UPDATE Complaints SET admin_notes=? WHERE complaint_id=?';
    return db.query(q,[notes||null,id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true}));
  }

  if(action === 'set-priority'){
    const q = 'UPDATE Complaints SET priority=? WHERE complaint_id=?';
    return db.query(q,[priority||'medium',id],(e)=> e?res.status(500).json({error:e}):res.json({ok:true}));
  }

  res.status(400).json({error:'Invalid action'});
}

module.exports = {dashboard,listAreas,createArea,updateArea,deleteArea,listRoutes,createRoute,updateRoute,deleteRoute,listTrucks,createTruck,updateTruck,deleteTruck,listDrivers,createDriver,updateDriver,deleteDriver,listUsers,listCollections,listComplaints,updateComplaintStatus,assignComplaintToDriver,listComplaintCategories,handleComplaintAdmin};
