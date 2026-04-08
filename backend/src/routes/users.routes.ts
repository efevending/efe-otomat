import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleCheck';

const router = Router();

// ==================== OTOMAT GRUPLARI (BÖLGELER) ====================
// Bu route'lar /:id'den önce olmalı

router.get('/otomat-groups/list', authenticateToken, (_req: Request, res: Response) => {
  const groups = db.prepare('SELECT * FROM otomat_groups ORDER BY name').all();
  res.json(groups);
});

router.post('/otomat-groups', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Grup adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO otomat_groups (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch {
    res.status(400).json({ error: 'Bu otomat grubu zaten mevcut' });
  }
});

router.delete('/otomat-groups/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  db.prepare('DELETE FROM user_otomat_groups WHERE otomat_group_id = ?').run(req.params.id);
  db.prepare('DELETE FROM otomat_groups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== KULLANICILAR ====================

// Tüm kullanıcıları getir (otomat grupları ve depo bilgisiyle)
router.get('/', authenticateToken, (_req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.surname, u.role, u.phone, u.address,
           u.salary, u.agi, u.shift_start, u.shift_end, u.warehouse_id, u.active, u.created_at,
           w.name as warehouse_name
    FROM users u
    LEFT JOIN warehouses w ON u.warehouse_id = w.id
    ORDER BY u.username
  `).all();

  // Her kullanıcının otomat gruplarını ekle
  const userGroups = db.prepare(`
    SELECT uog.user_id, og.id as group_id, og.name as group_name
    FROM user_otomat_groups uog
    JOIN otomat_groups og ON uog.otomat_group_id = og.id
  `).all() as any[];

  const usersWithGroups = (users as any[]).map(u => ({
    ...u,
    otomat_groups: userGroups.filter(g => g.user_id === u.id).map(g => ({ id: g.group_id, name: g.group_name })),
    otomat_group_names: userGroups.filter(g => g.user_id === u.id).map(g => g.group_name).join(', ')
  }));

  res.json(usersWithGroups);
});

// Tek kullanıcı getir
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.surname, u.role, u.phone, u.address,
           u.salary, u.agi, u.shift_start, u.shift_end, u.warehouse_id, u.active, u.created_at,
           w.name as warehouse_name
    FROM users u
    LEFT JOIN warehouses w ON u.warehouse_id = w.id
    WHERE u.id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const groups = db.prepare(`
    SELECT og.id, og.name FROM user_otomat_groups uog
    JOIN otomat_groups og ON uog.otomat_group_id = og.id
    WHERE uog.user_id = ?
  `).all(req.params.id);

  res.json({ ...(user as any), otomat_groups: groups });
});

// Yeni kullanıcı oluştur
router.post('/', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { username, full_name, surname, password, role, phone, address, salary, agi, shift_start, shift_end, warehouse_id, otomat_group_ids } = req.body;

  if (!username || !full_name || !password || !role) {
    return res.status(400).json({ error: 'Zorunlu alanlar eksik' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (username, full_name, surname, password_hash, role, phone, address, salary, agi, shift_start, shift_end, warehouse_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(username, full_name, surname || '', password_hash, role, phone || '', address || '', salary || 0, agi || 0, shift_start || '08:00', shift_end || '17:00', warehouse_id || null);

  const userId = result.lastInsertRowid;

  // Otomat gruplarını ata
  if (otomat_group_ids && Array.isArray(otomat_group_ids)) {
    const insertGroup = db.prepare('INSERT OR IGNORE INTO user_otomat_groups (user_id, otomat_group_id) VALUES (?, ?)');
    for (const gid of otomat_group_ids) {
      insertGroup.run(userId, gid);
    }
  }

  res.status(201).json({ id: userId, username, full_name, surname, role });
});

// Kullanıcı güncelle
router.put('/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { full_name, surname, role, phone, address, salary, agi, shift_start, shift_end, warehouse_id, active, password, otomat_group_ids } = req.body;
  const userId = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  if (password) {
    const password_hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, userId);
  }

  db.prepare(`
    UPDATE users SET full_name = ?, surname = ?, role = ?, phone = ?, address = ?,
    salary = ?, agi = ?, shift_start = ?, shift_end = ?, warehouse_id = ?, active = ?
    WHERE id = ?
  `).run(
    full_name ?? user.full_name,
    surname ?? user.surname ?? '',
    role ?? user.role,
    phone ?? user.phone ?? '',
    address ?? user.address ?? '',
    salary ?? user.salary ?? 0,
    agi ?? user.agi ?? 0,
    shift_start ?? user.shift_start ?? '08:00',
    shift_end ?? user.shift_end ?? '17:00',
    warehouse_id !== undefined ? (warehouse_id || null) : user.warehouse_id,
    active ?? user.active,
    userId
  );

  // Otomat gruplarını güncelle
  if (otomat_group_ids !== undefined && Array.isArray(otomat_group_ids)) {
    db.prepare('DELETE FROM user_otomat_groups WHERE user_id = ?').run(userId);
    const insertGroup = db.prepare('INSERT OR IGNORE INTO user_otomat_groups (user_id, otomat_group_id) VALUES (?, ?)');
    for (const gid of otomat_group_ids) {
      insertGroup.run(userId, gid);
    }
  }

  res.json({ message: 'Kullanıcı güncellendi' });
});

// Kullanıcı deaktif et
router.delete('/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const result = db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  res.json({ message: 'Kullanıcı deaktif edildi' });
});

export default router;
