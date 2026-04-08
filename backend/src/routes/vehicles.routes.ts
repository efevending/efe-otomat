import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();
router.use(authenticateToken);

router.get('/', (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM vehicles WHERE active = 1 ORDER BY plate').all());
});

router.post('/', requireRole('admin'), (req: Request, res: Response) => {
  const { plate, driver_name, notes } = req.body;
  if (!plate) return res.status(400).json({ error: 'Plaka zorunlu' });

  const result = db.prepare('INSERT INTO vehicles (plate, driver_name, notes) VALUES (?, ?, ?)')
    .run(plate, driver_name || '', notes || '');
  res.json({ id: result.lastInsertRowid, plate });
});

router.put('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const { plate, driver_name, notes } = req.body;
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) as any;
  if (!vehicle) return res.status(404).json({ error: 'Araç bulunamadı' });

  db.prepare('UPDATE vehicles SET plate = ?, driver_name = ?, notes = ? WHERE id = ?')
    .run(plate ?? vehicle.plate, driver_name ?? vehicle.driver_name, notes ?? vehicle.notes, req.params.id);
  res.json({ message: 'Araç güncellendi' });
});

router.delete('/:id', requireRole('admin'), (req: Request, res: Response) => {
  db.prepare('UPDATE vehicles SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
