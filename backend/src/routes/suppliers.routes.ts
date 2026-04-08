import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();
router.use(authenticateToken);

router.get('/', (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all());
});

router.get('/:id', (req: Request, res: Response) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Tedarikçi bulunamadı' });
  res.json(supplier);
});

router.post('/', requireRole('admin'), (req: Request, res: Response) => {
  const { name, address, phone, tax_no, tax_office, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Tedarikçi adı zorunlu' });

  const result = db.prepare(
    'INSERT INTO suppliers (name, address, phone, tax_no, tax_office, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, address || '', phone || '', tax_no || '', tax_office || '', notes || '');

  res.json({ id: result.lastInsertRowid, name });
});

router.put('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const { name, address, phone, tax_no, tax_office, notes } = req.body;
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id) as any;
  if (!supplier) return res.status(404).json({ error: 'Tedarikçi bulunamadı' });

  db.prepare(
    'UPDATE suppliers SET name = ?, address = ?, phone = ?, tax_no = ?, tax_office = ?, notes = ? WHERE id = ?'
  ).run(
    name ?? supplier.name, address ?? supplier.address, phone ?? supplier.phone,
    tax_no ?? supplier.tax_no, tax_office ?? supplier.tax_office, notes ?? supplier.notes,
    req.params.id
  );

  res.json({ message: 'Tedarikçi güncellendi' });
});

router.delete('/:id', requireRole('admin'), (req: Request, res: Response) => {
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
