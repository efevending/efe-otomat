import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// Dashboard özet
router.get('/dashboard', authenticateToken, (req: Request, res: Response) => {
  const totalMachines = (db.prepare('SELECT COUNT(*) as count FROM machines WHERE status = ?').get('active') as any).count;
  const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1').get() as any).count;
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users WHERE active = 1').get() as any).count;
  const totalWarehouses = (db.prepare('SELECT COUNT(*) as count FROM warehouses').get() as any).count;

  const today = new Date().toISOString().split('T')[0];

  const todayLoadings = (db.prepare('SELECT COUNT(*) as count FROM loadings WHERE loading_date = ?').get(today) as any).count;
  const todayCounts = (db.prepare('SELECT COUNT(*) as count FROM machine_counts WHERE count_date = ?').get(today) as any).count;
  const activeRoutes = (db.prepare('SELECT COUNT(*) as count FROM routes WHERE date = ? AND status = ?').get(today, 'active') as any).count;
  const pendingTransfers = (db.prepare('SELECT COUNT(*) as count FROM transfers WHERE status = ?').get('pending') as any).count;

  // Son 7 gün yükleme istatistikleri
  const last7DaysLoadings = db.prepare(`
    SELECT loading_date as date, COUNT(*) as count,
      (SELECT SUM(li.quantity) FROM loading_items li JOIN loadings l2 ON li.loading_id = l2.id WHERE l2.loading_date = l.loading_date) as total_items
    FROM loadings l
    WHERE loading_date >= date('now', '-7 days', 'localtime')
    GROUP BY loading_date ORDER BY loading_date
  `).all();

  // Son 10 yükleme
  const recentLoadings = db.prepare(`
    SELECT l.*, m.machine_no, m.name as machine_name, u.full_name as user_name
    FROM loadings l JOIN machines m ON l.machine_id = m.id JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC LIMIT 10
  `).all();

  // Son 10 sayım
  const recentCounts = db.prepare(`
    SELECT mc.*, m.machine_no, m.name as machine_name, u.full_name as user_name
    FROM machine_counts mc JOIN machines m ON mc.machine_id = m.id JOIN users u ON mc.user_id = u.id
    ORDER BY mc.created_at DESC LIMIT 10
  `).all();

  res.json({
    summary: { totalMachines, totalProducts, totalUsers, totalWarehouses, todayLoadings, todayCounts, activeRoutes, pendingTransfers },
    last7DaysLoadings,
    recentLoadings,
    recentCounts
  });
});

