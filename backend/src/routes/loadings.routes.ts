import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { machine_id, user_id, start_date, end_date } = req.query;
  let query = `
    SELECT l.*, m.machine_no, m.name as machine_name, u.full_name as user_name,
      (SELECT SUM(quantity) FROM loading_items WHERE loading_id = l.id) as total_items
    FROM loadings l
    JOIN machines m ON l.machine_id = m.id
    JOIN users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (machine_id) { query += ' AND l.machine_id = ?'; params.push(machine_id); }
  if (user_id) { query += ' AND l.user_id = ?'; params.push(user_id); }
  if (start_date) { query += ' AND l.loading_date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND l.loading_date <= ?'; params.push(end_date); }

  // Saha çalışanı sadece kendi kayıtlarını görsün
  if (req.user!.role === 'field_worker') {
    query += ' AND l.user_id = ?';
    params.push(req.user!.id);
  }

  query += ' ORDER BY l.loading_date DESC, l.loading_time DESC LIMIT 500';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const loading = db.prepare(`
    SELECT l.*, m.machine_no, m.name as machine_name, u.full_name as user_name
    FROM loadings l
    JOIN machines m ON l.machine_id = m.id
    JOIN users u ON l.user_id = u.id
    WHERE l.id = ?
  `).get(req.params.id);

  if (!loading) return res.status(404).json({ error: 'Yükleme kaydı bulunamadı' });

  const items = db.prepare(`
    SELECT li.*, p.name as product_name, p.barcode
    FROM loading_items li JOIN products p ON li.product_id = p.id
    WHERE li.loading_id = ?
    ORDER BY li.spiral_number
  `).all(req.params.id);

  res.json({ ...loading as any, items });
});

router.post('/', authenticateToken, (req: Request, res: Response) => {
  const { machine_id, route_id, loading_date, loading_time, items, notes } = req.body;

  if (!machine_id || !items?.length) {
    return res.status(400).json({ error: 'Makina ve ürünler gerekli' });
  }

  const now = new Date();
  const date = loading_date || now.toISOString().split('T')[0];
  const time = loading_time || now.toTimeString().split(' ')[0].slice(0, 5);

  const transaction = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO loadings (machine_id, user_id, route_id, loading_date, loading_time, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(machine_id, req.user!.id, route_id || null, date, time, notes || null);

    const loadingId = result.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO loading_items (loading_id, product_id, spiral_number, quantity) VALUES (?, ?, ?, ?)'
    );

    for (const item of items) {
      insertItem.run(loadingId, item.product_id, item.spiral_number, item.quantity);
    }

    // Makinanın bağlı olduğu depodan stok düş
    const machine = db.prepare('SELECT warehouse_id FROM machines WHERE id = ?').get(machine_id) as any;
    if (machine?.warehouse_id) {
      for (const item of items) {
        db.prepare(
          'UPDATE warehouse_stock SET quantity = quantity - ?, last_updated = datetime("now", "localtime") WHERE warehouse_id = ? AND product_id = ?'
        ).run(item.quantity, machine.warehouse_id, item.product_id);

        db.prepare(
          'INSERT INTO warehouse_transactions (warehouse_id, product_id, quantity, type, reference_type, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(machine.warehouse_id, item.product_id, item.quantity, 'out', 'loading', loadingId, req.user!.id);
      }
    }

    return loadingId;
  });

  const loadingId = transaction();
  res.status(201).json({ id: loadingId, message: 'Yükleme kaydedildi' });
});

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Sadece admin yükleme silebilir' });
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM loading_items WHERE loading_id = ?').run(req.params.id);
    db.prepare('DELETE FROM loadings WHERE id = ?').run(req.params.id);
  });

  transaction();
  res.json({ message: 'Yükleme silindi' });
});

export default router;
