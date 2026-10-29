import React,{useEffect,useState} from 'react';
import {get,post,put} from '../api';

export default function Complaints({role = localStorage.getItem('role') || 'user'}){
  const [complaints,setComplaints]=useState([]);
  const [desc,setDesc]=useState('');
  const [categoryId,setCategoryId]=useState('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [drivers,setDrivers]=useState([]);
  const [categories,setCategories]=useState([]);
  const [areas,setAreas]=useState([]);
  const [areaId,setAreaId]=useState('');
  const [assignmentDrafts,setAssignmentDrafts]=useState({});
  const [adminActionModal,setAdminActionModal]=useState(null);
  const [adminActionData,setAdminActionData]=useState({});

  async function loadData(){
    const token = localStorage.getItem('token');
    try{
      setError('');
      if(role==='admin'){
        const [complaintRows, driverRows, categoryRows] = await Promise.all([
          get('/admin/complaints', token),
          get('/admin/drivers', token),
          get('/complaint-categories', token),
        ]);
        setComplaints(complaintRows);
        setDrivers(driverRows);
        setCategories(categoryRows);
      }else{
        const [complaintRows, categoryRows, areaRows] = await Promise.all([
          get('/complaints/mine', token),
          get('/complaint-categories', token),
          get('/areas', token),
        ]);
        setComplaints(complaintRows);
        setCategories(categoryRows);
        setAreas(areaRows || []);
        // If user already linked to an area, preselect it (optional)
        if(Array.isArray(areaRows) && areaRows.length===1){
          setAreaId(areaRows[0].area_id);
        }
      }
    }catch(e){
      const msg = typeof e === 'string' ? e : (e?.message || 'Failed to load complaints');
      setError(msg);
    }
  }

  useEffect(()=>{ loadData(); },[role]);

  async function submit(){
    try{
      if(!desc.trim()){
        setError('Please describe the issue before submitting.');
        return;
      }
      if(!categoryId){
        setError('Please select a complaint category.');
        return;
      }
      if(!areaId){
        setError('Please select an area for the complaint.');
        return;
      }
      setSaving(true);
      setError('');
      await post('/complaints',{description:desc, category_id:parseInt(categoryId), area_id:parseInt(areaId)}, localStorage.getItem('token'));
      setDesc('');
      setCategoryId('');
      setAreaId('');
      await loadData();
      alert('Complaint submitted');
    }catch(e){
      setError(e.message || 'Failed to submit complaint');
    }finally{
      setSaving(false);
    }
  }

  async function handleAdminAction(){
    try{
      if(!adminActionModal || !adminActionData) return;
      const token = localStorage.getItem('token');
      const action = adminActionModal;
      const complaintId = adminActionData.complaint_id;
      
      const payload = {action};
      if(action==='assign' && adminActionData.driver_id){
        payload.driver_id = adminActionData.driver_id;
        payload.priority = adminActionData.priority || 'medium';
      }else if(action==='close'){
        if(!adminActionData.notes || !adminActionData.notes.trim()){
          setError('Please add a closure note. This note will be visible to the user.');
          return;
        }
        payload.notes = adminActionData.notes || '';
      }

      await put(`/admin/complaints/${complaintId}/handle`, payload, token);
      setAdminActionModal(null);
      setAdminActionData({});
      await loadData();
      alert(`Complaint ${action} successfully`);
    }catch(e){
      const msg = typeof e === 'string' ? e : (e?.message || 'Failed to perform action');
      setError(msg);
    }
  }

  const pageTitle = role === 'admin' ? 'Complaints' : 'My Complaints';
  const pageDescription = role === 'admin'
    ? 'Review incoming complaints and take appropriate action (assign to driver or close with a note).'
    : 'Submit a complaint and track how it is being handled.';
  const driverResolvedCount = complaints.filter(c => c.resolution_type === 'driver_resolved').length;

  return (<section className="page-card">
    <div className="page-header">
      <div>
        <p className="eyebrow">Support</p>
        <h1>{pageTitle}</h1>
        <p className="muted">{pageDescription}</p>
      </div>
    </div>

    {role !== 'admin' && (
      <div className="form-grid">
        <div className="full-span">
          <label>Area</label>
          <select className="control" value={areaId} onChange={e=>setAreaId(e.target.value)}>
            <option value="">Select area</option>
            {areas.map(a=> <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
          </select>
        </div>
        <div className="full-span">
          <label>Category</label>
          <select className="control" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
            <option value="">Select complaint category</option>
            {categories.map(cat=> <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>)}
          </select>
        </div>
        <div className="full-span">
          <label>Complaint details</label>
          <textarea className="control control-textarea" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Describe issue in detail"></textarea>
        </div>
        <div className="form-actions">
          <button className="primary-button" onClick={submit} disabled={saving}>{saving ? 'Submitting...' : 'Submit complaint'}</button>
        </div>
      </div>
    )}

    {error && <div className="inline-alert">{error}</div>}

    {role === 'admin' && driverResolvedCount > 0 && (
      <div className="inline-alert">
        {driverResolvedCount} complaint{driverResolvedCount === 1 ? '' : 's'} have been marked resolved by a driver.
      </div>
    )}

    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Category</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned Driver</th>
            <th>Resolution Update</th>
            {role !== 'admin' && <th>Admin Update</th>}
            {role === 'admin' && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {complaints.map(c=> (
            <tr key={c.complaint_id}>
              <td>{c.complaint_id}</td>
              <td><span style={{fontSize:'12px', background:'#e0e7ff', padding:'4px 8px', borderRadius:'4px'}}>{c.category_name || 'N/A'}</span></td>
              <td>{c.description?.substring(0,50)}...</td>
              <td><span className={`status-pill status-${c.priority.toLowerCase()}`}>{c.priority}</span></td>
              <td><span className={`status-pill status-${c.status}`}>{c.status}</span></td>
              <td>{c.assigned_driver_name || 'Unassigned'}</td>
              <td>
                {c.resolution_type === 'driver_resolved'
                  ? `Resolved by driver${c.resolved_by_driver_name ? ` (${c.resolved_by_driver_name})` : ''}${c.resolved_by_driver_at ? ` on ${new Date(c.resolved_by_driver_at).toLocaleString()}` : ''}`
                  : c.resolution_type === 'admin_closed'
                    ? 'Closed by admin'
                    : '-'}
              </td>
              {role !== 'admin' && <td>{c.admin_notes || '-'}</td>}
              {role === 'admin' && (
                <td>
                  <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                    <button className="action-btn" onClick={()=>{setAdminActionModal('assign'); setAdminActionData({complaint_id:c.complaint_id})}} title="Assign to driver">📋</button>
                    <button className="action-btn" onClick={()=>{setAdminActionModal('close'); setAdminActionData({complaint_id:c.complaint_id})}} title="Mark as closed">✓</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {(!complaints || complaints.length === 0) && <tr><td colSpan="9" style={{textAlign:'center', color:'#999', padding:'20px'}}>No complaints found</td></tr>}
        </tbody>
      </table>
    </div>

    {adminActionModal && (
      <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
        <div style={{background:'white', padding:'24px', borderRadius:'12px', maxWidth:'500px', width:'90%'}}>
          <h3 style={{margin:'0 0 16px 0'}}>
            {adminActionModal==='assign'?'Assign to Driver':
             'Mark as Closed'}
          </h3>

          {adminActionModal==='assign' && (
            <>
              <label style={{display:'block', marginBottom:'12px'}}>Select Driver</label>
              <select className="control" value={adminActionData.driver_id||''} onChange={e=>setAdminActionData({...adminActionData, driver_id:e.target.value})}>
                <option value="">Choose a driver</option>
                {drivers.map(d=> <option key={d.driver_id} value={d.driver_id}>{d.name}</option>)}
              </select>
              <label style={{display:'block', marginTop:'12px', marginBottom:'8px'}}>Priority</label>
              <select className="control" value={adminActionData.priority||'medium'} onChange={e=>setAdminActionData({...adminActionData, priority:e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </>
          )}

          {adminActionModal==='close' && (
            <>
              <label style={{display:'block', marginBottom:'12px'}}>Closure Note (shown to user)</label>
              <textarea className="control control-textarea" style={{minHeight:'80px'}} value={adminActionData.notes||''} onChange={e=>setAdminActionData({...adminActionData, notes:e.target.value})} placeholder="Explain resolution to the user"></textarea>
            </>
          )}

          <div style={{display:'flex', gap:'12px', marginTop:'20px', justifyContent:'flex-end'}}>
            <button style={{background:'#f0f0f0', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer'}} onClick={()=>setAdminActionModal(null)}>Cancel</button>
            <button className="primary-button" onClick={handleAdminAction}>Confirm</button>
          </div>
        </div>
      </div>
    )}
  </section>);
}
