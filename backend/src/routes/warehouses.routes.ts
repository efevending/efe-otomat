import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();
router.use(authenticateToken);

// Tüm depoları getir (tip filtresi opsiyonel)
router.get('/', (req: Request, res: Response) => {
  const { type } = req.query;
  let query = `
    SELECT w.*, u.full_name as manager_name, s.name as supplier_name,
      ru.full_name as responsible_user_name
    FROM warehouses w
    LEFT JOIN users u ON w.manager_id = u.id
    LEFT JOIN suppliers s ON w.supplier_id = s.id
    LEFT JOIN users ru ON w.responsible_user_id = ru.id
  `;
  const params: any[] = [];
  if (type) {
    query += ' WHERE w.type = ?';
    params.push(type);
  }
  query += ' ORDER BY w.type, w.name';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req: Request, res: Response) => {
  const warehouse = db.prepare(`
    SELECT w.*, u.full_name as manager_name, s.name as supplier_name
    FROM warehouses w
    LEFT JOIN users u ON w.manager_id = u.id
    LEFT JOIN suppliers s ON w.supplier_id = s.id
    WHERE w.id = ?
  `).get(req.params.id);
  if (!warehouse) return res.status(404).json({ error: 'Depo bulunamadı' });
  res.json(warehouse);
});

router.get('/:id/stock', (req: Request, res: Response) => {
  const stock = db.prepare(`
    SELECT ws.*, p.name as product_name, p.barcode, p.category, p.cost_price, p.sale_price
    FROM warehouse_stock ws
    JOIN products p ON ws.product_id = p.id
    WHERE ws.warehouse_id = ?
    ORDER BY p.name
  `).all(req.params.id);
  res.json(stock);
});

router.get('/:id/transactions', (req: Request, res: Response) => {
  const { start_date, end_date, type } = req.query;
  let query = `
    SELECT wt.*, p.name as product_name, u.full_name as created_by_name
    FROM warehouse_transactions wt
    JOIN products p ON wt.product_id = p.id
    LEFT JOIN users u ON wt.created_by = u.id
    WHERE wt.warehouse_id = ?
  `;
  const params: any[] = [req.params.id];

  if (start_date) { query += ' AND wt.created_at >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND wt.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
  if (type) { query += ' AND wt.type = ?'; params.push(type); }

  query += ' ORDER BY wt.created_at DESC LIMIT 500';
  res.json(db.prepare(query).all(...params));
});

// Depo stok girişi
router.post('/:id/stock-entry', requireRole('admin', 'warehouse_manager'), (req: Request, res: Response) => {
  const { items, notes } = req.body;
  const warehouseId = req.params.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'En az bir ürün gerekli' });
  }

  const transaction = db.transaction(() => {
    for (const item of items) {
      const existing = db.prepare('SELECT * FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?').get(warehouseId, item.product_id) as any;

      if (existing) {
        db.prepare('UPDATE warehouse_stock SET quantity = quantity + ?, last_updated = datetime("now", "localtime") WHERE warehouse_id = ? AND product_id = ?')
          .run(item.quantity, warehouseId, item.product_id);
      } else {
        db.prepare('INSERT INTO warehouse_stock (warehouse_id, product_id, quantity) VALUES (?, ?, ?)')
          .run(warehouseId, item.product_id, item.quantity);
      }

      db.prepare(
        'INSERT INTO warehouse_transactions (warehouse_id, product_id, quantity, type, reference_type, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(warehouseId, item.product_id, item.quantity, 'in', 'purchase', notes || null, req.user!.id);
    }
  });

  transaction();
  res.json({ message: 'Stok girişi yapıldı' });
});

// Depo stok çıkışı
router.post('/:id/stock-exit', requireRole('admin', 'warehouse_manager'), (req: Request, res: Response) => {
  const { items, notes } = req.body;
  const warehouseId = req.params.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'En az bir ürün gerekli' });
  }

  const transaction = db.transaction(() => {
    for (const item of items) {
      db.prepare('UPDATE warehouse_stock SET quantity = quantity - ?, last_updated = datetime("now", "localtime") WHERE warehouse_id = ? AND product_id = ?')
        .run(item.quantity, warehouseId, item.product_id);

      db.prepare(
        'INSERT INTO warehouse_transactions (warehouse_id, product_id, quantity, type, reference_type, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(warehouseId, item.product_id, item.quantity, 'out', 'adjustment', notes || null, req.user!.id);
    }
  });

  transaction();
  res.json({ message: 'Stok çıkışı yapıldı' });
});

// Depo oluştur
router.post('/', requireRole('admin'), (req: Request, res: Response) => {
  const { name, type, address, manager_id, supplier_id, special_code, responsible_user_id } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Depo adı ve tipi gerekli' });

  const result = db.prepare('INSERT INTO warehouses (name, type, address, manager_id, supplier_id, special_code, responsible_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(name, type, address || null, manager_id || null, supplier_id || null, special_code || '', responsible_user_id || null);

  res.status(201).json({ id: result.lastInsertRowid, name, type });
});

// Depo güncelle
router.put('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const { name, type, address, manager_id, supplier_id, special_code, responsible_user_id } = req.body;
  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id) as any;
  if (!warehouse) return res.status(404).json({ error: 'Depo bulunamadı' });

  db.prepare('UPDATE warehouses SET name = ?, type = ?, address = ?, manager_id = ?, supplier_id = ?, special_code = ?, responsible_user_id = ? WHERE id = ?')
    .run(name ?? warehouse.name, type ?? warehouse.type, address ?? warehouse.address,
      manager_id ?? warehouse.manager_id, supplier_id ?? warehouse.supplier_id,
      special_code ?? warehouse.special_code, responsible_user_id ?? warehouse.responsible_user_id,
      req.params.id);

  res.json({ message: 'Depo güncellendi' });
});

// Depo sil
router.delete('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id) as any;
  if (!warehouse) return res.status(404).json({ error: 'Depo bulunamadı' });

  // Stok var mı kontrol et
  const stockCount = db.prepare('SELECT COUNT(*) as count FROM warehouse_stock WHERE warehouse_id = ? AND quantity > 0').get(req.params.id) as any;
  if (stockCount.count > 0) {
    return res.status(400).json({ error: 'Stoku olan depo silinemez' });
  }

  db.prepare('DELETE FROM warehouses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