// Satış raporu
router.get('/sales', authenticateToken, requireRole('admin', 'warehouse_manager'), (req: Request, res: Response) => {
  const { start_date, end_date, machine_id } = req.query;

  let countQuery = `
    SELECT mc.id, mc.machine_id, mc.count_date, mc.count_time, m.machine_no, m.name as machine_name
    FROM machine_counts mc JOIN machines m ON mc.machine_id = m.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) { countQuery += ' AND mc.count_date >= ?'; params.push(start_date); }
  if (end_date) { countQuery += ' AND mc.count_date <= ?'; params.push(end_date); }
  if (machine_id) { countQuery += ' AND mc.machine_id = ?'; params.push(machine_id); }

  countQuery += ' ORDER BY mc.count_date DESC, mc.count_time DESC';

  const counts = db.prepare(countQuery).all(...params) as any[];

  // Her sayım için satış hesapla (basitleştirilmiş)
  const salesData = counts.map(count => {
    const prevCount = db.prepare(`
      SELECT id FROM machine_counts
      WHERE machine_id = ? AND (count_date < ? OR (count_date = ? AND count_time < ?))
      ORDER BY count_date DESC, count_time DESC LIMIT 1
    `).get(count.machine_id, count.count_date, count.count_date, count.count_time) as any;

    if (!prevCount) return null;

    const currentItems = db.prepare('SELECT * FROM machine_count_items WHERE count_id = ?').all(count.id) as any[];
    const prevItems = db.prepare('SELECT * FROM machine_count_items WHERE count_id = ?').all(prevCount.id) as any[];

    let totalSold = 0;
    let totalRevenue = 0;

    const currentByProduct = new Map<number, number>();
    for (const item of currentItems) {
      if (item.product_id) currentByProduct.set(item.product_id, (currentByProduct.get(item.product_id) || 0) + item.quantity);
    }
    const prevByProduct = new Map<number, number>();
    for (const item of prevItems) {
      if (item.product_id) prevByProduct.set(item.product_id, (prevByProduct.get(item.product_id) || 0) + item.quantity);
    }

    const loadings = db.prepare(`
      SELECT li.product_id, SUM(li.quantity) as total
      FROM loading_items li JOIN loadings l ON li.loading_id = l.id
      WHERE l.machine_id = ? AND (l.loading_date > ? OR (l.loading_date = ? AND l.loading_time > ?))
        AND (l.loading_date < ? OR (l.loading_date = ? AND l.loading_time <= ?))
      GROUP BY li.product_id
    `).all(count.machine_id,
      (db.prepare('SELECT count_date FROM machine_counts WHERE id = ?').get(prevCount.id) as any).count_date,
      (db.prepare('SELECT count_date FROM machine_counts WHERE id = ?').get(prevCount.id) as any).count_date,
      (db.prepare('SELECT count_time FROM machine_counts WHERE id = ?').get(prevCount.id) as any).count_time,
      count.count_date, count.count_date, count.count_time
    ) as any[];

    const loadingMap = new Map(loadings.map(l => [l.product_id, l.total]));
    const allProductIds = new Set([...currentByProduct.keys(), ...prevByProduct.keys()]);

    for (const pid of allProductIds) {
      const prev = prevByProduct.get(pid) || 0;
      const loaded = loadingMap.get(pid) || 0;
      const current = currentByProduct.get(pid) || 0;
      const sold = prev + loaded - current;
      if (sold > 0) {
        const product = db.prepare('SELECT sale_price FROM products WHERE id = ?').get(pid) as any;
        totalSold += sold;
        totalRevenue += sold * (product?.sale_price || 0);
      }
    }

    return {
      count_id: count.id,
      machine_no: count.machine_no,
      machine_name: count.machine_name,
      count_date: count.count_date,
      total_sold: totalSold,
      total_revenue: totalRevenue
    };
  }).filter(Boolean);

  res.json(salesData);
});

// Ürün raporu (en çok satan)
router.get('/products', authenticateToken, requireRole('admin', 'warehouse_manager'), (req: Request, res: Response) => {
  // Tüm yüklemeler üzerinden ürün bazlı istatistik
  const productStats = db.prepare(`
    SELECT p.id, p.name, p.category, p.cost_price, p.sale_price,
      COALESCE(SUM(li.quantity), 0) as total_loaded,
      COUNT(DISTINCT l.id) as loading_count,
      COUNT(DISTINCT l.machine_id) as machine_count
    FROM products p
    LEFT JOIN loading_items li ON li.product_id = p.id
    LEFT JOIN loadings l ON li.loading_id = l.id
    WHERE p.active = 1
    GROUP BY p.id
    ORDER BY total_loaded DESC
  `).all();

  res.json(productStats);
});

// Çalışan performans raporu
router.get('/employees', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params: any[] = [];
  if (start_date) { dateFilter += ' AND r.date >= ?'; params.push(start_date); }
  if (end_date) { dateFilter += ' AND r.date <= ?'; params.push(end_date); }

  const employees = db.prepare(`
    SELECT u.id, u.full_name, u.role,
      (SELECT COUNT(*) FROM routes r WHERE r.user_id = u.id ${dateFilter}) as route_count,
      (SELECT COUNT(*) FROM loadings l WHERE l.user_id = u.id) as loading_count,
      (SELECT COUNT(*) FROM machine_counts mc WHERE mc.user_id = u.id) as count_count,
      (SELECT COUNT(DISTINCT l2.machine_id) FROM loadings l2 WHERE l2.user_id = u.id) as machines_served
    FROM users u WHERE u.active = 1 AND u.role = 'field_worker'
    ORDER BY loading_count DESC
  `).all(...params, ...params);

  res.json(employees);
});

// Makina raporu
router.get('/machines', authenticateToken, requireRole('admin', 'warehouse_manager'), (req: Request, res: Response) => {
  const machineStats = db.prepare(`
    SELECT m.id, m.machine_no, m.name, m.status, w.name as warehouse_name,
      (SELECT COUNT(*) FROM loadings l WHERE l.machine_id = m.id) as total_loadings,
      (SELECT COUNT(*) FROM machine_counts mc WHERE mc.machine_id = m.id) as total_counts,
      (SELECT MAX(l2.loading_date) FROM loadings l2 WHERE l2.machine_id = m.id) as last_loading_date,
      (SELECT MAX(mc2.count_date) FROM machine_counts mc2 WHERE mc2.machine_id = m.id) as last_count_date
    FROM machines m
    LEFT JOIN warehouses w ON m.warehouse_id = w.id
    WHERE m.status != 'inactive'
    ORDER BY m.machine_no
  `).all();

  res.json(machineStats);
});

export default router;
