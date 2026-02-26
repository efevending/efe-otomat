import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { status } = req.query;
  let query = `
    SELECT t.*,
      fw.name as from_warehouse_name, tw.name as to_warehouse_name,
      ru.full_name as requested_by_name, au.full_name as approved_by_name
    FROM transfers t
    JOIN warehouses fw ON t.from_warehouse_id = fw.id
    JOIN warehouses tw ON t.to_warehouse_id = tw.id
    JOIN users ru ON t.requested_by = ru.id
    LEFT JOIN users au ON t.approved_by = au.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  query += ' ORDER BY t.created_at DESC';

  const transfers = db.prepare(query).all(...params);
  res.json(transfers);
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const transfer = db.prepare(`
    SELECT t.*,
      fw.name as from_warehouse_name, tw.name as to_warehouse_name,
      ru.full_name as requested_by_name, au.full_name as approved_by_name
    FROM transfers t
    JOIN warehouses fw ON t.from_warehouse_id = fw.id
    JOIN warehouses tw ON t.to_warehouse_id = tw.id
    JOIN users ru ON t.requested_by = ru.id
    LEFT JOIN users au ON t.approved_by = au.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!transfer) return res.status(404).json({ error: 'Transfer bulunamadı' });

  const items = db.prepare(`
    SELECT ti.*, p.name as product_name, p.barcode
    FROM transfer_items ti JOIN products p ON ti.product_id = p.id
    WHERE ti.transfer_id = ?
  `).all(req.params.id);

  res.json({ ...transfer as any, items });
});

router.post('/', authenticateToken, requireRole('admin', 'warehouse_manager'), (req: Request, res: Response) => {
  const { from_warehouse_id, to_warehouse_id, items, notes } = req.body;

  if (!from_warehouse_id || !to_warehouse_id || !items?.length) {
    return res.status(400).json({ error: 'Kaynak depo, hedef depo ve ürünler gerekli' });
  }

  const transaction = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO transfers (from_warehouse_id, to_warehouse_id, requested_by, notes) VALUES (?, ?, ?, ?)'
    ).run(from_warehouse_id, to_warehouse_id, req.user!.id, notes || null);

    const transferId = result.lastInsertRowid;

    const insertItem = db.prepare('INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)');
    for (const item of items) {
      insertItem.run(transferId, item.product_id, item.quantity);
    }

    return transferId;
  });

  const transferId = transaction();
  res.status(201).json({ id: transferId, message: 'Transfer talebi oluşturuldu' });
});

router.post('/:id/approve', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(req.params.id) as any;
  if (!transfer) return res.status(404).json({ error: 'Transfer bulunamadı' });
  if (transfer.status !== 'pending') return res.status(400).json({ error: 'Transfer zaten işlenmiş' });

  db.prepare(
    'UPDATE transfers SET status = ?, approved_by = ?, approved_at = datetime("now", "localtime") WHERE id = ?'
  ).run('approved', req.user!.id, req.params.id);

  res.json({ message: 'Transfer onaylandı' });
});

router.post('/:id/reject', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(req.params.id) as any;
  if (!transfer) return res.status(404).json({ error: 'Transfer bulunamadı' });
  if (transfer.status !== 'pending') return res.status(400).json({ error: 'Transfer zaten işlenmiş' });

  db.prepare(
    'UPDATE transfers SET status = ?, approved_by = ?, approved_at = datetime("now", "localtime") WHERE id = ?'
  ).run('rejected', req.user!.id, req.params.id);

  res.json({ message: 'Transfer reddedildi' });
});

router.post('/:id/complete', authenticateToken, requireRole('admin', 'warehouse_manager'), (req: Request, res: Response) => {
  const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(req.params.id) as any;
  if (!transfer) return res.status(404).json({ error: 'Transfer bulunamadı' });
  if (transfer.status !== 'approved') return res.status(400).json({ error: 'Transfer önce onaylanmalı' });

  const items = db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').all(req.params.id) as any[];

  const transaction = db.transaction(() => {
    for (const item of items) {
      // Kaynak depodan düş
      db.prepare('UPDATE warehouse_stock SET quantity = quantity - ?, last_updated = datetime("now", "localtime") WHERE warehouse_id = ? AND product_id = ?')
        .run(item.quantity, transfer.from_warehouse_id, item.product_id);

      db.prepare(
        'INSERT INTO warehouse_transactions (warehouse_id, product_id, quantity, type, reference_type, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(transfer.from_warehouse_id, item.product_id, item.quantity, 'out', 'transfer', transfer.id, req.user!.id);

      // Hedef depoya ekle
      const existing = db.prepare('SELECT * FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?')
        .get(transfer.to_warehouse_id, item.product_id);

      if (existing) {
        db.prepare('UPDATE warehouse_stock SET quantity = quantity + ?, last_updated = datetime("now", "localtime") WHERE warehouse_id = ? AND product_id = ?')
          .run(item.quantity, transfer.to_warehouse_id, item.product_id);
      } else {
        db.prepare('INSERT INTO warehouse_stock (warehouse_id, product_id, quantity) VALUES (?, ?, ?)')
          .run(transfer.to_warehouse_id, item.product_id, item.quantity);
      }

      db.prepare(
        'INSERT INTO warehouse_transactions (warehouse_id, product_id, quantity, type, reference_type, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(transfer.to_warehouse_id, item.product_id, item.quantity, 'in', 'transfer', transfer.id, req.user!.id);
    }

    db.prepare('UPDATE transfers SET status = ?, completed_at = datetime("now", "localtime") WHERE id = ?')
      .run('completed', req.params.id);
  });

  transaction();
  res.json({ message: 'Transfer tamamlandı, stoklar güncellendi' });
});

export default router;
