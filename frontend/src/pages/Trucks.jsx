import React, {useEffect, useState} from 'react';
import {get, post} from '../api';

export default function TrucksPage(){
  const [trucks, setTrucks] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [truckNumber, setTruckNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [driverId, setDriverId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadData(){
    try{
      const [truckRows, routeRows, driverRows] = await Promise.all([
        get('/admin/trucks', localStorage.getItem('token')),
        get('/admin/routes', localStorage.getItem('token')),
        get('/admin/drivers', localStorage.getItem('token')),
      ]);
      setTrucks(truckRows);
      setRoutes(routeRows);
      setDrivers(driverRows);
    }catch(e){
      setError(e.message || 'Failed to load truck data');
    }
  }

  useEffect(()=>{ loadData(); },[]);

  async function addTruck(){
    try{
      if(!truckNumber.trim()){
        setError('Truck number is required.');
        return;
      }
      setSaving(true);
      setError('');
      await post('/admin/trucks', {
        truck_number: truckNumber,
        capacity: capacity || 0,
        driver_id: driverId || null,
        route_id: routeId || null,
      }, localStorage.getItem('token'));
      setTruckNumber('');
      setCapacity('');
      setDriverId('');
      setRouteId('');
      await loadData();
    }catch(e){
      setError(e.message || 'Failed to add truck');
    }finally{
      setSaving(false);
    }
  }

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="eyebrow">Fleet</p>
          <h1>Trucks</h1>
          <p className="muted">Assign trucks to drivers and routes.</p>
        </div>
      </div>

      <div className="form-grid">
        <div>
          <label>Truck number</label>
          <input className="control" value={truckNumber} onChange={e=>setTruckNumber(e.target.value)} placeholder="KA-09-AB-1234" />
        </div>
        <div>
          <label>Capacity</label>
          <input className="control" value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="8.5" />
        </div>
        <div>
          <label>Driver</label>
          <select className="control" value={driverId} onChange={e=>setDriverId(e.target.value)}>
            <option value="">Select driver</option>
            {drivers.map(driver => <option key={driver.driver_id} value={driver.driver_id}>{driver.name}</option>)}
          </select>
        </div>
        <div>
          <label>Route</label>
          <select className="control" value={routeId} onChange={e=>setRouteId(e.target.value)}>
            <option value="">Select route</option>
            {routes.map(route => <option key={route.route_id} value={route.route_id}>{route.route_name}</option>)}
          </select>
        </div>
        <div className="form-actions">
          <button className="primary-button" onClick={addTruck} disabled={saving}>{saving ? 'Saving...' : 'Add truck'}</button>
        </div>
      </div>

      {error && <div className="inline-alert">{error}</div>}

      <div className="table-card">
        <table>
          <thead><tr><th>ID</th><th>Truck</th><th>Driver</th><th>Route</th><th>Capacity</th></tr></thead>
          <tbody>
            {trucks && trucks.length > 0
              ? trucks.map(truck => <tr key={truck.truck_id}><td>{truck.truck_id}</td><td>{truck.truck_number}</td><td>{truck.driver_name || 'Unassigned'}</td><td>{truck.route_name || 'Unassigned'}</td><td>{truck.capacity}</td></tr>)
              : <tr><td colSpan="5" style={{textAlign:'center', color:'#999'}}>No trucks found. Create one above.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  );
}
