import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// ==================== FİRMA ÜRÜN FİYATLARI ====================

// Bir firmanın ürün fiyatlarını getir
router.get('/firm/:firmId', authenticateToken, (req: Request, res: Response) => {
  const prices = db.prepare(`
    SELECT fpp.*, p.name as product_name, p.cost_price,
           pv.name as variety_name
    FROM firm_product_prices fpp
    JOIN products p ON fpp.product_id = p.id
    LEFT JOIN product_varieties pv ON p.variety_id = pv.id
    WHERE fpp.firm_id = ?
    ORDER BY p.name
  `).all(req.params.firmId);
  res.json(prices);
});

// Tüm ürünleri fiyatlarıyla birlikte getir (belirli firma için)
router.get('/products-with-prices/:firmId', authenticateToken, (req: Request, res: Response) => {
  const products = db.prepare(`
    SELECT p.id, p.name, p.cost_price, p.sale_price as default_sale_price,
           pv.name as variety_name,
           fpp.sale_price as firm_sale_price
    FROM products p
    LEFT JOIN product_varieties pv ON p.variety_id = pv.id
    LEFT JOIN firm_product_prices fpp ON p.id = fpp.product_id AND fpp.firm_id = ?
    WHERE p.active = 1
    ORDER BY p.name
  `).all(req.params.firmId);
  res.json(products);
});

// Birden fazla firmada ürün fiyatı güncelle
router.post('/update-firms', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { firm_ids, product_id, sale_price } = req.body;

  if (!firm_ids || !Array.isArray(firm_ids) || firm_ids.length === 0) {
    return res.status(400).json({ error: 'Firma seçilmedi' });
  }
  if (!product_id) return res.status(400).json({ error: 'Ürün seçilmedi' });

  const upsert = db.prepare(`
    INSERT INTO firm_product_prices (firm_id, product_id, sale_price, updated_at)
    VALUES (?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(firm_id, product_id) DO UPDATE SET
      sale_price = excluded.sale_price,
      updated_at = datetime('now', 'localtime')
  `);

  const transaction = db.transaction(() => {
    for (const firmId of firm_ids) {
      upsert.run(firmId, product_id, sale_price ?? 0);
    }
  });

  transaction();
  res.json({ message: `${firm_ids.length} firmada fiyat güncellendi` });
});

// Tek firma tek ürün fiyat güncelle
router.put('/firm/:firmId/product/:productId', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { sale_price } = req.body;
  const { firmId, productId } = req.params;

  db.prepare(`
    INSERT INTO firm_product_prices (firm_id, product_id, sale_price, updated_at)
    VALUES (?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(firm_id, product_id) DO UPDATE SET
      sale_price = excluded.sale_price,
      updated_at = datetime('now', 'localtime')
  `).run(firmId, productId, sale_price ?? 0);

  res.json({ message: 'Fiyat güncellendi' });
});

// ==================== FİYAT LİSTELERİ (ŞABLONLAR) ====================

router.get('/lists', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM price_lists ORDER BY name').all());
});

router.post('/lists', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Liste adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO price_lists (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch { res.status(400).json({ error: 'Bu liste zaten mevcut' }); }
});

router.delete('/lists/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  db.prepare('DELETE FROM price_list_items WHERE price_list_id = ?').run(req.params.id);
  db.prepare('DELETE FROM price_lists WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Fiyat listesi kalemlerini getir
router.get('/lists/:id/items', authenticateToken, (req: Request, res: Response) => {
  const items = db.prepare(`
    SELECT pli.*, p.name as product_name, p.cost_price, pv.name as variety_name
    FROM price_list_items pli
    JOIN products p ON pli.product_id = p.id
    LEFT JOIN product_varieties pv ON p.variety_id = pv.id
    WHERE pli.price_list_id = ?
    ORDER BY p.name
  `).all(req.params.id);
  res.json(items);
});

// Fiyat listesini seçili firmalara uygula
router.post('/lists/:id/apply', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { firm_ids } = req.body;
  const listId = req.params.id;

  if (!firm_ids || !Array.isArray(firm_ids) || firm_ids.length === 0) {
    return res.status(400).json({ error: 'Firma seçilmedi' });
  }

  const items = db.prepare('SELECT * FROM price_list_items WHERE price_list_id = ?').all(listId) as any[];

  const upsert = db.prepare(`
    INSERT INTO firm_product_prices (firm_id, product_id, sale_price, updated_at)
    VALUES (?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(firm_id, product_id) DO UPDATE SET
      sale_price = excluded.sale_price,
      updated_at = datetime('now', 'localtime')
  `);

  const transaction = db.transaction(() => {
    for (const firmId of firm_ids) {
      for (const item of items) {
        upsert.run(firmId, item.product_id, item.sale_price);
      }
    }
  });

  transaction();
  res.json({ message: `${firm_ids.length} firmaya ${items.length} ürün fiyatı uygulandı` });
});

export default router;
