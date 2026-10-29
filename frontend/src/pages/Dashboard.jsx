import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {get} from '../api';

function StatCard({label, value, tone, to, hint, onClick}) {
  return (
    <article className={`stat-card ${tone} stat-card-clickable`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e)=> e.key === 'Enter' && onClick()}>
      <div className="stat-card-top">
        <span>{label}</span>
        <i className={`stat-dot ${tone === 'accent-sky' ? 'stat-dot-sky' : tone === 'accent-gold' ? 'stat-dot-gold' : tone === 'accent-rose' ? 'stat-dot-rose' : 'stat-dot-emerald'}`} />
      </div>
      <strong>{value}</strong>
      <span className="muted" style={{marginTop:'8px'}}>{hint || `Go to ${to}`}</span>
    </article>
  );
}

export default function Dashboard(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const navigate = useNavigate();

  async function loadDashboard(){
    try{
      setError('');
      const token = localStorage.getItem('token');
      const r = await get('/admin/dashboard', token, {cacheBust:true});
      setData(r);
    }catch(e){
      setError(e.message || 'Failed to load dashboard');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    loadDashboard();
    const timer = setInterval(loadDashboard, 15000);
    return ()=> clearInterval(timer);
  },[]);

  const maxTrendWaste = useMemo(() => {
    const trend = data?.collection_trend || [];
    return trend.reduce((max, row) => Math.max(max, Number(row.total_waste || 0)), 0);
  }, [data]);

  if(loading && !data) return <div className="page-card">Loading dashboard...</div>;
  if(error && !data) return <div className="page-card">{error}</div>;

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Admin Dashboard</h1>
          <p className="muted">Live operational view with collection trends, complaint queue, and area performance highlights.</p>
        </div>
        <button className="ghost-button" onClick={loadDashboard}>Refresh</button>
      </div>

      {error && <div className="inline-alert">{error}</div>}

      <div className="stat-grid">
        <StatCard label="Total Areas" value={data?.total_areas || 0} tone="accent-sky" to="areas" hint="Manage city zones" onClick={()=>navigate('/areas')} />
        <StatCard label="Active Trucks" value={data?.active_trucks || 0} tone="accent-gold" to="trucks" hint="View fleet assignments" onClick={()=>navigate('/trucks')} />
        <StatCard label="Pending Complaints" value={data?.pending_complaints || 0} tone="accent-rose" to="complaints" hint="Review open complaint queue" onClick={()=>navigate('/complaints')} />
        <StatCard label="Waste Collected Today (kg)" value={Number(data?.total_waste_today || 0).toFixed(2)} tone="accent-emerald" to="reports" hint="Open full analytics" onClick={()=>navigate('/reports')} />
      </div>

      <div className="dashboard-split">
        <section className="table-card">
          <div className="table-headline">
            <h3>Recent Collections</h3>
            <button className="ghost-button" onClick={()=>navigate('/collections')}>See all</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Truck</th>
                <th>Driver</th>
                <th>Area</th>
                <th>Waste Type</th>
                <th>Waste (kg)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent_collections?.length ? data.recent_collections.map(row => (
                <tr key={row.collection_id}>
                  <td>{row.collection_time ? new Date(row.collection_time).toLocaleString() : '-'}</td>
                  <td>{row.truck_number || '-'}</td>
                  <td>{row.driver_name || '-'}</td>
                  <td>{row.area_name}</td>
                  <td>{row.type_name}</td>
                  <td>{row.waste_amount}</td>
                  <td><span className={`status-pill status-${row.status}`}>{row.status}</span></td>
                </tr>
              )) : <tr><td colSpan="7" style={{textAlign:'center', color:'#999'}}>No recent collection activity.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="table-card">
          <div className="table-headline">
            <h3>Pending Complaints Preview</h3>
            <button className="ghost-button" onClick={()=>navigate('/complaints')}>Open queue</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Area</th>
                <th>Category</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {data?.pending_complaints_preview?.length ? data.pending_complaints_preview.map(row => (
                <tr key={row.complaint_id}>
                  <td>{row.complaint_id}</td>
                  <td>{row.user_name}</td>
                  <td>{row.area_name}</td>
                  <td>{row.category_name || 'General'}</td>
                  <td><span className={`status-pill status-${row.priority}`}>{row.priority || 'medium'}</span></td>
                </tr>
              )) : <tr><td colSpan="5" style={{textAlign:'center', color:'#999'}}>No pending complaints.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      <div className="dashboard-split" style={{marginTop:'18px'}}>
        <section className="table-card">
          <div className="table-headline">
            <h3>Collection Trend (Last 7 Days)</h3>
          </div>
          <div className="trend-list">
            {(data?.collection_trend || []).map((row) => {
              const value = Number(row.total_waste || 0);
              const width = maxTrendWaste > 0 ? (value / maxTrendWaste) * 100 : 0;
              return (
                <div key={row.day} className="trend-item">
                  <div className="trend-meta">
                    <span>{row.day}</span>
                    <strong>{value.toFixed(2)} kg</strong>
                  </div>
                  <div className="trend-bar">
                    <i style={{width: `${width}%`}} />
                  </div>
                </div>
              );
            })}
            {!data?.collection_trend?.length && <p className="muted">No trend data found.</p>}
          </div>
        </section>

        <section className="table-card">
          <div className="table-headline">
            <h3>Area Performance Highlights</h3>
            <button className="ghost-button" onClick={()=>navigate('/reports')}>Detailed report</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>Collections</th>
                <th>Total Waste (kg)</th>
              </tr>
            </thead>
            <tbody>
              {data?.area_performance?.length ? data.area_performance.map((row) => (
                <tr key={row.area_id}>
                  <td>{row.area_name}</td>
                  <td>{row.collection_count}</td>
                  <td>{Number(row.total_waste || 0).toFixed(2)}</td>
                </tr>
              )) : <tr><td colSpan="3" style={{textAlign:'center', color:'#999'}}>No area performance data available.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
