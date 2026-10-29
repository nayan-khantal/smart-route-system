import React, { useEffect, useState } from 'react';
import { get, post } from '../api';

export default function CollectionsPage({ role = localStorage.getItem('role') || 'driver' }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [records, setRecords] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [areaWise, setAreaWise] = useState([]);
  const [truckWise, setTruckWise] = useState([]);

  const [context, setContext] = useState({ trucks: [], routeAreas: [], wasteTypes: [] });
  const [form, setForm] = useState({
    truck_id: '',
    area_id: '',
    waste_type_id: '',
    waste_amount: '',
    status: 'completed',
  });

  async function loadAdminData(token) {
    const [allRows, todayRows, areaRows, truckRows] = await Promise.all([
      get('/collections', token),
      get('/collections/today', token),
      get('/collections/area-wise', token),
      get('/collections/truck-wise', token),
    ]);
    setRecords(allRows);
    setTodayRecords(todayRows);
    setAreaWise(areaRows);
    setTruckWise(truckRows);
  }

  async function loadDriverData(token) {
    const [driverContext, todayRows, allRows] = await Promise.all([
      get('/collections/driver-context', token),
      get('/collections/today', token),
      get('/collections', token),
    ]);

    setContext(driverContext);
    setTodayRecords(todayRows);
    setRecords(allRows);

    const defaultTruck = driverContext.trucks?.[0]?.truck_id || '';
    const defaultArea = driverContext.routeAreas?.[0]?.area_id || '';
    const defaultWasteType = driverContext.wasteTypes?.[0]?.waste_type_id || '';

    setForm((prev) => ({
      ...prev,
      truck_id: prev.truck_id || String(defaultTruck || ''),
      area_id: prev.area_id || String(defaultArea || ''),
      waste_type_id: prev.waste_type_id || String(defaultWasteType || ''),
    }));
  }

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (role === 'admin') {
        await loadAdminData(token);
      } else {
        await loadDriverData(token);
      }
    } catch (e) {
      setError(e.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [role]);

  async function submitCollection(e) {
    e.preventDefault();
    if (!form.truck_id || !form.area_id || !form.waste_type_id || !form.waste_amount) {
      setError('Please fill all collection fields.');
      return;
    }

    const amount = Number(form.waste_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Waste amount must be greater than 0.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const token = localStorage.getItem('token');
      await post('/collections', {
        truck_id: Number(form.truck_id),
        area_id: Number(form.area_id),
        waste_type_id: Number(form.waste_type_id),
        waste_amount: amount,
        status: form.status,
      }, token);

      setForm((prev) => ({ ...prev, waste_amount: '' }));
      await loadData();
    } catch (e) {
      setError(e.message || 'Failed to save collection record');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-card">Loading collections...</div>;

  if (role === 'driver') {
    const assignedTruck = context.trucks?.[0];

    return (
      <section className="page-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Driver workflow</p>
            <h1>Waste Collections</h1>
            <p className="muted">Submit waste collection records for your assigned route and truck.</p>
          </div>
          <button className="ghost-button" onClick={loadData}>Refresh</button>
        </div>

        {error && <div className="inline-alert">{error}</div>}

        <div className="table-card" style={{ marginBottom: '18px' }}>
          <table>
            <thead>
              <tr>
                <th>Assigned Truck</th>
                <th>Route</th>
                <th>Zone</th>
                <th>Capacity (kg)</th>
              </tr>
            </thead>
            <tbody>
              {assignedTruck ? (
                <tr>
                  <td>{assignedTruck.truck_number}</td>
                  <td>{assignedTruck.route_name || '-'}</td>
                  <td>{assignedTruck.zone || '-'}</td>
                  <td>{assignedTruck.capacity}</td>
                </tr>
              ) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>No truck assigned to this driver.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form className="form-grid" onSubmit={submitCollection}>
          <div>
            <label>Truck</label>
            <select className="control" value={form.truck_id} onChange={(e) => setForm({ ...form, truck_id: e.target.value })}>
              <option value="">Select truck</option>
              {context.trucks.map((truck) => (
                <option key={truck.truck_id} value={truck.truck_id}>{truck.truck_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Area</label>
            <select className="control" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
              <option value="">Select area</option>
              {context.routeAreas.map((area) => (
                <option key={area.area_id} value={area.area_id}>{area.area_name} (Seq {area.sequence_number})</option>
              ))}
            </select>
          </div>

          <div>
            <label>Waste Type</label>
            <select className="control" value={form.waste_type_id} onChange={(e) => setForm({ ...form, waste_type_id: e.target.value })}>
              <option value="">Select waste type</option>
              {context.wasteTypes.map((waste) => (
                <option key={waste.waste_type_id} value={waste.waste_type_id}>{waste.type_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Waste Amount (kg)</label>
            <input
              className="control"
              type="number"
              min="0.1"
              step="0.1"
              value={form.waste_amount}
              onChange={(e) => setForm({ ...form, waste_amount: e.target.value })}
              placeholder="Enter amount in kg"
            />
          </div>

          <div>
            <label>Collection Status</label>
            <select className="control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="completed">Completed</option>
              <option value="partial">Partial</option>
              <option value="missed">Missed</option>
            </select>
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit Collection'}</button>
          </div>
        </form>

        <div className="table-card" style={{ marginTop: '22px' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Area</th>
                <th>Waste Type</th>
                <th>Amount (kg)</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {todayRecords.length > 0 ? todayRecords.map((row) => (
                <tr key={row.collection_id}>
                  <td>{row.collection_id}</td>
                  <td>{row.area_name}</td>
                  <td>{row.type_name}</td>
                  <td>{row.waste_amount}</td>
                  <td><span className={`status-pill status-${row.status}`}>{row.status}</span></td>
                  <td>{row.collection_time ? new Date(row.collection_time).toLocaleString() : '-'}</td>
                </tr>
              )) : <tr><td colSpan="6" style={{ textAlign: 'center', color: '#999' }}>No collections submitted today.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Collection Records</h1>
          <p className="muted">Track all truck-based waste collection activity across Mysuru.</p>
        </div>
        <button className="ghost-button" onClick={loadData}>Refresh</button>
      </div>

      {error && <div className="inline-alert">{error}</div>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Record ID</th>
              <th>Time</th>
              <th>Truck</th>
              <th>Driver</th>
              <th>Area</th>
              <th>Waste Type</th>
              <th>Amount (kg)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? records.map((row) => (
              <tr key={row.collection_id}>
                <td>{row.collection_id}</td>
                <td>{row.collection_time ? new Date(row.collection_time).toLocaleString() : '-'}</td>
                <td>{row.truck_number || '-'}</td>
                <td>{row.driver_name || '-'}</td>
                <td>{row.area_name}</td>
                <td>{row.type_name}</td>
                <td>{row.waste_amount}</td>
                <td><span className={`status-pill status-${row.status}`}>{row.status}</span></td>
              </tr>
            )) : <tr><td colSpan="8" style={{ textAlign: 'center', color: '#999' }}>No collection records found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '10px' }}>Area-wise Collection</h3>
        <div className="table-card">
          <table>
            <thead><tr><th>Area</th><th>Zone</th><th>Total Collections</th><th>Total Waste (kg)</th></tr></thead>
            <tbody>
              {areaWise.length > 0 ? areaWise.map((row) => (
                <tr key={row.area_id}>
                  <td>{row.area_name}</td>
                  <td>{row.zone}</td>
                  <td>{row.total_collections}</td>
                  <td>{row.total_waste}</td>
                </tr>
              )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>No area-wise data available.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '10px' }}>Truck-wise Collection</h3>
        <div className="table-card">
          <table>
            <thead><tr><th>Truck</th><th>Driver</th><th>Total Collections</th><th>Total Waste (kg)</th></tr></thead>
            <tbody>
              {truckWise.length > 0 ? truckWise.map((row) => (
                <tr key={row.truck_id}>
                  <td>{row.truck_number}</td>
                  <td>{row.driver_name || '-'}</td>
                  <td>{row.total_collections}</td>
                  <td>{row.total_waste}</td>
                </tr>
              )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>No truck-wise data available.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
