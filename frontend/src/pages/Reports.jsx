import React, {useEffect, useMemo, useState} from 'react';
import {get} from '../api';

export default function ReportsPage(){
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState({ top_drivers: [], waste_type_distribution: [], daily_trend: [] });
  const [areaWise, setAreaWise] = useState([]);
  const [topAreas, setTopAreas] = useState([]);
  const [driverWise, setDriverWise] = useState([]);
  const [truckWise, setTruckWise] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(()=>{
    loadReports();
  },[]);

  async function loadReports(){
    setLoading(true);
    setError('');
    try{
      const [s, i, a, t, d, tw] = await Promise.all([
        get('/reports/summary', token),
        get('/reports/insights', token),
        get('/reports/area-wise', token),
        get('/reports/highest-areas', token),
        get('/reports/drivers', token),
        get('/reports/truck-wise', token),
      ]);
      setSummary(s);
      setInsights(i || { top_drivers: [], waste_type_distribution: [], daily_trend: [] });
      setAreaWise(a || []);
      setTopAreas(t || []);
      setDriverWise(d || []);
      setTruckWise(tw || []);
    }catch(e){
      setError(e.message || 'Failed to load reports');
    }finally{
      setLoading(false);
    }
  }

  const maxAreaWaste = useMemo(() => topAreas.reduce((max, row) => Math.max(max, Number(row.total_waste || 0)), 0), [topAreas]);
  const maxTrendWaste = useMemo(() => (insights.daily_trend || []).reduce((max, row) => Math.max(max, Number(row.total_waste || 0)), 0), [insights]);

  if(loading) return <div className="page-card">Loading reports...</div>;

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Admin Reports</h1>
          <p className="muted">Insight-driven reporting for waste operations, fleet utilization, and complaint handling.</p>
        </div>
        <button className="ghost-button" onClick={loadReports}>Refresh</button>
      </div>

      {error && <div className="inline-alert">{error}</div>}

      <div className="stat-grid">
        <article className="stat-card accent-gold">
          <div className="stat-card-top">
            <span>Total Waste Collected</span>
            <i className="stat-dot stat-dot-gold" />
          </div>
          <strong>{Number(summary?.total_waste_collected || 0).toFixed(2)} kg</strong>
        </article>
        <article className="stat-card accent-emerald">
          <div className="stat-card-top">
            <span>Waste Collected Today</span>
            <i className="stat-dot stat-dot-emerald" />
          </div>
          <strong>{Number(summary?.total_waste_today || 0).toFixed(2)} kg</strong>
        </article>
        <article className="stat-card accent-sky">
          <div className="stat-card-top">
            <span>Active Trucks</span>
            <i className="stat-dot stat-dot-sky" />
          </div>
          <strong>{summary?.active_trucks || 0}</strong>
        </article>
        <article className="stat-card accent-rose">
          <div className="stat-card-top">
            <span>Pending Complaints</span>
            <i className="stat-dot stat-dot-rose" />
          </div>
          <strong>{summary?.pending_complaints || 0}</strong>
        </article>
      </div>

      <div className="report-kpi-strip">
        <div className="report-kpi-item">
          <span>Highest Waste Generating Area</span>
          <strong>{summary?.highest_waste_area || '-'}</strong>
        </div>
        <div className="report-kpi-item">
          <span>Total Collection Records</span>
          <strong>{summary?.total_collection_records || 0}</strong>
        </div>
        <div className="report-kpi-item">
          <span>Yesterday Waste</span>
          <strong>{Number(summary?.total_waste_yesterday || 0).toFixed(2)} kg</strong>
        </div>
      </div>

      <div className="dashboard-split" style={{marginTop:'18px'}}>
        <section className="table-card">
          <div className="table-headline">
            <h3>Top Waste Generating Areas</h3>
          </div>
          <div className="trend-list">
            {topAreas.map((row) => {
              const value = Number(row.total_waste || 0);
              const width = maxAreaWaste > 0 ? (value / maxAreaWaste) * 100 : 0;
              return (
                <div className="trend-item" key={row.area_id}>
                  <div className="trend-meta">
                    <span>{row.area_name}</span>
                    <strong>{value.toFixed(2)} kg</strong>
                  </div>
                  <div className="trend-bar"><i style={{width: `${width}%`}} /></div>
                </div>
              );
            })}
            {!topAreas.length && <p className="muted">No area-wise data available.</p>}
          </div>
        </section>

        <section className="table-card">
          <div className="table-headline">
            <h3>Waste Type Distribution</h3>
          </div>
          <div className="trend-list">
            {(insights.waste_type_distribution || []).map((row) => (
              <div className="trend-item" key={row.waste_type_id}>
                <div className="trend-meta">
                  <span>{row.type_name}</span>
                  <strong>{Number(row.percentage || 0).toFixed(2)}%</strong>
                </div>
                <div className="trend-bar"><i style={{width: `${Math.min(100, Number(row.percentage || 0))}%`}} /></div>
              </div>
            ))}
            {!insights.waste_type_distribution?.length && <p className="muted">No waste type distribution data available.</p>}
          </div>
        </section>
      </div>

      <div className="dashboard-split" style={{marginTop:'18px'}}>
        <section className="table-card">
          <div className="table-headline">
            <h3>Area-wise Waste Collection</h3>
          </div>
          <table>
            <thead><tr><th>Area</th><th>Zone</th><th>Collections</th><th>Total Waste (kg)</th></tr></thead>
            <tbody>
              {areaWise.length
                ? areaWise.map(row => <tr key={row.area_id}><td>{row.area_name}</td><td>{row.zone}</td><td>{row.total_collections || 0}</td><td>{Number(row.total_waste || 0).toFixed(2)}</td></tr>)
                : <tr><td colSpan="4" style={{textAlign:'center', color:'#999'}}>No data available.</td></tr>
              }
            </tbody>
          </table>
        </section>

        <section className="table-card">
          <div className="table-headline">
            <h3>Daily Collection Trend</h3>
          </div>
          <div className="trend-list">
            {(insights.daily_trend || []).map((row) => {
              const value = Number(row.total_waste || 0);
              const width = maxTrendWaste > 0 ? (value / maxTrendWaste) * 100 : 0;
              return (
                <div className="trend-item" key={row.day}>
                  <div className="trend-meta">
                    <span>{row.day}</span>
                    <strong>{value.toFixed(2)} kg</strong>
                  </div>
                  <div className="trend-bar"><i style={{width: `${width}%`}} /></div>
                </div>
              );
            })}
            {!insights.daily_trend?.length && <p className="muted">No daily trend available.</p>}
          </div>
        </section>
      </div>

      <div className="dashboard-split" style={{marginTop:'18px'}}>
        <section className="table-card">
          <div className="table-headline">
            <h3>Driver-wise Collection Summary</h3>
          </div>
          <table>
            <thead><tr><th>Driver</th><th>Collections</th><th>Total Waste (kg)</th></tr></thead>
            <tbody>
              {driverWise.length
                ? driverWise.map(row => <tr key={row.driver_id}><td>{row.name}</td><td>{row.total_collections || 0}</td><td>{Number(row.total_waste || 0).toFixed(2)}</td></tr>)
                : <tr><td colSpan="3" style={{textAlign:'center', color:'#999'}}>No driver data available.</td></tr>
              }
            </tbody>
          </table>
        </section>

        <section className="table-card">
          <div className="table-headline">
            <h3>Truck-wise Collection Summary</h3>
          </div>
          <table>
            <thead><tr><th>Truck</th><th>Driver</th><th>Collections</th><th>Total Waste (kg)</th></tr></thead>
            <tbody>
              {truckWise.length
                ? truckWise.map(row => <tr key={row.truck_id}><td>{row.truck_number}</td><td>{row.driver_name || '-'}</td><td>{row.total_collections || 0}</td><td>{Number(row.total_waste || 0).toFixed(2)}</td></tr>)
                : <tr><td colSpan="4" style={{textAlign:'center', color:'#999'}}>No truck data available.</td></tr>
              }
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
