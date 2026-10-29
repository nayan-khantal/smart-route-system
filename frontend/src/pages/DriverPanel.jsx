import React, {useEffect, useState} from 'react';
import {get,post,put} from '../api';

export default function DriverPanel({role = localStorage.getItem('role') || 'driver'}){
  const [complaints,setComplaints]=useState([]);
  const [history,setHistory]=useState([]);
  const [drivers,setDrivers]=useState([]);
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);

  async function loadAssigned(){
    try{
      if(role === 'admin'){
        const rows = await get('/admin/drivers', localStorage.getItem('token'));
        setDrivers(rows);
      }else{
        const [assignedRows, historyRows] = await Promise.all([
          get('/complaints/assigned', localStorage.getItem('token')),
          get('/complaints/history', localStorage.getItem('token')),
        ]);
        setComplaints(assignedRows);
        setHistory(historyRows);
      }
    }catch(e){
      const msg = typeof e === 'string' ? e : (e?.message || 'Failed to load data');
      setError(msg);
    }
  }

  useEffect(()=>{ loadAssigned(); },[role]);

  async function addDriver(){
    try{
      if(!name.trim() || !phone.trim()){
        setError('Name and phone are required.');
        return;
      }
      setSaving(true);
      setError('');
      await post('/admin/drivers', {name, phone}, localStorage.getItem('token'));
      setName('');
      setPhone('');
      await loadAssigned();
    }catch(e){
      setError(e.message || 'Failed to add driver');
    }finally{
      setSaving(false);
    }
  }

  async function updateStatus(complaintId, status){
    try{
      await put(`/complaints/${complaintId}/status`, {status}, localStorage.getItem('token'));
      await loadAssigned();
    }catch(e){
      setError(e.message || 'Failed to update complaint status');
    }
  }

  const title = role === 'admin' ? 'Drivers' : 'Assigned Complaints';
  const description = role === 'admin'
    ? 'Manage driver records and access the drivers list.'
    : 'Complaints assigned by the admin appear here as action items, with resolved work kept in history below.';

  return (<section className="page-card">
    <div className="page-header">
      <div>
        <p className="eyebrow">Field operations</p>
        <h1>{role === 'admin' ? 'Drivers' : title}</h1>
        <p className="muted">{role === 'admin' ? 'Manage driver accounts and access the driver directory.' : description}</p>
      </div>
    </div>

    {error && <div className="inline-alert">{error}</div>}

    {role === 'admin' && (
      <div className="form-grid">
        <div>
          <label>Name</label>
          <input className="control" value={name} onChange={e=>setName(e.target.value)} placeholder="Driver name" />
        </div>
        <div>
          <label>Phone</label>
          <input className="control" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91-9876543210" />
        </div>
        <div className="form-actions">
          <button className="primary-button" onClick={addDriver} disabled={saving}>{saving ? 'Saving...' : 'Add driver'}</button>
        </div>
      </div>
    )}

    <div className="table-card">
      <table>
        {role === 'admin' ? (
          <>
            <thead><tr><th>ID</th><th>Name</th><th>Phone</th></tr></thead>
            <tbody>
              {drivers && drivers.length > 0
                ? drivers.map(driver=> (
                  <tr key={driver.driver_id}>
                    <td>{driver.driver_id}</td>
                    <td>{driver.name}</td>
                    <td>{driver.phone}</td>
                  </tr>
                ))
                : <tr><td colSpan="3" style={{textAlign:'center', color:'#999', padding:'20px'}}>No drivers found. Create one above.</td></tr>
              }
            </tbody>
          </>
        ) : (
          <>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Area</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c=> (
                <tr key={c.complaint_id}>
                  <td>{c.complaint_id}</td>
                  <td>{c.user_name}</td>
                  <td>{c.area_name}</td>
                  <td>{c.description}</td>
                  <td><span className={`status-pill status-${c.status}`}>{c.status}</span></td>
                  <td style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <button className="ghost-button" onClick={()=>updateStatus(c.complaint_id, 'in progress')}>In Progress</button>
                    <button className="primary-button" onClick={()=>updateStatus(c.complaint_id, 'resolved')}>Resolved</button>
                  </td>
                </tr>
              ))}
              {(!complaints || complaints.length === 0) && <tr><td colSpan="6" style={{textAlign:'center', color:'#999', padding:'20px'}}>No assigned complaints</td></tr>}
            </tbody>
          </>
        )}
      </table>
    </div>

    {role !== 'admin' && (
      <div style={{marginTop:'24px'}}>
        <div className="page-header" style={{marginBottom:'12px'}}>
          <div>
            <p className="eyebrow">Resolved work</p>
            <h2 style={{margin:'0'}}>Resolution history</h2>
            <p className="muted">Completed complaints resolved by this driver.</p>
          </div>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Area</th>
                <th>Category</th>
                <th>Resolved At</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{textAlign:'center', padding:'20px'}}>No resolved complaints yet.</td>
                </tr>
              ) : history.map(c=> (
                <tr key={c.complaint_id}>
                  <td>{c.complaint_id}</td>
                  <td>{c.user_name}</td>
                  <td>{c.area_name}</td>
                  <td>{c.category_name || 'N/A'}</td>
                  <td>{c.resolved_by_driver_at ? new Date(c.resolved_by_driver_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </section>);
}
