-- Complete schema (base schema + migrations)
-- Use this file for one-shot imports in demo or presentation environments.

-- ===== BASE SCHEMA =====
CREATE DATABASE IF NOT EXISTS smart_waste;
USE smart_waste;

-- Areas
CREATE TABLE IF NOT EXISTS Areas (
	area_id INT AUTO_INCREMENT PRIMARY KEY,
	area_name VARCHAR(150) NOT NULL,
	zone VARCHAR(100) NOT NULL,
	population INT DEFAULT 0
);

-- Routes
CREATE TABLE IF NOT EXISTS Routes (
	route_id INT AUTO_INCREMENT PRIMARY KEY,
	route_name VARCHAR(150) NOT NULL,
	zone VARCHAR(100)
);

-- Junction table: Route -> Areas with order
CREATE TABLE IF NOT EXISTS Route_Areas (
	route_id INT NOT NULL,
	area_id INT NOT NULL,
	sequence_number INT NOT NULL,
	PRIMARY KEY(route_id, area_id),
	FOREIGN KEY(route_id) REFERENCES Routes(route_id) ON DELETE CASCADE,
	FOREIGN KEY(area_id) REFERENCES Areas(area_id) ON DELETE CASCADE
);

-- Drivers
CREATE TABLE IF NOT EXISTS Drivers (
	driver_id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(150) NOT NULL,
	phone VARCHAR(30) UNIQUE,
	password VARCHAR(255) NULL,
	assigned_truck_id INT NULL,
	assigned_route_id INT NULL
);

-- Admins
CREATE TABLE IF NOT EXISTS Admins (
	admin_id INT AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(100) UNIQUE NOT NULL,
	password VARCHAR(255) NOT NULL
);

-- Users (citizens)
CREATE TABLE IF NOT EXISTS Users (
	user_id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(150) NOT NULL,
	email VARCHAR(150) UNIQUE NOT NULL,
	password VARCHAR(255) NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	area_id INT,
	FOREIGN KEY(area_id) REFERENCES Areas(area_id)
);

-- Trucks
CREATE TABLE IF NOT EXISTS Trucks (
	truck_id INT AUTO_INCREMENT PRIMARY KEY,
	truck_number VARCHAR(50) UNIQUE NOT NULL,
	capacity DECIMAL(10,2) DEFAULT 0,
	driver_id INT,
	route_id INT,
	FOREIGN KEY(driver_id) REFERENCES Drivers(driver_id),
	FOREIGN KEY(route_id) REFERENCES Routes(route_id)
);

-- Waste types
CREATE TABLE IF NOT EXISTS Waste_Types (
	waste_type_id INT AUTO_INCREMENT PRIMARY KEY,
	type_name VARCHAR(100) NOT NULL,
	recyclable BOOLEAN DEFAULT FALSE
);

-- Collection records
CREATE TABLE IF NOT EXISTS Collection_Records (
	collection_id INT AUTO_INCREMENT PRIMARY KEY,
	truck_id INT NULL,
	area_id INT NOT NULL,
	waste_type_id INT NOT NULL,
	collection_time DATETIME DEFAULT CURRENT_TIMESTAMP,
	waste_amount DECIMAL(10,2) DEFAULT 0,
	status VARCHAR(50) NOT NULL DEFAULT 'completed',
	FOREIGN KEY(truck_id) REFERENCES Trucks(truck_id) ON DELETE SET NULL,
	FOREIGN KEY(area_id) REFERENCES Areas(area_id) ON DELETE CASCADE,
	FOREIGN KEY(waste_type_id) REFERENCES Waste_Types(waste_type_id)
);

-- Recycling centers
CREATE TABLE IF NOT EXISTS Recycling_Centers (
	center_id INT AUTO_INCREMENT PRIMARY KEY,
	location VARCHAR(255) NOT NULL,
	capacity DECIMAL(10,2) DEFAULT 0,
	waste_type_id INT,
	FOREIGN KEY(waste_type_id) REFERENCES Waste_Types(waste_type_id)
);

-- Complaint categories
CREATE TABLE IF NOT EXISTS Complaint_Categories (
	category_id INT AUTO_INCREMENT PRIMARY KEY,
	category_name VARCHAR(100) NOT NULL UNIQUE
);

-- Complaints
CREATE TABLE IF NOT EXISTS Complaints (
	complaint_id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	area_id INT NOT NULL,
	description TEXT,
	category_id INT DEFAULT NULL,
	status VARCHAR(50) DEFAULT 'pending',
	priority VARCHAR(50) DEFAULT 'medium',
	admin_notes TEXT NULL,
	resolution_type VARCHAR(100) DEFAULT NULL,
	assigned_driver_id INT NULL,
	assigned_by_admin_id INT NULL,
	assigned_at DATETIME NULL,
	resolved_by_driver_id INT NULL,
	resolved_by_driver_at DATETIME NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
	FOREIGN KEY(area_id) REFERENCES Areas(area_id) ON DELETE CASCADE,
	FOREIGN KEY(category_id) REFERENCES Complaint_Categories(category_id) ON DELETE SET NULL,
	FOREIGN KEY(assigned_by_admin_id) REFERENCES Admins(admin_id) ON DELETE SET NULL
);

-- Driver assignment columns are kept as metadata only to avoid a second
-- relationship path that makes the ER diagram cross back through Trucks.

-- assigned_driver_id and resolved_by_driver_id are kept as plain workflow fields
-- so the ER diagram stays centered on Trucks -> Drivers instead of crossing back.

