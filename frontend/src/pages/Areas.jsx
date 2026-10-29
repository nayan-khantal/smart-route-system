import React, {useEffect, useState} from 'react';
import {get,post} from '../api';

export default function Areas(){
  const [areas,setAreas]=useState([]);
  const [name,setName]=useState('');
  const [zone,setZone]=useState('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{ get('/areas').then(r=>setAreas(r)); },[]);
  async function add(){
    try{
      if(!name.trim() || !zone.trim()){
        setError('Area name and zone are required.');
        return;
      }
      setSaving(true);
      setError('');
      const token = localStorage.getItem('token');
      await post('/admin/areas',{area_name:name,zone,population:0}, token);
      const r = await get('/areas');
      setAreas(r);
      setName('');
      setZone('');
    }catch(e){
      setError(e.message || 'Failed to add area');
    }finally{
      setSaving(false);
    }
  }
  return (<section className="page-card">
    <div className="page-header">
      <div>
        <p className="eyebrow">Registry</p>
        <h1>Areas</h1>
        <p className="muted">Create and review service areas across the city.</p>
      </div>
    </div>

    <div className="form-grid">
      <div>
        <label>Area name</label>
        <input className="control" placeholder="e.g. Kuvempunagar" value={name} onChange={e=>setName(e.target.value)} />
      </div>
      <div>
        <label>Zone</label>
        <input className="control" placeholder="e.g. West" value={zone} onChange={e=>setZone(e.target.value)} />
      </div>
      <div className="form-actions">
        <button className="primary-button" onClick={add} disabled={saving}>{saving ? 'Saving...' : 'Add area'}</button>
      </div>
    </div>

    {error && <div className="inline-alert">{error}</div>}

    <div className="table-card">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Zone</th></tr></thead>
        <tbody>
          {areas && areas.length > 0
            ? areas.map(a=> <tr key={a.area_id}><td>{a.area_id}</td><td>{a.area_name}</td><td>{a.zone}</td></tr>)
            : <tr><td colSpan="3" style={{textAlign:'center', color:'#999'}}>No areas found. Create one above.</td></tr>
          }
        </tbody>
      </table>
    </div>
  </section>);
}
