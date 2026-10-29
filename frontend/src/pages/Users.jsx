import React, {useEffect, useState} from 'react';
import {get} from '../api';

export default function UsersPage(){
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  async function loadUsers(){
    setLoading(true);
    setError('');
    try{
      const rows = await get('/admin/users', token);
      setUsers(rows);
    }catch(e){
      setError(e.message || 'Failed to load users');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ loadUsers(); },[]);

  if(loading) return <div className="page-card">Loading users...</div>;

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="eyebrow">Management</p>
          <h1>Citizens / Users</h1>
          <p className="muted">View all registered citizens and their complaint history.</p>
        </div>
        <button className="ghost-button" onClick={loadUsers}>Refresh</button>
      </div>

      {error && <div className="inline-alert">{error}</div>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {users && users.length > 0
              ? users.map(user => (
                  <tr key={user.user_id}>
                    <td>{user.user_id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{new Date(user.created_at).toLocaleDateString() || 'N/A'}</td>
                  </tr>
                ))
              : <tr><td colSpan="4" style={{textAlign:'center', color:'#999'}}>No users found</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  );
}
