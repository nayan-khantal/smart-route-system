const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

async function request(path, options = {}){
  const res = await fetch(API_BASE + path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = data?.error?.message || data?.error || data?.message || `Request failed with status ${res.status}`;
    if (typeof message === 'object') {
      try { message = JSON.stringify(message); } catch(_) { message = String(message); }
    }
    throw new Error(message);
  }
  return data;
}

export async function post(path, body, token){
  const headers = {'Content-Type':'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request(path, {method:'POST',headers,body:JSON.stringify(body)});
}

export async function put(path, body, token){
  const headers = {'Content-Type':'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request(path, {method:'PUT',headers,body:JSON.stringify(body)});
}

export async function get(path, token, options = {}){
  const headers = token ? {'Authorization':`Bearer ${token}`} : {};
  const finalPath = options.cacheBust
    ? `${path}${path.includes('?') ? '&' : '?'}_t=${Date.now()}`
    : path;
  return request(finalPath, {headers});
}

export default {post,put,get};