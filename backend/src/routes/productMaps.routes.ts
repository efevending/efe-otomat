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
    SELECT pm.*, p.name as product_name, p.sale_price as product_sale_price, p.cost_price, p.barcode,
           pb.name as brand_name
    FROM product_maps pm
    LEFT JOIN products p ON pm.product_id = p.id
    LEFT JOIN product_brands pb ON p.brand_id = pb.id
    WHERE pm.machine_id = ?
    ORDER BY pm.spiral_number
  `).all(req.params.machineId);

  res.json({ machine, maps });
});

// Spiral'e ürün ekle
router.post('/:machineId/spiral', authenticateToken, requireRole('admin', 'field_worker'), (req: Request, res: Response) => {
  const { spiral_number, product_id, capacity, sale_price } = req.body;
  const machineId = req.params.machineId;

  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
  if (!machine) return res.status(404).json({ error: 'Makina bulunamadı' });

  const existing = db.prepare('SELECT * FROM product_maps WHERE machine_id = ? AND spiral_number = ?').get(machineId, spiral_number);

  if (existing) {
    db.prepare(
      'UPDATE product_maps SET product_id = ?, capacity = ?, sale_price = ?, updated_by = ?, updated_at = datetime("now", "localtime") WHERE machine_id = ? AND spiral_number = ?'
    ).run(product_id || null, capacity || 10, sale_price ?? 0, req.user!.id, machineId, spiral_number);
  } else {
    db.prepare(
      'INSERT INTO product_maps (machine_id, spiral_number, product_id, capacity, sale_price, updated_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(machineId, spiral_number, product_id || null, capacity || 10, sale_price ?? 0, req.user!.id);
  }

  res.json({ message: 'Spiral güncellendi' });
});

// Tek spiral güncelle
router.put('/:machineId/spiral/:spiralNumber', authenticateToken, requireRole('admin', 'field_worker'), (req: Request, res: Response) => {
  const { product_id, capacity, sale_price } = req.body;
  const { machineId, spiralNumber } = req.params;

  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
  if (!machine) return res.status(404).json({ error: 'Makina bulunamadı' });

  const existing = db.prepare('SELECT * FROM product_maps WHERE machine_id = ? AND spiral_number = ?').get(machineId, spiralNumber);

  if (existing) {
    db.prepare(
      'UPDATE product_maps SET product_id = ?, capacity = ?, sale_price = ?, updated_by = ?, updated_at = datetime("now", "localtime") WHERE machine_id = ? AND spiral_number = ?'
    ).run(product_id || null, capacity || 10, sale_price ?? 0, req.user!.id, machineId, spiralNumber);
  } else {
    db.prepare(
      'INSERT INTO product_maps (machine_id, spiral_number, product_id, capacity, sale_price, updated_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(machineId, spiralNumber, product_id || null, capacity || 10, sale_price ?? 0, req.user!.id);
  }

  res.json({ message: 'Spiral güncellendi' });
});

// Spiral'den ürün çıkar
router.delete('/:machineId/spiral/:spiralNumber', authenticateToken, requireRole('admin', 'field_worker'), (req: Request, res: Response) => {
  const { machineId, spiralNumber } = req.params;
  db.prepare('DELETE FROM product_maps WHERE machine_id = ? AND spiral_number = ?').run(machineId, spiralNumber);
  res.json({ message: 'Spiral temizlendi' });
});

// Toplu ürün haritası güncelle
router.put('/:machineId/bulk', authenticateToken, requireRole('admin', 'field_worker'), (req: Request, res: Response) => {
  const { maps } = req.body;
  const machineId = req.params.machineId;

  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
  if (!machine) return res.status(404).json({ error: 'Makina bulunamadı' });

  if (!Array.isArray(maps)) return res.status(400).json({ error: 'maps dizisi gerekli' });

  const upsert = db.prepare(`
    INSERT INTO product_maps (machine_id, spiral_number, product_id, capacity, sale_price, updated_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(machine_id, spiral_number) DO UPDATE SET
      product_id = excluded.product_id,
      capacity = excluded.capacity,
      sale_price = excluded.sale_price,
      updated_by = excluded.updated_by,
      updated_at = datetime('now', 'localtime')
  `);

  const transaction = db.transaction(() => {
    for (const map of maps) {
      upsert.run(machineId, map.spiral_number, map.product_id || null, map.capacity || 10, map.sale_price ?? 0, req.user!.id);
    }
  });

  transaction();
  res.json({ message: `${maps.length} spiral güncellendi` });
});

// Haritayı başka otomata kopyala
router.post('/:machineId/copy-to/:targetMachineId', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { machineId, targetMachineId } = req.params;

  const source = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
  const target = db.prepare('SELECT * FROM machines WHERE id = ?').get(targetMachineId);
  if (!source || !target) return res.status(404).json({ error: 'Makina bulunamadı' });

  const sourceMaps = db.prepare('SELECT * FROM product_maps WHERE machine_id = ?').all(machineId) as any[];

  const upsert = db.prepare(`
    INSERT INTO product_maps (machine_id, spiral_number, product_id, capacity, sale_price, updated_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(machine_id, spiral_number) DO UPDATE SET
      product_id = excluded.product_id, capacity = excluded.capacity,
      sale_price = excluded.sale_price, updated_by = excluded.updated_by,
      updated_at = datetime('now', 'localtime')
  `);

  const transaction = db.transaction(() => {
    for (const map of sourceMaps) {
      upsert.run(targetMachineId, map.spiral_number, map.product_id, map.capacity, map.sale_price ?? 0, req.user!.id);
    }
  });

  transaction();
  res.json({ message: `${sourceMaps.length} spiral kopyalandı` });
});

export default router;
