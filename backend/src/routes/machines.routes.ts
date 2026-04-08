import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// ==================== LOOKUP TABLOLARI ====================

// Otomat Modelleri
router.get('/models', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM otomat_models ORDER BY name').all());
});
router.post('/models', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Model adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO otomat_models (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch { res.status(400).json({ error: 'Bu model zaten mevcut' }); }
});
router.delete('/models/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  db.prepare('UPDATE machines SET otomat_model_id = NULL WHERE otomat_model_id = ?').run(req.params.id);
  db.prepare('DELETE FROM otomat_models WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Otomat Bölgeleri
router.get('/regions', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM otomat_regions ORDER BY name').all());
});
router.post('/regions', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Bölge adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO otomat_regions (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch { res.status(400).json({ error: 'Bu bölge zaten mevcut' }); }
});
router.delete('/regions/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  db.prepare('UPDATE machines SET otomat_region_id = NULL WHERE otomat_region_id = ?').run(req.params.id);
  db.prepare('DELETE FROM otomat_regions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Otomat Tipleri
router.get('/types', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM otomat_types ORDER BY name').all());
});
router.post('/types', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Tip adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO otomat_types (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch { res.status(400).json({ error: 'Bu tip zaten mevcut' }); }
});

// İçecek Grupları
router.get('/drink-groups', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM drink_groups ORDER BY name').all());
});
router.post('/drink-groups', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Grup adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO drink_groups (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch { res.status(400).json({ error: 'Bu grup zaten mevcut' }); }
});

// ==================== OTOMATLAR ====================

router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { status, warehouse_id, firm_id } = req.query;
  let query = `
    SELECT m.*,
      w.name as warehouse_name,
      f.firma_adi as firm_name,
      fg.name as firm_group_name,
      f.unvan as firm_unvan,
      om.name as model_name,
      oreg.name as region_name,
      ot.name as type_name,
      dg.name as drink_group_name,
      og.name as otomat_group_name,
      u.full_name as responsible_name
    FROM machines m
    LEFT JOIN warehouses w ON m.warehouse_id = w.id
    LEFT JOIN firms f ON m.firm_id = f.id
    LEFT JOIN firma_groups fg ON f.firma_group_id = fg.id
    LEFT JOIN otomat_models om ON m.otomat_model_id = om.id
    LEFT JOIN otomat_regions oreg ON m.otomat_region_id = oreg.id
    LEFT JOIN otomat_types ot ON m.otomat_type_id = ot.id
    LEFT JOIN drink_groups dg ON m.drink_group_id = dg.id
    LEFT JOIN otomat_groups og ON m.otomat_group_id = og.id
    LEFT JOIN users u ON m.responsible_user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) { query += ' AND m.status = ?'; params.push(status); }
  if (warehouse_id) { query += ' AND m.warehouse_id = ?'; params.push(warehouse_id); }
  if (firm_id) { query += ' AND m.firm_id = ?'; params.push(firm_id); }

  query += ' ORDER BY m.machine_no';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const machine = db.prepare(`
    SELECT m.*,
      w.name as warehouse_name,
      f.firma_adi as firm_name,
      om.name as model_name,
      oreg.name as region_name,
      ot.name as type_name,
      dg.name as drink_group_name,
      og.name as otomat_group_name,
      u.full_name as responsible_name
    FROM machines m
    LEFT JOIN warehouses w ON m.warehouse_id = w.id
    LEFT JOIN firms f ON m.firm_id = f.id
    LEFT JOIN otomat_models om ON m.otomat_model_id = om.id
    LEFT JOIN otomat_regions oreg ON m.otomat_region_id = oreg.id
    LEFT JOIN otomat_types ot ON m.otomat_type_id = ot.id
    LEFT JOIN drink_groups dg ON m.drink_group_id = dg.id
    LEFT JOIN otomat_groups og ON m.otomat_group_id = og.id
    LEFT JOIN users u ON m.responsible_user_id = u.id
    WHERE m.id = ?
  `).get(req.params.id);
  if (!machine) return res.status(404).json({ error: 'Otomat bulunamadı' });
  res.json(machine);
});

router.post('/', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const {
    machine_no, name, serial_no, firm_id, otomat_model_id, otomat_region_id, otomat_type_id,
    address, sales_quota, responsible_user_id, is_filling, credit_card, cup_capacity_1, cup_capacity_2,
    warehouse_id, drink_group_id, otomat_group_id, yandolap_depo, dia_depo,
    location_description, spiral_rows, spiral_cols, notes
  } = req.body;

  if (!machine_no || !name) {
    return res.status(400).json({ error: 'Otomat numarası ve adı gerekli' });
  }

  const existing = db.prepare('SELECT id FROM machines WHERE machine_no = ?').get(machine_no);
  if (existing) return res.status(409).json({ error: 'Bu otomat numarası zaten kullanılıyor' });

  const result = db.prepare(`
    INSERT INTO machines (machine_no, name, serial_no, firm_id, otomat_model_id, otomat_region_id, otomat_type_id,
      address, sales_quota, responsible_user_id, is_filling, credit_card, cup_capacity_1, cup_capacity_2,
      warehouse_id, drink_group_id, otomat_group_id, yandolap_depo, dia_depo,
      location_description, spiral_rows, spiral_cols, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    machine_no, name, serial_no || '', firm_id || null, otomat_model_id || null,
    otomat_region_id || null, otomat_type_id || null, address || '', sales_quota ?? 1,
    responsible_user_id || null, is_filling ?? 1, credit_card ?? 0,
    cup_capacity_1 ?? 0, cup_capacity_2 ?? 0, warehouse_id || null,
    drink_group_id || null, otomat_group_id || null, yandolap_depo || '', dia_depo || '',
    location_description || null, spiral_rows || 8, spiral_cols || 10, notes || null
  );

  res.status(201).json({ id: result.lastInsertRowid, machine_no, name });
});

