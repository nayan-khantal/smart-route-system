const mysql = require("mysql2");

const DB_NAME = process.env.DB_NAME || "smart_waste";
const config = {
	host: process.env.DB_HOST || "localhost",
	user: process.env.DB_USER || "root",
	password: process.env.DB_PASS || "",
};

const db = mysql.createConnection(config);

db.connect(err => {
	if (err) {
		console.error("MySQL connection error:", err);
		process.exit(1);
	}
	// Ensure database exists, then switch to it
	const createDbSql = `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`; 
	db.query(createDbSql, (err) => {
		if (err) {
			console.error("Error creating database:", err);
			process.exit(1);
		}
		db.changeUser({ database: DB_NAME }, (err) => {
			if (err) {
				console.error("Error switching to database:", err);
				process.exit(1);
			}
			console.log("MySQL Connected");
		});
	});
});

module.exports = db;