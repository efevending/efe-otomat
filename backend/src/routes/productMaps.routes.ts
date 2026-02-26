import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// Makina ürün haritasını getir
router.get('/:machineId', authenticateToken, (req: Request, res: Response) => {
  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.machineId) as any;
  if (!machine) return res.status(404).json({ error: 'Makina bulunamadı' });

  const maps = db.prepare(`
    SELECT pm.*, p.name as product_name, p.sale_price, p.cost_price, p.barcode, p.category
    FROM product_maps pm
    LEFT JOIN products p ON pm.product_id = p.id
    WHERE pm.machine_id = ?
    ORDER BY pm.spiral_number
  `).all(req.params.machineId);

  res.json({ machine, maps });
});

// Tek spiral güncelle
router.put('/:machineId/spiral/:spiralNumber', authenticateToken, requireRole('admin', 'field_worker'), (req: Request, res: Response) => {
  const { product_id, capacity } = req.body;
  const { machineId, spiralNumber } = req.params;

  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
  if (!machine) return res.status(404).json({ error: 'Makina bulunamadı' });

  const existing = db.prepare('SELECT * FROM product_maps WHERE machine_id = ? AND spiral_number = ?').get(machineId, spiralNumber);

  if (existing) {
    db.prepare(
      'UPDATE product_maps SET product_id = ?, capacity = ?, updated_by = ?, updated_at = datetime("now", "localtime") WHERE machine_id = ? AND spiral_number = ?'
    ).run(product_id || null, capacity || 10, req.user!.id, machineId, spiralNumber);
  } else {
    db.prepare(
      'INSERT INTO product_maps (machine_id, spiral_number, product_id, capacity, updated_by) VALUES (?, ?, ?, ?, ?)'
    ).run(machineId, spiralNumber, product_id || null, capacity || 10, req.user!.id);
  }

  res.json({ message: 'Spiral güncellendi' });
});

// Toplu ürün haritası güncelle
router.put('/:machineId/bulk', authenticateToken, requireRole('admin', 'field_worker'), (req: Request, res: Response) => {
  const { maps } = req.body; // [{ spiral_number, product_id, capacity }]
  const machineId = req.params.machineId;

  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
  if (!machine) return res.status(404).json({ error: 'Makina bulunamadı' });

  if (!Array.isArray(maps)) return res.status(400).json({ error: 'maps dizisi gerekli' });

  const upsert = db.prepare(`
    INSERT INTO product_maps (machine_id, spiral_number, product_id, capacity, updated_by)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(machine_id, spiral_number) DO UPDATE SET
      product_id = excluded.product_id,
      capacity = excluded.capacity,
      updated_by = excluded.updated_by,
      updated_at = datetime('now', 'localtime')
  `);

  const transaction = db.transaction(() => {
    for (const map of maps) {
      upsert.run(machineId, map.spiral_number, map.product_id || null, map.capacity || 10, req.user!.id);
    }
  });

  transaction();
  res.json({ message: `${maps.length} spiral güncellendi` });
});

export default router;