router.put('/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id) as any;
  if (!machine) return res.status(404).json({ error: 'Otomat bulunamadı' });

  const {
    machine_no, name, serial_no, firm_id, otomat_model_id, otomat_region_id, otomat_type_id,
    address, sales_quota, responsible_user_id, is_filling, credit_card, cup_capacity_1, cup_capacity_2,
    warehouse_id, drink_group_id, otomat_group_id, yandolap_depo, dia_depo,
    location_description, spiral_rows, spiral_cols, status, notes
  } = req.body;

  if (machine_no && machine_no !== machine.machine_no) {
    const existing = db.prepare('SELECT id FROM machines WHERE machine_no = ? AND id != ?').get(machine_no, req.params.id);
    if (existing) return res.status(409).json({ error: 'Bu otomat numarası zaten kullanılıyor' });
  }

  db.prepare(`
    UPDATE machines SET machine_no = ?, name = ?, serial_no = ?, firm_id = ?, otomat_model_id = ?,
      otomat_region_id = ?, otomat_type_id = ?, address = ?, sales_quota = ?, responsible_user_id = ?,
      is_filling = ?, credit_card = ?, cup_capacity_1 = ?, cup_capacity_2 = ?,
      warehouse_id = ?, drink_group_id = ?, otomat_group_id = ?, yandolap_depo = ?, dia_depo = ?,
      location_description = ?, spiral_rows = ?, spiral_cols = ?, status = ?, notes = ?
    WHERE id = ?
  `).run(
    machine_no ?? machine.machine_no, name ?? machine.name,
    serial_no ?? machine.serial_no ?? '', firm_id !== undefined ? (firm_id || null) : machine.firm_id,
    otomat_model_id !== undefined ? (otomat_model_id || null) : machine.otomat_model_id,
    otomat_region_id !== undefined ? (otomat_region_id || null) : machine.otomat_region_id,
    otomat_type_id !== undefined ? (otomat_type_id || null) : machine.otomat_type_id,
    address ?? machine.address ?? '',
    sales_quota ?? machine.sales_quota ?? 1,
    responsible_user_id !== undefined ? (responsible_user_id || null) : machine.responsible_user_id,
    is_filling ?? machine.is_filling ?? 1, credit_card ?? machine.credit_card ?? 0,
    cup_capacity_1 ?? machine.cup_capacity_1 ?? 0, cup_capacity_2 ?? machine.cup_capacity_2 ?? 0,
    warehouse_id !== undefined ? (warehouse_id || null) : machine.warehouse_id,
    drink_group_id !== undefined ? (drink_group_id || null) : machine.drink_group_id,
    otomat_group_id !== undefined ? (otomat_group_id || null) : machine.otomat_group_id,
    yandolap_depo ?? machine.yandolap_depo ?? '', dia_depo ?? machine.dia_depo ?? '',
    location_description ?? machine.location_description,
    spiral_rows ?? machine.spiral_rows, spiral_cols ?? machine.spiral_cols,
    status ?? machine.status, notes ?? machine.notes, req.params.id
  );

  res.json({ message: 'Otomat güncellendi' });
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const result = db.prepare('UPDATE machines SET status = ? WHERE id = ?').run('inactive', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Otomat bulunamadı' });
  res.json({ message: 'Otomat deaktif edildi' });
});

export default router;
