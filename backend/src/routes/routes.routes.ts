import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { user_id, date, status } = req.query;
  let query = `
    SELECT r.*, u.full_name as user_name,
      (SELECT COUNT(*) FROM loadings l WHERE l.route_id = r.id) as loading_count
    FROM routes r
    JOIN users u ON r.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user_id) { query += ' AND r.user_id = ?'; params.push(user_id); }
  if (date) { query += ' AND r.date = ?'; params.push(date); }
  if (status) { query += ' AND r.status = ?'; params.push(status); }

  if (req.user!.role === 'field_worker') {
    query += ' AND r.user_id = ?';
    params.push(req.user!.id);
  }

  query += ' ORDER BY r.date DESC, r.start_time DESC LIMIT 500';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const route = db.prepare(`
    SELECT r.*, u.full_name as user_name
    FROM routes r JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!route) return res.status(404).json({ error: 'Rota bulunamadı' });

  const loadings = db.prepare(`
    SELECT l.*, m.machine_no, m.name as machine_name,
      (SELECT SUM(quantity) FROM loading_items WHERE loading_id = l.id) as total_items
    FROM loadings l JOIN machines m ON l.machine_id = m.id
    WHERE l.route_id = ?
    ORDER BY l.loading_time
  `).all(req.params.id);

  res.json({ ...route as any, loadings });
});

// Rota başlat
router.post('/start', authenticateToken, (req: Request, res: Response) => {
  const { notes } = req.body;
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].slice(0, 5);

  // Bugün zaten aktif rota var mı?
  const existing = db.prepare('SELECT * FROM routes WHERE user_id = ? AND date = ? AND status = ?')
    .get(req.user!.id, date, 'active');

  if (existing) {
    return res.status(400).json({ error: 'Bugün zaten aktif bir rotanız var' });
  }

  const result = db.prepare(
    'INSERT INTO routes (user_id, date, start_time, status, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user!.id, date, time, 'active', notes || null);

  res.status(201).json({ id: result.lastInsertRowid, date, start_time: time, message: 'Rota başlatıldı' });
});

// Rota bitir
router.post('/:id/end', authenticateToken, (req: Request, res: Response) => {
  const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id) as any;
  if (!route) return res.status(404).json({ error: 'Rota bulunamadı' });
  if (route.status !== 'active') return res.status(400).json({ error: 'Rota zaten tamamlanmış' });

  const time = new Date().toTimeString().split(' ')[0].slice(0, 5);

  db.prepare('UPDATE routes SET end_time = ?, status = ? WHERE id = ?')
    .run(time, 'completed', req.params.id);

  res.json({ message: 'Rota tamamlandı', end_time: time });
});

export default router;
