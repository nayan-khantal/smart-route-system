require('dotenv').config();
const express=require("express");
const cors=require("cors");
const db=require("./db");
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const app=express();

const IMPORTANT_COMPLAINT_CATEGORIES = [
	'Garbage Not Collected',
	'Damaged Bins',
	'Overflowing Bins',
	'Missed Collection',
	'Improper Waste Segregation',
	'Hazardous Waste',
	'General Complaint'
];

app.use(cors()); app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/reports', reportRoutes);

// Public read endpoints
app.get("/api/areas",(req,res)=>db.query("SELECT * FROM Areas",(e,r)=> e?res.status(500).json({error:e}):res.json(r)));
app.get("/api/waste-types",(req,res)=>db.query("SELECT * FROM Waste_Types",(e,r)=> e?res.status(500).json({error:e}):res.json(r)));
app.get("/api/complaint-categories",(req,res)=>{
	const placeholders = IMPORTANT_COMPLAINT_CATEGORIES.map(() => '?').join(',');
	const orderExpr = IMPORTANT_COMPLAINT_CATEGORIES.map(() => '?').join(',');
	const q = `SELECT * FROM Complaint_Categories
						 WHERE category_name IN (${placeholders})
						 ORDER BY FIELD(category_name, ${orderExpr})`;
	db.query(q,[...IMPORTANT_COMPLAINT_CATEGORIES, ...IMPORTANT_COMPLAINT_CATEGORIES],(e,r)=> e?res.status(500).json({error:e}):res.json(r));
});

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port,()=>console.log(`Server running on port ${port}`));

server.on('error', (error) => {
	if (error.code === 'EADDRINUSE') {
		console.error(`Port ${port} is already in use. Stop the existing backend process or set PORT to another value.`);
		process.exit(1);
	}
	throw error;
});