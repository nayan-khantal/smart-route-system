const db = require('../db');

function queryAsync(query, params = []) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

async function createCollection(req, res) {
  try {
    const { truck_id, area_id, waste_type_id, waste_amount, status = 'completed' } = req.body;

    if (!truck_id || !area_id || !waste_type_id || waste_amount === undefined || waste_amount === null) {
      return res.status(400).json({ error: 'truck_id, area_id, waste_type_id and waste_amount are required' });
    }

    const parsedAmount = Number(waste_amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'waste_amount must be a positive number' });
    }

    const allowedStatus = ['completed', 'partial', 'missed'];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ error: 'Invalid collection status' });
    }

    if (req.user?.role === 'driver') {
      const driverId = req.user.id;
      const truckRows = await queryAsync(
        'SELECT truck_id, route_id FROM Trucks WHERE truck_id=? AND driver_id=?',
        [truck_id, driverId],
      );

      if (!truckRows.length) {
        return res.status(403).json({ error: 'This truck is not assigned to the logged in driver' });
      }

      const routeId = truckRows[0].route_id;
      if (routeId) {
        const routeAreaRows = await queryAsync(
          'SELECT 1 FROM Route_Areas WHERE route_id=? AND area_id=? LIMIT 1',
          [routeId, area_id],
        );

        if (!routeAreaRows.length) {
          return res.status(400).json({ error: 'Selected area is not part of your assigned route' });
        }
      }
    }

    const wasteTypeRows = await queryAsync('SELECT waste_type_id FROM Waste_Types WHERE waste_type_id=?', [waste_type_id]);
    if (!wasteTypeRows.length) {
      return res.status(400).json({ error: 'Invalid waste type selected' });
    }

    const areaRows = await queryAsync('SELECT area_id FROM Areas WHERE area_id=?', [area_id]);
    if (!areaRows.length) {
      return res.status(400).json({ error: 'Invalid area selected' });
    }

    const insertResult = await queryAsync(
      'INSERT INTO Collection_Records (truck_id, area_id, waste_type_id, waste_amount, status, collection_time) VALUES (?,?,?,?,?,NOW())',
      [truck_id, area_id, waste_type_id, parsedAmount, status],
    );

    return res.json({ ok: true, collection_id: insertResult.insertId });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to create collection record' });
  }
}

async function listCollections(req, res) {
  try {
    const isDriver = req.user?.role === 'driver';
    let driverTruckIds = [];
    if (isDriver) {
      const assignedRows = await queryAsync(
        `SELECT DISTINCT t.truck_id
         FROM Trucks t
         LEFT JOIN Drivers d ON d.driver_id=?
         WHERE t.driver_id=? OR t.truck_id=d.assigned_truck_id`,
        [req.user.id, req.user.id],
      );
      driverTruckIds = assignedRows.map((row) => row.truck_id).filter(Boolean);
      if (!driverTruckIds.length) {
        return res.json([]);
      }
    }

    const baseQuery = `SELECT c.collection_id, c.collection_time, c.waste_amount, c.status,
                       t.truck_id, t.truck_number,
                       d.driver_id, d.name AS driver_name,
                       a.area_id, a.area_name, a.zone,
                       w.waste_type_id, w.type_name, w.recyclable
                FROM Collection_Records c
                LEFT JOIN Trucks t ON c.truck_id=t.truck_id
                LEFT JOIN Drivers d ON t.driver_id=d.driver_id
                JOIN Areas a ON c.area_id=a.area_id
                JOIN Waste_Types w ON c.waste_type_id=w.waste_type_id`;

    const query = isDriver
      ? `${baseQuery} WHERE c.truck_id IN (?) ORDER BY c.collection_id ASC`
      : `${baseQuery} ORDER BY c.collection_id ASC`;

    const rows = await queryAsync(query, isDriver ? [driverTruckIds] : []);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load collection records' });
  }
}

