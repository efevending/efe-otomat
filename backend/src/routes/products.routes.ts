import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { active, category } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (active !== undefined) { query += ' AND active = ?'; params.push(active); }
  if (category) { query += ' AND category = ?'; params.push(category); }

  query += ' ORDER BY name';
  res.json(db.prepare(query).all(...params));
});

router.get('/categories', authenticateToken, (req: Request, res: Response) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
  res.json(categories.map((c: any) => c.category));
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json(product);
});

router.post('/', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name, barcode, category, cost_price, sale_price } = req.body;

  if (!name) return res.status(400).json({ error: 'Ürün adı gerekli' });

  const result = db.prepare(
    'INSERT INTO products (name, barcode, category, cost_price, sale_price) VALUES (?, ?, ?, ?, ?)'
  ).run(name, barcode || null, category || null, cost_price || 0, sale_price || 0);

  res.status(201).json({ id: result.lastInsertRowid, name, barcode, category, cost_price, sale_price });
});

router.put('/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name, barcode, category, cost_price, sale_price, active } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

  db.prepare(
    'UPDATE products SET name = ?, barcode = ?, category = ?, cost_price = ?, sale_price = ?, active = ? WHERE id = ?'
  ).run(
    name ?? product.name, barcode ?? product.barcode, category ?? product.category,
    cost_price ?? product.cost_price, sale_price ?? product.sale_price,
    active ?? product.active, req.params.id
  );

  res.json({ message: 'Ürün güncellendi' });
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ürün deaktif edildi' });
});

export default router;
