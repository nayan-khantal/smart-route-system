import React from 'react';
import { NavLink } from 'react-router-dom';
const NAV_BY_ROLE = {
  admin: [
    {key:'dashboard', path:'/dashboard', label:'Dashboard'},
    {key:'areas', path:'/areas', label:'Areas'},
    {key:'routes', path:'/routes', label:'Routes'},
    {key:'trucks', path:'/trucks', label:'Trucks'},
    {key:'drivers', path:'/drivers', label:'Drivers'},
    {key:'collections', path:'/collections', label:'Collections'},
    {key:'users', path:'/users', label:'Users'},
    {key:'complaints', path:'/complaints', label:'Complaints'},
    {key:'reports', path:'/reports', label:'Reports'},
  ],
  user: [
    {key:'complaints', path:'/complaints', label:'My Complaints'},
  ],
  driver: [
    {key:'driver', path:'/driver', label:'Assigned Complaints'},
    {key:'collections', path:'/collections', label:'Waste Collections'},
  ],
};

export default function Sidebar({role,onLogout}){
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.user;
  const roleLabel = role === 'admin' ? 'Admin' : role === 'driver' ? 'Driver' : 'Citizen';
  return (<aside className="sidebar">
    <div className="brand-block">
      <div className="brand-mark">WP</div>
      <div>
        <h2>WastePilot</h2>
        <p className="sidebar-subtitle">Operations dashboard</p>
        <span className={`role-badge role-${role}`}>{roleLabel}</span>
      </div>
    </div>

    <nav className="nav-list" aria-label="Primary">
      {navItems.map(item => (
        <NavLink
          key={item.key}
          className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
          to={item.path}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>

    <button className="nav-item logout-button" onClick={onLogout}>Logout</button>
  </aside>);
}