async function listTodayCollections(req, res) {
  try {
    const isDriver = req.user?.role === 'driver';
    let driverTruckIds = [];
    if (isDriver) {
      const assignedRows = await queryAsync(
        `SELECT DISTINCT t.truck_id
         FROM Trucks t
         LEFT JOIN Drivers d ON d.driver_id=?
         WHERE t.driver_id=? OR t.truck_id=d.assigned_truck_id`,
        [req.user.id, req.user.id],
      );
      driverTruckIds = assignedRows.map((row) => row.truck_id).filter(Boolean);
      if (!driverTruckIds.length) {
        return res.json([]);
      }
    }

    const baseQuery = `SELECT c.collection_id, c.collection_time, c.waste_amount, c.status,
                       t.truck_number, d.name AS driver_name, a.area_name, w.type_name
                FROM Collection_Records c
                LEFT JOIN Trucks t ON c.truck_id=t.truck_id
                LEFT JOIN Drivers d ON t.driver_id=d.driver_id
                JOIN Areas a ON c.area_id=a.area_id
                JOIN Waste_Types w ON c.waste_type_id=w.waste_type_id
                WHERE DATE(c.collection_time)=CURDATE()`;

    const query = isDriver
      ? `${baseQuery} AND c.truck_id IN (?) ORDER BY c.collection_id ASC`
      : `${baseQuery} ORDER BY c.collection_id ASC`;

    const rows = await queryAsync(query, isDriver ? [driverTruckIds] : []);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load today collection records' });
  }
}

async function areaWiseCollections(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT a.area_id, a.area_name, a.zone,
              COUNT(c.collection_id) AS total_collections,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Areas a
       LEFT JOIN Collection_Records c ON c.area_id=a.area_id
       GROUP BY a.area_id, a.area_name, a.zone
       ORDER BY a.area_id ASC`,
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load area-wise collections' });
  }
}

async function truckWiseCollections(req, res) {
  try {
    const rows = await queryAsync(
      `SELECT t.truck_id, t.truck_number,
              d.driver_id, d.name AS driver_name,
              COUNT(c.collection_id) AS total_collections,
              IFNULL(SUM(c.waste_amount),0) AS total_waste
       FROM Trucks t
       LEFT JOIN Drivers d ON t.driver_id=d.driver_id
       LEFT JOIN Collection_Records c ON c.truck_id=t.truck_id
       GROUP BY t.truck_id, t.truck_number, d.driver_id, d.name
       ORDER BY t.truck_id ASC`,
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load truck-wise collections' });
  }
}

async function getDriverCollectionContext(req, res) {
  try {
    const driverId = req.user.id;

    const driverRows = await queryAsync(
      'SELECT driver_id, assigned_truck_id, assigned_route_id, name FROM Drivers WHERE driver_id=? LIMIT 1',
      [driverId],
    );
    const driverRow = driverRows[0] || null;
    const assignedTruckId = driverRow?.assigned_truck_id || null;
    const assignedRouteId = driverRow?.assigned_route_id || null;

    const truckRows = await queryAsync(
      `SELECT DISTINCT t.truck_id, t.truck_number, t.capacity,
              COALESCE(d.assigned_route_id, t.route_id) AS route_id,
              r.route_name, r.zone
       FROM Trucks t
       JOIN Drivers d ON d.driver_id=?
      LEFT JOIN Routes r ON COALESCE(d.assigned_route_id, t.route_id)=r.route_id
       WHERE t.driver_id=? OR t.truck_id=COALESCE(d.assigned_truck_id, 0)`,
      [driverId, driverId],
    );

    const wasteTypeRows = await queryAsync(
      'SELECT waste_type_id, type_name, recyclable FROM Waste_Types ORDER BY type_name',
    );

    let routeAreas = [];
    const routeId = truckRows[0]?.route_id || assignedRouteId || null;

    if (routeId) {
      routeAreas = await queryAsync(
        `SELECT a.area_id, a.area_name, a.zone, ra.sequence_number
         FROM Route_Areas ra
         JOIN Areas a ON ra.area_id=a.area_id
         WHERE ra.route_id=?
         ORDER BY ra.sequence_number ASC`,
        [routeId],
      );
    }

    const trucksForDriver = truckRows.length
      ? truckRows
      : assignedTruckId
        ? await queryAsync(
            `SELECT t.truck_id, t.truck_number, t.capacity,
                    COALESCE(d.assigned_route_id, t.route_id) AS route_id,
                    r.route_name, r.zone
             FROM Trucks t
             LEFT JOIN Drivers d ON d.driver_id=?
             LEFT JOIN Routes r ON COALESCE(d.assigned_route_id, t.route_id)=r.route_id
             WHERE t.truck_id=?`,
            [driverId, assignedTruckId],
          )
        : [];

    return res.json({
      trucks: trucksForDriver,
      routeAreas,
      wasteTypes: wasteTypeRows,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load driver collection context' });
  }
}

module.exports = {
  createCollection,
  listCollections,
  listTodayCollections,
  areaWiseCollections,
  truckWiseCollections,
  getDriverCollectionContext,
};
