import React, {useEffect, useState} from 'react';
import {get, post} from '../api';

export default function RoutesPage(){
  const [routes, setRoutes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadRoutes(){
    try{
      const [routeRows, areaRows] = await Promise.all([
        get('/admin/routes', localStorage.getItem('token')),
        get('/admin/areas', localStorage.getItem('token')),
      ]);
      setRoutes(routeRows);
      setAreas(areaRows);
    }catch(e){
      setError(e.message || 'Failed to load routes');
    }
  }

  useEffect(()=>{ loadRoutes(); },[]);

  async function addRoute(){
    try{
      if(!name.trim()){
        setError('Route name is required.');
        return;
      }
      setSaving(true);
      setError('');
      await post('/admin/routes', {route_name:name, zone, area_ids:selectedAreas}, localStorage.getItem('token'));
      setName('');
      setZone('');
      setSelectedAreas([]);
      await loadRoutes();
    }catch(e){
      setError(e.message || 'Failed to add route');
    }finally{
      setSaving(false);
    }
  }

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="eyebrow">Network</p>
          <h1>Routes</h1>
          <p className="muted">Create and review service routes.</p>
        </div>
      </div>

      <div className="form-grid">
        <div>
          <label>Route name</label>
          <input className="control" value={name} onChange={e=>setName(e.target.value)} placeholder="Route A" />
        </div>
        <div>
          <label>Zone</label>
          <input className="control" value={zone} onChange={e=>setZone(e.target.value)} placeholder="West" />
        </div>
        <div style={{gridColumn:'1 / -1'}}>
          <label>Areas on this route</label>
          <div className="route-area-picker">
            {areas.length > 0 ? areas.map(area => {
              const checked = selectedAreas.includes(String(area.area_id));
              return (
                <label key={area.area_id} className={`route-area-chip ${checked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      setSelectedAreas(prev => e.target.checked
                        ? [...prev, String(area.area_id)]
                        : prev.filter(id => id !== String(area.area_id))
                      );
                    }}
                  />
                  <span>{area.area_name} <small>({area.zone})</small></span>
                </label>
              );
            }) : <p className="muted">No areas available yet.</p>}
          </div>
        </div>
        <div className="form-actions">
          <button className="primary-button" onClick={addRoute} disabled={saving}>{saving ? 'Saving...' : 'Add route'}</button>
        </div>
      </div>

      {error && <div className="inline-alert">{error}</div>}

      <div className="table-card">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Zone</th><th>Areas Covered</th></tr></thead>
          <tbody>
            {routes && routes.length > 0
              ? routes.map(route => <tr key={route.route_id}><td>{route.route_id}</td><td>{route.route_name}</td><td>{route.zone}</td><td>{route.area_names || 'Not Assigned'}</td></tr>)
              : <tr><td colSpan="4" style={{textAlign:'center', color:'#999'}}>No routes found. Create one above.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  );
}
