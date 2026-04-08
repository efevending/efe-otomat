import { Router } from 'express';
import db from '../db/index';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ==================== FİRMA GRUPLARI ====================

// Tüm firma gruplarını getir
router.get('/groups', (_req, res) => {
  const groups = db.prepare('SELECT * FROM firma_groups ORDER BY name').all();
  res.json(groups);
});

// Yeni firma grubu oluştur
router.post('/groups', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Grup adı zorunlu' });
  const result = db.prepare('INSERT INTO firma_groups (name) VALUES (?)').run(name);
  res.json({ id: result.lastInsertRowid, name });
});

// Firma grubu güncelle
router.put('/groups/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Grup adı zorunlu' });
  db.prepare('UPDATE firma_groups SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ id: Number(req.params.id), name });
});

// Firma grubu sil
router.delete('/groups/:id', (req, res) => {
  db.prepare('UPDATE firms SET firma_group_id = NULL WHERE firma_group_id = ?').run(req.params.id);
  db.prepare('DELETE FROM firma_groups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== FİRMA ÇEŞİTLERİ ====================

// Tüm firma çeşitlerini getir
router.get('/types', (_req, res) => {
  const types = db.prepare('SELECT * FROM firma_types ORDER BY name').all();
  res.json(types);
});

// Yeni firma çeşidi oluştur
router.post('/types', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Çeşit adı zorunlu' });
  try {
    const result = db.prepare('INSERT INTO firma_types (name) VALUES (?)').run(name);
    res.json({ id: result.lastInsertRowid, name });
  } catch {
    res.status(400).json({ error: 'Bu firma çeşidi zaten mevcut' });
  }
});

// Firma çeşidi sil
router.delete('/types/:id', (req, res) => {
  db.prepare('UPDATE firms SET firma_type_id = NULL WHERE firma_type_id = ?').run(req.params.id);
  db.prepare('DELETE FROM firma_types WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== FİRMALAR ====================

// Tüm firmaları getir (opsiyonel grup filtresi)
router.get('/', (req, res) => {
  const { group_id } = req.query;
  let query = `
    SELECT f.*, fg.name as group_name, ft.name as type_name
    FROM firms f
    LEFT JOIN firma_groups fg ON f.firma_group_id = fg.id
    LEFT JOIN firma_types ft ON f.firma_type_id = ft.id
  `;
  const params: any[] = [];

  if (group_id) {
    query += ' WHERE f.firma_group_id = ?';
    params.push(group_id);
  }

  query += ' ORDER BY f.firma_adi';
  const firms = db.prepare(query).all(...params);
  res.json(firms);
});

// Tek firma getir
router.get('/:id', (req, res) => {
  const firm = db.prepare(`
    SELECT f.*, fg.name as group_name, ft.name as type_name
    FROM firms f
    LEFT JOIN firma_groups fg ON f.firma_group_id = fg.id
    LEFT JOIN firma_types ft ON f.firma_type_id = ft.id
    WHERE f.id = ?
  `).get(req.params.id);
  if (!firm) return res.status(404).json({ error: 'Firma bulunamadı' });
  res.json(firm);
});

// Yeni firma oluştur
router.post('/', (req, res) => {
  const { firma_group_id, firma_adi, unvan, adres, telefon, vergi_no, firma_type_id, fatura_listesi, otomat_gelir_listesi, kota_var, ucret_degisiklik_tarihi } = req.body;
  if (!firma_adi) return res.status(400).json({ error: 'Firma adı zorunlu' });

  const result = db.prepare(`
    INSERT INTO firms (firma_group_id, firma_adi, unvan, adres, telefon, vergi_no, firma_type_id, fatura_listesi, otomat_gelir_listesi, kota_var, ucret_degisiklik_tarihi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    firma_group_id || null, firma_adi, unvan || '', adres || '', telefon || '', vergi_no || '',
    firma_type_id || null, fatura_listesi ?? 1, otomat_gelir_listesi ?? 1, kota_var ?? 0,
    ucret_degisiklik_tarihi || null
  );

  const firm = db.prepare(`
    SELECT f.*, fg.name as group_name, ft.name as type_name
    FROM firms f
    LEFT JOIN firma_groups fg ON f.firma_group_id = fg.id
    LEFT JOIN firma_types ft ON f.firma_type_id = ft.id
    WHERE f.id = ?
  `).get(result.lastInsertRowid);

  res.json(firm);
});

// Firma güncelle
router.put('/:id', (req, res) => {
  const { firma_group_id, firma_adi, unvan, adres, telefon, vergi_no, firma_type_id, fatura_listesi, otomat_gelir_listesi, kota_var, ucret_degisiklik_tarihi } = req.body;

  db.prepare(`
    UPDATE firms SET firma_group_id = ?, firma_adi = ?, unvan = ?, adres = ?, telefon = ?, vergi_no = ?,
    firma_type_id = ?, fatura_listesi = ?, otomat_gelir_listesi = ?, kota_var = ?, ucret_degisiklik_tarihi = ?
    WHERE id = ?
  `).run(
    firma_group_id || null, firma_adi, unvan || '', adres || '', telefon || '', vergi_no || '',
    firma_type_id || null, fatura_listesi ?? 1, otomat_gelir_listesi ?? 1, kota_var ?? 0,
    ucret_degisiklik_tarihi || null, req.params.id
  );

  const firm = db.prepare(`
    SELECT f.*, fg.name as group_name, ft.name as type_name
    FROM firms f
    LEFT JOIN firma_groups fg ON f.firma_group_id = fg.id
    LEFT JOIN firma_types ft ON f.firma_type_id = ft.id
    WHERE f.id = ?
  `).get(req.params.id);

  res.json(firm);
});

// Firma sil
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM firms WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
