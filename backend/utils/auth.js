const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'change_this_secret';

function signToken(payload){
  return jwt.sign(payload, SECRET, {expiresIn: '8h'});
}

function verifyToken(token){
  try{ return jwt.verify(token, SECRET); }catch(e){ return null; }
}

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'No token'});
  const token = auth.split(' ')[1];
  const data = verifyToken(token);
  if(!data) return res.status(401).json({error:'Invalid token'});
  req.user = data;
  next();
}

function roleMiddleware(requiredRoles){
  return (req,res,next)=>{
    const auth = req.headers.authorization;
    if(!auth) return res.status(401).json({error:'No token'});
    const token = auth.split(' ')[1];
    const data = verifyToken(token);
    if(!data) return res.status(401).json({error:'Invalid token'});
    if(requiredRoles && !requiredRoles.includes(data.role)) return res.status(403).json({error:'Forbidden'});
    req.user = data; next();
  }
}

module.exports = {signToken,verifyToken,authMiddleware,roleMiddleware};