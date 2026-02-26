import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { machine_id, user_id, start_date, end_date } = req.query;
  let query = `
    SELECT mc.*, m.machine_no, m.name as machine_name, u.full_name as user_name,
      (SELECT SUM(quantity) FROM machine_count_items WHERE count_id = mc.id) as total_items
    FROM machine_counts mc
    JOIN machines m ON mc.machine_id = m.id
    JOIN users u ON mc.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (machine_id) { query += ' AND mc.machine_id = ?'; params.push(machine_id); }
  if (user_id) { query += ' AND mc.user_id = ?'; params.push(user_id); }
  if (start_date) { query += ' AND mc.count_date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND mc.count_date <= ?'; params.push(end_date); }

  if (req.user!.role === 'field_worker') {
    query += ' AND mc.user_id = ?';
    params.push(req.user!.id);
  }

  query += ' ORDER BY mc.count_date DESC, mc.count_time DESC LIMIT 500';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const count = db.prepare(`
    SELECT mc.*, m.machine_no, m.name as machine_name, u.full_name as user_name
    FROM machine_counts mc
    JOIN machines m ON mc.machine_id = m.id
    JOIN users u ON mc.user_id = u.id
    WHERE mc.id = ?
  `).get(req.params.id);

  if (!count) return res.status(404).json({ error: 'Sayım bulunamadı' });

  const items = db.prepare(`
    SELECT mci.*, p.name as product_name, p.barcode, p.sale_price, p.cost_price
    FROM machine_count_items mci
    LEFT JOIN products p ON mci.product_id = p.id
    WHERE mci.count_id = ?
    ORDER BY mci.spiral_number
  `).all(req.params.id);

  res.json({ ...count as any, items });
});

// İki sayım arası satış hesaplama
router.get('/:id/sales', authenticateToken, (req: Request, res: Response) => {
  const currentCount = db.prepare(`
    SELECT mc.*, m.machine_no, m.name as machine_name
    FROM machine_counts mc JOIN machines m ON mc.machine_id = m.id
    WHERE mc.id = ?
  `).get(req.params.id) as any;

  if (!currentCount) return res.status(404).json({ error: 'Sayım bulunamadı' });

  // Önceki sayımı bul
  const previousCount = db.prepare(`
    SELECT * FROM machine_counts
    WHERE machine_id = ? AND (count_date < ? OR (count_date = ? AND count_time < ?))
    ORDER BY count_date DESC, count_time DESC LIMIT 1
  `).get(currentCount.machine_id, currentCount.count_date, currentCount.count_date, currentCount.count_time) as any;

  const currentItems = db.prepare('SELECT * FROM machine_count_items WHERE count_id = ?').all(req.params.id) as any[];

  let previousItems: any[] = [];
  if (previousCount) {
    previousItems = db.prepare('SELECT * FROM machine_count_items WHERE count_id = ?').all(previousCount.id) as any[];
  }

  // Aradaki yüklemeleri bul
  let loadingQuery = `
    SELECT li.product_id, SUM(li.quantity) as total_loaded
    FROM loading_items li
    JOIN loadings l ON li.loading_id = l.id
    WHERE l.machine_id = ?
  `;
  const loadingParams: any[] = [currentCount.machine_id];

  if (previousCount) {
    loadingQuery += ' AND (l.loading_date > ? OR (l.loading_date = ? AND l.loading_time > ?))';
    loadingParams.push(previousCount.count_date, previousCount.count_date, previousCount.count_time);
  }

  loadingQuery += ' AND (l.loading_date < ? OR (l.loading_date = ? AND l.loading_time <= ?))';
  loadingParams.push(currentCount.count_date, currentCount.count_date, currentCount.count_time);
  loadingQuery += ' GROUP BY li.product_id';

  const loadings = db.prepare(loadingQuery).all(...loadingParams) as any[];
  const loadingMap = new Map(loadings.map(l => [l.product_id, l.total_loaded]));

  // Her ürün için satış hesapla
  const products = db.prepare('SELECT * FROM products').all() as any[];
  const productMap = new Map(products.map(p => [p.id, p]));

  const sales: any[] = [];
  let totalRevenue = 0;
  let totalCost = 0;

  // Mevcut sayımdaki ürünleri grupla
  const currentByProduct = new Map<number, number>();
  for (const item of currentItems) {
    if (item.product_id) {
      currentByProduct.set(item.product_id, (currentByProduct.get(item.product_id) || 0) + item.quantity);
    }
  }

  const previousByProduct = new Map<number, number>();
  for (const item of previousItems) {
    if (item.product_id) {
      previousByProduct.set(item.product_id, (previousByProduct.get(item.product_id) || 0) + item.quantity);
    }
  }

  // Tüm ilgili ürünleri birleştir
  const allProductIds = new Set([...currentByProduct.keys(), ...previousByProduct.keys(), ...loadingMap.keys()]);

  for (const productId of allProductIds) {
    const product = productMap.get(productId);
    if (!product) continue;

    const prev = previousByProduct.get(productId) || 0;
    const loaded = loadingMap.get(productId) || 0;
    const current = currentByProduct.get(productId) || 0;

    const sold = prev + loaded - current;
    if (sold < 0) continue; // negatif satış mantıklı değil

    const revenue = sold * product.sale_price;
    const cost = sold * product.cost_price;

    totalRevenue += revenue;
    totalCost += cost;

    if (sold > 0) {
      sales.push({
        product_id: productId,
        product_name: product.name,
        previous_count: prev,
        loaded,
        current_count: current,
        sold,
        sale_price: product.sale_price,
        cost_price: product.cost_price,
        revenue,
        cost,
        profit: revenue - cost
      });
    }
  }

  res.json({
    current_count: currentCount,
    previous_count: previousCount || null,
    period: previousCount ? `${previousCount.count_date} - ${currentCount.count_date}` : `Başlangıç - ${currentCount.count_date}`,
    sales: sales.sort((a, b) => b.sold - a.sold),
    summary: {
      total_sold: sales.reduce((sum, s) => sum + s.sold, 0),
      total_revenue: totalRevenue,
      total_cost: totalCost,
      total_profit: totalRevenue - totalCost
    }
  });
});

router.post('/', authenticateToken, (req: Request, res: Response) => {
  const { machine_id, count_date, count_time, items, notes } = req.body;

  if (!machine_id || !items?.length) {
    return res.status(400).json({ error: 'Makina ve sayım kalemleri gerekli' });
  }

  const now = new Date();
  const date = count_date || now.toISOString().split('T')[0];
  const time = count_time || now.toTimeString().split(' ')[0].slice(0, 5);

  const transaction = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO machine_counts (machine_id, user_id, count_date, count_time, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(machine_id, req.user!.id, date, time, notes || null);

    const countId = result.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO machine_count_items (count_id, spiral_number, product_id, quantity) VALUES (?, ?, ?, ?)'
    );

    for (const item of items) {
      insertItem.run(countId, item.spiral_number, item.product_id || null, item.quantity || 0);
    }

    return countId;
  });

  const countId = transaction();
  res.status(201).json({ id: countId, message: 'Sayım kaydedildi' });
});

export default router;
