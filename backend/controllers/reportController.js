const db = require('../db');

function queryAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

async function summary(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT
         IFNULL((SELECT SUM(waste_amount) FROM Collection_Records),0) AS total_waste_collected,
         IFNULL((SELECT SUM(waste_amount) FROM Collection_Records WHERE DATE(collection_time)=CURDATE()),0) AS total_waste_today,
         (SELECT COUNT(*) FROM Collection_Records) AS total_collection_records,
         (SELECT COUNT(*) FROM Trucks WHERE driver_id IS NOT NULL) AS active_trucks,
         (SELECT COUNT(*) FROM Complaints WHERE status='pending') AS pending_complaints,
         (SELECT IFNULL(a.area_name, 'N/A')
          FROM Areas a
          LEFT JOIN Collection_Records c ON c.area_id=a.area_id
          GROUP BY a.area_id, a.area_name
          ORDER BY IFNULL(SUM(c.waste_amount),0) DESC
          LIMIT 1) AS highest_waste_area,
         (SELECT IFNULL(SUM(c.waste_amount),0)
          FROM Collection_Records c
          WHERE DATE(c.collection_time)=DATE_SUB(CURDATE(), INTERVAL 1 DAY)) AS total_waste_yesterday`,
    );
    return res.json(rows[0] || {});
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load summary report' });
  }
}

async function insights(req, res) {
  try {
    const [topDrivers, wasteTypeBreakdown, dailyTrend] = await Promise.all([
      queryAsync(
        `SELECT d.driver_id, d.name,
                COUNT(c.collection_id) AS total_collections,
                IFNULL(SUM(c.waste_amount),0) AS total_waste
         FROM Drivers d
         LEFT JOIN Trucks t ON t.driver_id=d.driver_id OR t.truck_id=d.assigned_truck_id
         LEFT JOIN Collection_Records c ON c.truck_id=t.truck_id
         GROUP BY d.driver_id, d.name
         ORDER BY total_waste DESC
         LIMIT 5`,
      ),
      queryAsync(
        `SELECT wt.waste_type_id, wt.type_name,
                IFNULL(SUM(c.waste_amount),0) AS total_waste
         FROM Waste_Types wt
         LEFT JOIN Collection_Records c ON c.waste_type_id=wt.waste_type_id
         GROUP BY wt.waste_type_id, wt.type_name
         ORDER BY total_waste DESC`,
      ),
      queryAsync(
        `SELECT DATE(c.collection_time) AS day,
                COUNT(c.collection_id) AS collections,
                IFNULL(SUM(c.waste_amount),0) AS total_waste
         FROM Collection_Records c
         WHERE c.collection_time >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         GROUP BY DATE(c.collection_time)
         ORDER BY day ASC`,
      ),
    ]);

    const totalWaste = wasteTypeBreakdown.reduce((sum, row) => sum + Number(row.total_waste || 0), 0);
    const wasteTypeDistribution = wasteTypeBreakdown.map((row) => ({
      ...row,
      percentage: totalWaste > 0 ? Number(((Number(row.total_waste || 0) / totalWaste) * 100).toFixed(2)) : 0,
    }));

    return res.json({
      top_drivers: topDrivers,
      waste_type_distribution: wasteTypeDistribution,
      daily_trend: dailyTrend,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load report insights' });
  }
}

async function areaWise(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT a.area_id, a.area_name, a.zone,
              COUNT(c.collection_id) AS total_collections,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Areas a
       LEFT JOIN Collection_Records c ON c.area_id=a.area_id
       GROUP BY a.area_id, a.area_name, a.zone
       ORDER BY total_waste DESC`,
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load area-wise report' });
  }
}

async function drivers(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT d.driver_id, d.name,
              COUNT(c.collection_id) AS total_collections,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Drivers d
       LEFT JOIN Trucks t ON d.driver_id=t.driver_id
       LEFT JOIN Collection_Records c ON c.truck_id=t.truck_id
       GROUP BY d.driver_id, d.name
       ORDER BY total_waste DESC`,
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load driver-wise report' });
  }
}

async function truckWise(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT t.truck_id, t.truck_number,
              d.name AS driver_name,
              COUNT(c.collection_id) AS total_collections,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Trucks t
       LEFT JOIN Drivers d ON t.driver_id=d.driver_id
       LEFT JOIN Collection_Records c ON c.truck_id=t.truck_id
       GROUP BY t.truck_id, t.truck_number, d.name
       ORDER BY total_waste DESC`,
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load truck-wise report' });
  }
}

async function wasteTypeDistribution(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT wt.waste_type_id, wt.type_name, wt.recyclable,
              COUNT(c.collection_id) AS total_collections,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Waste_Types wt
       LEFT JOIN Collection_Records c ON c.waste_type_id=wt.waste_type_id
       GROUP BY wt.waste_type_id, wt.type_name, wt.recyclable
       ORDER BY total_waste DESC`,
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load waste type distribution' });
  }
}

async function dailySummary(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT DATE(collection_time) AS collection_date,
              COUNT(collection_id) AS total_collections,
              IFNULL(SUM(waste_amount),0) AS total_waste
       FROM Collection_Records
       GROUP BY DATE(collection_time)
       ORDER BY collection_date DESC
       LIMIT 30`,
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load daily summary report' });
  }
}

async function highestAreas(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT a.area_id, a.area_name,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Areas a
       LEFT JOIN Collection_Records c ON c.area_id=a.area_id
       GROUP BY a.area_id, a.area_name
       ORDER BY total_waste DESC
       LIMIT 5`,
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load highest waste areas report' });
  }
}

module.exports = {
  summary,
  insights,
  areaWise,
  drivers,
  truckWise,
  wasteTypeDistribution,
  dailySummary,
  highestAreas,
};
