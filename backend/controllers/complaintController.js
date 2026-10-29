const db = require('../db');

function submitComplaint(req,res){
  const {description, category_id, area_id: payloadAreaId} = req.body;
  const userId = req.user.id;
  db.query('SELECT area_id FROM Users WHERE user_id=?',[userId],(userErr,userRows)=>{
    if(userErr) return res.status(500).json({error:userErr});
    if(!userRows || userRows.length===0) return res.status(404).json({error:'User not found'});
    const userAreaId = userRows[0].area_id;
    const areaId = payloadAreaId || userAreaId;
    if(!areaId) return res.status(400).json({error:'User is not linked to an area'});
    db.query(
      'INSERT INTO Complaints(user_id,area_id,description,category_id,status,priority) VALUES (?,?,?,?,?,?)',
      [userId, areaId, description, category_id || null, 'pending', 'medium'],
      (e)=> e?res.status(500).json({error:e}):res.json({ok:true})
    );
  });
}

function listMyComplaints(req,res){
  const userId = req.user.id;
  const q = `SELECT cp.*, a.area_name, d.name AS assigned_driver_name, cc.category_name
             FROM Complaints cp
             JOIN Areas a ON cp.area_id=a.area_id
             LEFT JOIN Drivers d ON cp.assigned_driver_id=d.driver_id
             LEFT JOIN Complaint_Categories cc ON cp.category_id=cc.category_id
             WHERE cp.user_id=?
             ORDER BY cp.complaint_id ASC`;
  db.query(q,[userId],(e,r)=> e?res.status(500).json({error:e}):res.json(r));
}

function listAssignedComplaints(req,res){
  const driverId = req.user.id;
  const q = `SELECT cp.*, u.name AS user_name, a.area_name, cc.category_name
             FROM Complaints cp
             JOIN Users u ON cp.user_id=u.user_id
             JOIN Areas a ON cp.area_id=a.area_id
             LEFT JOIN Complaint_Categories cc ON cp.category_id=cc.category_id
             WHERE cp.assigned_driver_id=?
             AND cp.status IN ('assigned', 'in progress')
             ORDER BY cp.complaint_id ASC`;
  db.query(q,[driverId],(e,r)=> e?res.status(500).json({error:e}):res.json(r));
}

function listDriverHistory(req,res){
  const driverId = req.user.id;
  const q = `SELECT cp.*, u.name AS user_name, a.area_name, cc.category_name
             FROM Complaints cp
             JOIN Users u ON cp.user_id=u.user_id
             JOIN Areas a ON cp.area_id=a.area_id
             LEFT JOIN Complaint_Categories cc ON cp.category_id=cc.category_id
             WHERE cp.resolved_by_driver_id=?
             AND cp.status='resolved'
             ORDER BY cp.complaint_id ASC`;
  db.query(q,[driverId],(e,r)=> e?res.status(500).json({error:e}):res.json(r));
}

function updateDriverComplaintStatus(req,res){
  const driverId = req.user.id;
  const id = req.params.id;
  const {status} = req.body;
  let q = 'UPDATE Complaints SET status=? WHERE complaint_id=? AND assigned_driver_id=?';
  let params = [status,id,driverId];

  if (status === 'resolved') {
    q = 'UPDATE Complaints SET status=?, resolution_type=?, resolved_by_driver_id=?, resolved_by_driver_at=NOW() WHERE complaint_id=? AND assigned_driver_id=?';
    params = ['resolved', 'driver_resolved', driverId, id, driverId];
  }

  db.query(q,params,(e,info)=>{
    if(e) return res.status(500).json({error:e});
    if(info.affectedRows===0) return res.status(404).json({error:'Complaint not found'});
    res.json({ok:true});
  });
}

module.exports = {submitComplaint,listMyComplaints,listAssignedComplaints,listDriverHistory,updateDriverComplaintStatus};