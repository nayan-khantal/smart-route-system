import React, {useMemo, useState} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Areas from './pages/Areas';
import Complaints from './pages/Complaints';
import DriverPanel from './pages/DriverPanel';
import RoutesPage from './pages/Routes';
import TrucksPage from './pages/Trucks';
import ReportsPage from './pages/Reports';
import UsersPage from './pages/Users';
import CollectionsPage from './pages/Collections';

const ROLE_VIEWS = {
  admin: [
    'dashboard',
    'areas',
    'routes',
    'trucks',
    'drivers',
    'collections',
    'users',
    'complaints',
    'reports',
  ],
  user: ['complaints'],
  driver: ['driver', 'collections'],
};

const ROLE_DEFAULT_VIEW = {
  admin: '/dashboard',
  user: '/complaints',
  driver: '/driver',
};

export default function App(){
  const [role,setRole]=useState(localStorage.getItem('role') || 'user');
  const [loggedIn,setLoggedIn]=useState(!!localStorage.getItem('token'));

  const allowedViews = useMemo(() => ROLE_VIEWS[role] || ROLE_VIEWS.user, [role]);

  React.useEffect(() => {
    document.title = 'WastePilot';
  }, []);

  if(!loggedIn) {
    return <Login onLogin={(nextRole)=>{ setRole(nextRole || 'user'); setLoggedIn(true); }} />;
  }

  function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setLoggedIn(false);
    setRole('user');
  }

  return (<div className="app-shell">
    <Sidebar role={role} onLogout={logout} />
    <main className="workspace">
      <Routes>
        <Route path="/" element={<Navigate to={ROLE_DEFAULT_VIEW[role] || ROLE_DEFAULT_VIEW.user} replace />} />

        <Route path="/dashboard" element={allowedViews.includes('dashboard') ? <Dashboard /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/areas" element={allowedViews.includes('areas') ? <Areas /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/routes" element={allowedViews.includes('routes') ? <RoutesPage /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/trucks" element={allowedViews.includes('trucks') ? <TrucksPage /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/drivers" element={allowedViews.includes('drivers') ? <DriverPanel role={role} /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/collections" element={allowedViews.includes('collections') ? <CollectionsPage role={role} /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/users" element={allowedViews.includes('users') ? <UsersPage /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/complaints" element={allowedViews.includes('complaints') ? <Complaints role={role} /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/reports" element={allowedViews.includes('reports') ? <ReportsPage /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />
        <Route path="/driver" element={allowedViews.includes('driver') ? <DriverPanel role={role} /> : <Navigate to={ROLE_DEFAULT_VIEW[role]} replace />} />

        <Route path="*" element={<Navigate to={ROLE_DEFAULT_VIEW[role] || ROLE_DEFAULT_VIEW.user} replace />} />
      </Routes>
    </main>
  </div>);
}
