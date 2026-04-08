import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// ==================== LOOKUP TABLOLARI ====================

// Ürün Türleri
router.get('/types', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM product_types ORDER BY name').all());
});
router.post('/types', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Tür adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO product_types (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch { res.status(400).json({ error: 'Bu tür zaten mevcut' }); }
});

// Ürün Markaları
router.get('/brands', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM product_brands ORDER BY name').all());
});
router.post('/brands', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Marka adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO product_brands (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch { res.status(400).json({ error: 'Bu marka zaten mevcut' }); }
});

// Ürün Çeşitleri
router.get('/varieties', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM product_varieties ORDER BY name').all());
});
router.post('/varieties', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Çeşit adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO product_varieties (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch { res.status(400).json({ error: 'Bu çeşit zaten mevcut' }); }
});

// Kategoriler (eski uyumluluk)
router.get('/categories', authenticateToken, (_req: Request, res: Response) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
  res.json(categories.map((c: any) => c.category));
});

// ==================== ÜRÜNLER ====================

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { active, category, show_hidden } = req.query;
  let query = `
    SELECT p.*,
      pt.name as type_name,
      pb.name as brand_name,
      pv.name as variety_name
    FROM products p
    LEFT JOIN product_types pt ON p.product_type_id = pt.id
    LEFT JOIN product_brands pb ON p.brand_id = pb.id
    LEFT JOIN product_varieties pv ON p.variety_id = pv.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (!show_hidden) { query += ' AND p.active = 1'; }
  if (active !== undefined) { query += ' AND p.active = ?'; params.push(active); }
  if (category) { query += ' AND p.category = ?'; params.push(category); }

  query += ' ORDER BY pb.name, p.name';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const product = db.prepare(`
    SELECT p.*, pt.name as type_name, pb.name as brand_name, pv.name as variety_name
    FROM products p
    LEFT JOIN product_types pt ON p.product_type_id = pt.id
    LEFT JOIN product_brands pb ON p.brand_id = pb.id
    LEFT JOIN product_varieties pv ON p.variety_id = pv.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json(product);
});

router.post('/', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const {
    name, short_name, barcode, box_barcode, case_barcode, category,
    product_type_id, brand_id, variety_id, unit_type, unit_value,
    kdv_rate, cost_price, sale_price, default_unit, shelf_life,
    case_quantity, box_quantity, stock_no, default_spiral_capacity
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Ürün adı gerekli' });

  const result = db.prepare(`
    INSERT INTO products (name, short_name, barcode, box_barcode, case_barcode, category,
      product_type_id, brand_id, variety_id, unit_type, unit_value, kdv_rate,
      cost_price, sale_price, default_unit, shelf_life,
      case_quantity, box_quantity, stock_no, default_spiral_capacity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, short_name || '', barcode || '', box_barcode || '', case_barcode || '', category || null,
    product_type_id || null, brand_id || null, variety_id || null,
    unit_type || 'GRAM', unit_value || '', kdv_rate ?? 0,
    cost_price ?? 0, sale_price ?? 0, default_unit || '', shelf_life || '',
    case_quantity ?? 1, box_quantity ?? 1, stock_no || '', default_spiral_capacity ?? 8
  );

  res.status(201).json({ id: result.lastInsertRowid, name });
});

router.put('/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

  const {
    name, short_name, barcode, box_barcode, case_barcode, category,
    product_type_id, brand_id, variety_id, unit_type, unit_value,
    kdv_rate, cost_price, sale_price, default_unit, shelf_life,
    case_quantity, box_quantity, stock_no, default_spiral_capacity, active
  } = req.body;

  db.prepare(`
    UPDATE products SET name = ?, short_name = ?, barcode = ?, box_barcode = ?, case_barcode = ?, category = ?,
      product_type_id = ?, brand_id = ?, variety_id = ?, unit_type = ?, unit_value = ?, kdv_rate = ?,
      cost_price = ?, sale_price = ?, default_unit = ?, shelf_life = ?,
      case_quantity = ?, box_quantity = ?, stock_no = ?, default_spiral_capacity = ?, active = ?
    WHERE id = ?
  `).run(
    name ?? product.name, short_name ?? product.short_name ?? '',
    barcode ?? product.barcode ?? '', box_barcode ?? product.box_barcode ?? '',
    case_barcode ?? product.case_barcode ?? '', category ?? product.category,
    product_type_id !== undefined ? (product_type_id || null) : product.product_type_id,
    brand_id !== undefined ? (brand_id || null) : product.brand_id,
    variety_id !== undefined ? (variety_id || null) : product.variety_id,
    unit_type ?? product.unit_type ?? 'GRAM', unit_value ?? product.unit_value ?? '',
    kdv_rate ?? product.kdv_rate ?? 0,
    cost_price ?? product.cost_price ?? 0, sale_price ?? product.sale_price ?? 0,
    default_unit ?? product.default_unit ?? '', shelf_life ?? product.shelf_life ?? '',
    case_quantity ?? product.case_quantity ?? 1, box_quantity ?? product.box_quantity ?? 1,
    stock_no ?? product.stock_no ?? '', default_spiral_capacity ?? product.default_spiral_capacity ?? 8,
    active ?? product.active, req.params.id
  );

  res.json({ message: 'Ürün güncellendi' });
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ürün gizlendi' });
});

// Ürünü tekrar aktif yap
router.put('/:id/activate', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  db.prepare('UPDATE products SET active = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ürün aktif edildi' });
});

export default router;
