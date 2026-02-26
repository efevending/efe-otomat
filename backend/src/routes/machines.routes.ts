import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { status, warehouse_id } = req.query;
  let query = `SELECT m.*, w.name as warehouse_name FROM machines m LEFT JOIN warehouses w ON m.warehouse_id = w.id WHERE 1=1`;
  const params: any[] = [];

  if (status) { query += ' AND m.status = ?'; params.push(status); }
  if (warehouse_id) { query += ' AND m.warehouse_id = ?'; params.push(warehouse_id); }

  query += ' ORDER BY m.machine_no';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const machine = db.prepare(`
    SELECT m.*, w.name as warehouse_name
    FROM machines m LEFT JOIN warehouses w ON m.warehouse_id = w.id
    WHERE m.id = ?
  `).get(req.params.id);
  if (!machine) return res.status(404).json({ error: 'Makina bulunamadı' });
  res.json(machine);
});

router.post('/', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { machine_no, name, location_description, latitude, longitude, warehouse_id, spiral_rows, spiral_cols, notes } = req.body;

  if (!machine_no || !name) {
    return res.status(400).json({ error: 'Makina numarası ve adı gerekli' });
  }

  const existing = db.prepare('SELECT id FROM machines WHERE machine_no = ?').get(machine_no);
  if (existing) return res.status(409).json({ error: 'Bu makina numarası zaten kullanılıyor' });

  const result = db.prepare(
    `INSERT INTO machines (machine_no, name, location_description, latitude, longitude, warehouse_id, spiral_rows, spiral_cols, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(machine_no, name, location_description || null, latitude || null, longitude || null, warehouse_id || null, spiral_rows || 8, spiral_cols || 10, notes || null);

  res.status(201).json({ id: result.lastInsertRowid, machine_no, name });
});

router.put('/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { machine_no, name, location_description, latitude, longitude, warehouse_id, spiral_rows, spiral_cols, status, notes } = req.body;

  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id) as any;
  if (!machine) return res.status(404).json({ error: 'Makina bulunamadı' });

  if (machine_no && machine_no !== machine.machine_no) {
    const existing = db.prepare('SELECT id FROM machines WHERE machine_no = ? AND id != ?').get(machine_no, req.params.id);
    if (existing) return res.status(409).json({ error: 'Bu makina numarası zaten kullanılıyor' });
  }

  db.prepare(
    `UPDATE machines SET machine_no = ?, name = ?, location_description = ?, latitude = ?, longitude = ?,
     warehouse_id = ?, spiral_rows = ?, spiral_cols = ?, status = ?, notes = ? WHERE id = ?`
  ).run(
    machine_no ?? machine.machine_no, name ?? machine.name,
    location_description ?? machine.location_description,
    latitude ?? machine.latitude, longitude ?? machine.longitude,
    warehouse_id ?? machine.warehouse_id,
    spiral_rows ?? machine.spiral_rows, spiral_cols ?? machine.spiral_cols,
    status ?? machine.status, notes ?? machine.notes, req.params.id
  );

  res.json({ message: 'Makina güncellendi' });
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const result = db.prepare('UPDATE machines SET status = ? WHERE id = ?').run('inactive', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Makina bulunamadı' });
  res.json({ message: 'Makina deaktif edildi' });
});

export default router;