-- ===== MIGRATION: migrate_add_columns.sql =====

-- Migration & seed: create routes, areas, waste types and seed sample Mysuru-like data
USE smart_waste;

-- Seed Waste Types
INSERT INTO Waste_Types(type_name,recyclable) VALUES
('Organic',1),('Plastic',1),('Dry Waste',0),('Wet Waste',1)
ON DUPLICATE KEY UPDATE type_name=VALUES(type_name);

-- Seed Areas (Mysuru-like examples)
INSERT INTO Areas(area_name,zone,population) VALUES
('Kuvempunagar','West',35000),
('Vijayanagar','West',65000),
('Jayalakshmipuram','Central',22000),
('Saraswathipuram','South',28000),
('Hebbal','North',31000)
ON DUPLICATE KEY UPDATE area_name=VALUES(area_name);

-- Seed Routes
INSERT INTO Routes(route_name,zone) VALUES
('Route A','West'),
('Route B','North'),
('Route C','Central')
ON DUPLICATE KEY UPDATE route_name=VALUES(route_name);

-- Map route areas (sequence)
INSERT IGNORE INTO Route_Areas(route_id,area_id,sequence_number)
SELECT r.route_id,a.area_id,1 FROM Routes r JOIN Areas a ON r.route_name='Route A' AND a.area_name='Vijayanagar';
INSERT IGNORE INTO Route_Areas(route_id,area_id,sequence_number)
SELECT r.route_id,a.area_id,2 FROM Routes r JOIN Areas a ON r.route_name='Route A' AND a.area_name='Kuvempunagar';
INSERT IGNORE INTO Route_Areas(route_id,area_id,sequence_number)
SELECT r.route_id,a.area_id,1 FROM Routes r JOIN Areas a ON r.route_name='Route B' AND a.area_name='Hebbal';
INSERT IGNORE INTO Route_Areas(route_id,area_id,sequence_number)
SELECT r.route_id,a.area_id,1 FROM Routes r JOIN Areas a ON r.route_name='Route B' AND a.area_name='Saraswathipuram';
INSERT IGNORE INTO Route_Areas(route_id,area_id,sequence_number)
SELECT r.route_id,a.area_id,1 FROM Routes r JOIN Areas a ON r.route_name='Route C' AND a.area_name='Jayalakshmipuram';

-- Seed Drivers
INSERT INTO Drivers(name,phone,password) VALUES
('Ramesh','+91-9876543210','password-placeholder'),
('Suresh','+91-9876543220','password-placeholder')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed Trucks with realistic numbers
INSERT INTO Trucks(truck_number,capacity,driver_id,route_id)
SELECT * FROM (
	SELECT 'KA-09-AB-1234' AS tnum,8.5 AS cap, d.driver_id AS did, r.route_id AS rid FROM Drivers d JOIN Routes r ON r.route_name='Route A' WHERE d.name='Ramesh' LIMIT 1
) AS tmp
ON DUPLICATE KEY UPDATE truck_number=VALUES(truck_number);

INSERT INTO Trucks(truck_number,capacity,driver_id,route_id)
SELECT * FROM (
	SELECT 'KA-09-CD-5678' AS tnum,9.0 AS cap, d.driver_id AS did, r.route_id AS rid FROM Drivers d JOIN Routes r ON r.route_name='Route B' WHERE d.name='Suresh' LIMIT 1
) AS tmp2
ON DUPLICATE KEY UPDATE truck_number=VALUES(truck_number);

-- Seed Admin (passwords are placeholders; will be hashed in application seeding)
INSERT INTO Admins(username,password) VALUES ('admin','admin-placeholder') ON DUPLICATE KEY UPDATE username=VALUES(username);

-- Seed a sample user
INSERT INTO Users(name,email,password,area_id)
SELECT 'Mysore Student','student@example.com','user-placeholder', a.area_id FROM Areas a WHERE a.area_name='Kuvempunagar' LIMIT 1
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- Seed a sample complaint
INSERT INTO Complaints(user_id,area_id,description,status)
SELECT u.user_id, a.area_id, 'Waste not collected since 3 days', 'pending' FROM Users u JOIN Areas a ON a.area_name='Kuvempunagar' WHERE u.email='student@example.com' LIMIT 1;

-- Complaint assignment columns for role-based workflow
-- Columns and constraints are defined in the base schema above.

-- Collection records compatibility columns
-- The base schema already defines Collection_Records.status.

-- Users compatibility columns
-- The base schema already defines Users.created_at.

-- ===== MIGRATION: addComplaintCategories.sql =====

-- Add Complaint Categories table
-- The base schema already creates Complaint_Categories.

-- Insert default complaint categories
INSERT IGNORE INTO Complaint_Categories (category_name) VALUES 
('Garbage Not Collected'),
('Damaged Bins'),
('Overflowing Bins'),
('Missed Collection'),
('Improper Waste Segregation'),
('Hazardous Waste'),
('General Complaint');

-- The base schema already includes the complaint workflow columns, foreign key,
-- and indexes needed for this feature.

-- ===== MIGRATION: migrate_driver_assignment_columns.sql =====

-- The base schema already includes Drivers.assigned_truck_id and Drivers.assigned_route_id.
-- They are intentionally not modeled as foreign keys.

-- ===== MIGRATION: migrate_driver_password_nullable.sql =====

-- The base schema already defines Drivers.password as nullable.
