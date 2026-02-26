import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleCheck';

const router = Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const users = db.prepare('SELECT id, username, full_name, role, phone, active, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, username, full_name, role, phone, active, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  res.json(user);
});

router.post('/', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { username, full_name, password, role, phone } = req.body;

  if (!username || !full_name || !password || !role) {
    return res.status(400).json({ error: 'Zorunlu alanlar eksik' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO users (username, full_name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)'
  ).run(username, full_name, password_hash, role, phone || null);

  res.status(201).json({ id: result.lastInsertRowid, username, full_name, role, phone });
});

router.put('/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { full_name, role, phone, active, password } = req.body;
  const userId = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  if (password) {
    const password_hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, userId);
  }

  db.prepare(
    'UPDATE users SET full_name = ?, role = ?, phone = ?, active = ? WHERE id = ?'
  ).run(
    full_name ?? user.full_name,
    role ?? user.role,
    phone ?? user.phone,
    active ?? user.active,
    userId
  );

  res.json({ message: 'Kullanıcı güncellendi' });
});

router.delete('/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const result = db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  res.json({ message: 'Kullanıcı deaktif edildi' });
});

export default router;
