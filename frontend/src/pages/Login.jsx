import React, {useEffect, useState} from 'react';
import {post} from '../api';

export default function Login({onLogin}){
  const [role,setRole]=useState('user');
  const [citizenMode,setCitizenMode]=useState('login');
  const [username,setUsername]=useState('');
  const [phone,setPhone]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    setError('');
    setCitizenMode('login');
  },[role]);

  async function submit(e){
    e.preventDefault();
    setError('');
    
    // Frontend validation
    if(!username.trim()){
      setError(role==='user'? 'Gmail is required' : role==='driver'? 'Driver name is required' : 'Username is required');
      return;
    }
    if(role === 'user'){
      const gmail = String(username).trim().toLowerCase();
      const gmailPattern = /^[a-z0-9._%+-]+@gmail\.com$/;
      if(!gmailPattern.test(gmail)){
        setError('Please enter a valid Gmail address');
        return;
      }
    }
    if(role === 'driver'){
      const cleanedPhone = String(phone || '').replace(/\D/g, '');
      if(!cleanedPhone){
        setError('Phone number is required for driver login');
        return;
      }
      if(cleanedPhone.length < 10){
        setError('Please enter a valid phone number');
        return;
      }
    }
    if(role === 'admin' && !password.trim()){
      setError('Password is required');
      return;
    }
    
    setLoading(true);
    try{
      if(role==='user'){
        const email = String(username).trim().toLowerCase();
        const payload = {email};
        if(citizenMode === 'create'){
          try{
            const r = await post('/register', {email, name: ''});
            if(r.token){
              localStorage.setItem('token',r.token);
              localStorage.setItem('role',role);
              onLogin(role);
            }
          }catch(regErr){
            const msg = regErr.message || '';
            if(msg.toLowerCase().includes('already exists')){
              // fallback to login
              const r = await post('/login/user', payload);
              if(r.token){
                localStorage.setItem('token',r.token);
                localStorage.setItem('role',role);
                onLogin(role);
              }
            } else {
              throw regErr;
            }
          }
        } else {
          const r = await post('/login/user', payload);
          if(r.token){
            localStorage.setItem('token',r.token);
            localStorage.setItem('role',role);
            onLogin(role);
          }
        }
      } else if(role==='driver'){
        const payload = {name:username, phone:String(phone).replace(/\D/g, '')};
        const r = await post('/login/driver',payload);
        if(r.token){
          localStorage.setItem('token',r.token);
          localStorage.setItem('role',role);
          onLogin(role);
        }
      } else {
        const r = await post('/login/admin',{username,password});
        if(r.token){
          localStorage.setItem('token',r.token);
          localStorage.setItem('role',role);
          onLogin(role);
        }
      }
    }catch(err){
      setError(err.message || 'Invalid Credentials');
    }finally{
      setLoading(false);
    }
  }

  return (<div className="auth-shell">
    <section className="auth-hero">
      <div className="auth-hero-copy">
        <div className="auth-kicker">Waste management intelligence</div>
        <h1>Command city cleanup from one calm control center.</h1>
        <p>
          Manage complaints, drivers, routes, and daily collection work from a dashboard built to feel clear, fast, and dependable.
        </p>

        <div className="hero-chip-row">
          <span className="hero-chip">Live operations</span>
          <span className="hero-chip">Driver workflow</span>
          <span className="hero-chip">Complaint tracking</span>
        </div>

        <div className="auth-metrics">
          <div>
            <strong>Live</strong>
            <span>Dashboard refresh</span>
          </div>
          <div>
            <strong>Secure</strong>
            <span>Role-based access</span>
          </div>
          <div>
            <strong>Simple</strong>
            <span>Admin-first controls</span>
          </div>
        </div>
      </div>

      <div className="hero-surface hero-surface-large">
        <div>
          <span className="hero-surface-label">Live city pulse</span>
          <strong>One login for the full field team.</strong>
        </div>
        <ul>
          <li>Admins assign and close complaints in seconds.</li>
          <li>Drivers see active work and resolved history.</li>
          <li>Citizens track complaint status without clutter.</li>
        </ul>
      </div>
    </section>

    <section className="auth-card">
      <div className="auth-card-header">
        <p className="eyebrow">Sign in</p>
        <h2>Welcome back</h2>
        <p className="muted">Use your role-specific credentials to continue.</p>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label>Role</label>
        <select className="control" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="user">Citizen</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
        </select>

        {role === 'user' && (
          <div className="auth-toggle-row">
            <button
              type="button"
              className={citizenMode === 'login' ? 'toggle-pill active' : 'toggle-pill'}
              onClick={()=>setCitizenMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={citizenMode === 'create' ? 'toggle-pill active' : 'toggle-pill'}
              onClick={()=>setCitizenMode('create')}
            >
              Create account
            </button>
          </div>
        )}

        <label>{role==='user'? 'Gmail Address' : role==='driver'? 'Driver Name' : 'Username'}</label>
        <input className="control" value={username} onChange={e=>setUsername(e.target.value)} required />

        {role === 'driver' ? (
          <>
            <label>Phone Number</label>
            <input
              className="control"
              value={phone}
              onChange={e=>setPhone(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]{10,}"
              placeholder="e.g. 9876543210"
              required
            />
          </>
        ) : role === 'admin' ? (
          <>
            <label>Password</label>
            <input className="control" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </>
        ) : null}

        <div className="auth-action-row">
          <button className="primary-button" type="submit" disabled={loading}>{loading ? (role === 'user' && citizenMode === 'create' ? 'Creating...' : 'Logging in...') : (role === 'user' && citizenMode === 'create' ? 'Create account' : 'Login')}</button>
          <span className="auth-helper">Fast access to daily operations</span>
        </div>
        {role === 'user' && (
          <p className="muted" style={{marginTop:'10px'}}>
            {citizenMode === 'create'
              ? 'New citizens can create an account with Gmail. If the Gmail already exists, it will log in instead.'
              : 'Existing citizens can log in with their Gmail. First-time users can switch to Create account.'}
          </p>
        )}
        {error && <div className="form-error">{error}</div>}
      </form>
    </section>
  </div>);
}
