import bcrypt from 'bcryptjs';
import db from './index';
import { initializeDatabase } from './schema';

function seed() {
  console.log('Veritabanı seed başlıyor...');

  initializeDatabase();

  // Mevcut veriyi temizle
  db.exec(`
    DELETE FROM machine_count_items;
    DELETE FROM machine_counts;
    DELETE FROM loading_items;
    DELETE FROM loadings;
    DELETE FROM transfer_items;
    DELETE FROM transfers;
    DELETE FROM warehouse_transactions;
    DELETE FROM warehouse_stock;
    DELETE FROM product_maps;
    DELETE FROM routes;
    DELETE FROM machines;
    DELETE FROM products;
    DELETE FROM warehouses;
    DELETE FROM users;
  `);

  // Kullanıcılar
  const passwordHash = bcrypt.hashSync('123456', 10);

  const insertUser = db.prepare('INSERT INTO users (username, full_name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('admin', 'Sistem Yöneticisi', passwordHash, 'admin', '0532 000 0001');
  insertUser.run('depo1', 'Ahmet Yılmaz', passwordHash, 'warehouse_manager', '0532 000 0002');
  insertUser.run('saha1', 'Mehmet Demir', passwordHash, 'field_worker', '0532 000 0003');
  insertUser.run('saha2', 'Ali Kaya', passwordHash, 'field_worker', '0532 000 0004');
  insertUser.run('saha3', 'Hasan Çelik', passwordHash, 'field_worker', '0532 000 0005');

  // Depolar
  const insertWarehouse = db.prepare('INSERT INTO warehouses (name, type, address, manager_id) VALUES (?, ?, ?, ?)');
  insertWarehouse.run('Merkez Depo', 'central', 'İstanbul, Esenyurt', 2);
  insertWarehouse.run('Kadıköy Saha Deposu', 'field', 'İstanbul, Kadıköy', null);
  insertWarehouse.run('Beşiktaş Saha Deposu', 'field', 'İstanbul, Beşiktaş', null);

  // Ürünler
  const insertProduct = db.prepare('INSERT INTO products (name, barcode, category, cost_price, sale_price) VALUES (?, ?, ?, ?, ?)');
  const products = [
    ['Coca Cola 330ml', '8690548000017', 'İçecek', 8.50, 15.00],
    ['Fanta 330ml', '8690548000024', 'İçecek', 8.00, 14.00],
    ['Sprite 330ml', '8690548000031', 'İçecek', 8.00, 14.00],
    ['Ayran 200ml', '8690548000048', 'İçecek', 4.00, 8.00],
    ['Su 500ml', '8690548000055', 'İçecek', 2.00, 5.00],
    ['Çay Bardak', '8690548000062', 'Sıcak İçecek', 3.00, 7.00],
    ['Türk Kahvesi', '8690548000079', 'Sıcak İçecek', 5.00, 12.00],
    ['Nescafe 3in1', '8690548000086', 'Sıcak İçecek', 4.50, 10.00],
    ['Eti Puf', '8690548000093', 'Atıştırmalık', 5.00, 10.00],
    ['Ülker Çikolatalı Gofret', '8690548000109', 'Atıştırmalık', 4.00, 8.00],
    ['Eti Canga', '8690548000116', 'Atıştırmalık', 6.00, 12.00],
    ['Doritos', '8690548000123', 'Atıştırmalık', 7.00, 14.00],
    ['Ruffles', '8690548000130', 'Atıştırmalık', 7.00, 14.00],
    ['Ülker Dido', '8690548000147', 'Atıştırmalık', 5.50, 11.00],
    ['Snickers', '8690548000154', 'Atıştırmalık', 8.00, 15.00],
    ['Twix', '8690548000161', 'Atıştırmalık', 8.00, 15.00],
    ['Milka Çikolata', '8690548000178', 'Atıştırmalık', 10.00, 18.00],
    ['Lay\'s Klasik', '8690548000185', 'Atıştırmalık', 7.00, 14.00],
    ['Ülker İkram', '8690548000192', 'Atıştırmalık', 4.50, 9.00],
    ['Saklıköy', '8690548000208', 'Atıştırmalık', 5.00, 10.00],
  ];

  for (const p of products) {
    insertProduct.run(...p);
  }

  // Makinalar
  const insertMachine = db.prepare(
    'INSERT INTO machines (machine_no, name, location_description, warehouse_id, spiral_rows, spiral_cols) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const machineLocations = [
    ['M001', 'Kadıköy AVM - 1. Kat', 'Kadıköy AVM Ana Giriş', 2, 8, 10],
    ['M002', 'Kadıköy AVM - 2. Kat', 'Kadıköy AVM Yemek Katı', 2, 6, 8],
    ['M003', 'Beşiktaş Metro', 'Beşiktaş Metro İstasyonu', 3, 8, 10],
    ['M004', 'Levent Plaza', 'Levent İş Merkezi Lobi', 3, 10, 8],
    ['M005', 'Ataşehir Hastane', 'Ataşehir Devlet Hastanesi', 2, 6, 10],
    ['M006', 'Taksim Meydan', 'Taksim Meydanı Altgeçit', 3, 8, 8],
    ['M007', 'Mecidiyeköy Metro', 'Mecidiyeköy Metro İstasyonu', 3, 8, 10],
    ['M008', 'Üsküdar İskele', 'Üsküdar İskele Binası', 2, 6, 8],
    ['M009', 'Bakırköy AVM', 'Bakırköy Alışveriş Merkezi', 2, 10, 10],
    ['M010', 'Maltepe Üniversite', 'Maltepe Üniversitesi Kantin', 2, 8, 8],
  ];

  for (const m of machineLocations) {
    insertMachine.run(...m);
  }

  // Ürün haritaları (ilk 3 makina için örnek)
  const insertMap = db.prepare(
    'INSERT INTO product_maps (machine_id, spiral_number, product_id, capacity, updated_by) VALUES (?, ?, ?, ?, ?)'
  );

  // M001 makinesine ürün haritası (8x10 = 80 spiral)
  for (let i = 1; i <= 80; i++) {
    const productId = ((i - 1) % 20) + 1; // 20 ürünü döngüsel ata
    insertMap.run(1, i, productId, 10, 1);
  }

  // M002 makinesine ürün haritası (6x8 = 48 spiral)
  for (let i = 1; i <= 48; i++) {
    const productId = ((i - 1) % 15) + 1;
    insertMap.run(2, i, productId, 8, 1);
  }

  // M003 makinesine ürün haritası (8x10 = 80 spiral)
  for (let i = 1; i <= 80; i++) {
    const productId = ((i - 1) % 20) + 1;
    insertMap.run(3, i, productId, 10, 1);
  }

  // Depo stokları
  const insertStock = db.prepare('INSERT INTO warehouse_stock (warehouse_id, product_id, quantity) VALUES (?, ?, ?)');

  // Merkez depo - her üründen bol
  for (let i = 1; i <= 20; i++) {
    insertStock.run(1, i, 500 + Math.floor(Math.random() * 500));
  }

  // Kadıköy saha deposu
  for (let i = 1; i <= 20; i++) {
    insertStock.run(2, i, 50 + Math.floor(Math.random() * 100));
  }

  // Beşiktaş saha deposu
  for (let i = 1; i <= 20; i++) {
    insertStock.run(3, i, 40 + Math.floor(Math.random() * 80));
  }

  // Örnek rotalar
  const insertRoute = db.prepare('INSERT INTO routes (user_id, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)');
  insertRoute.run(3, '2026-02-25', '08:30', '17:00', 'completed');
  insertRoute.run(4, '2026-02-25', '09:00', '16:30', 'completed');
  insertRoute.run(3, '2026-02-26', '08:45', null, 'active');

  // Örnek yüklemeler
  const insertLoading = db.prepare(
    'INSERT INTO loadings (machine_id, user_id, route_id, loading_date, loading_time, notes) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertLoadingItem = db.prepare(
    'INSERT INTO loading_items (loading_id, product_id, spiral_number, quantity) VALUES (?, ?, ?, ?)'
  );

  // Dün yapılan yüklemeler
  const l1 = insertLoading.run(1, 3, 1, '2026-02-25', '09:30', 'Rutin dolum');
  for (let i = 1; i <= 10; i++) {
    insertLoadingItem.run(l1.lastInsertRowid, ((i - 1) % 20) + 1, i, Math.floor(Math.random() * 5) + 3);
  }

  const l2 = insertLoading.run(2, 3, 1, '2026-02-25', '11:00', 'Rutin dolum');
  for (let i = 1; i <= 8; i++) {
    insertLoadingItem.run(l2.lastInsertRowid, ((i - 1) % 15) + 1, i, Math.floor(Math.random() * 5) + 2);
  }

  const l3 = insertLoading.run(3, 4, 2, '2026-02-25', '10:00', null);
  for (let i = 1; i <= 10; i++) {
    insertLoadingItem.run(l3.lastInsertRowid, ((i - 1) % 20) + 1, i, Math.floor(Math.random() * 5) + 3);
  }

  // Örnek sayımlar
  const insertCount = db.prepare(
    'INSERT INTO machine_counts (machine_id, user_id, count_date, count_time, notes) VALUES (?, ?, ?, ?, ?)'
  );
  const insertCountItem = db.prepare(
    'INSERT INTO machine_count_items (count_id, spiral_number, product_id, quantity) VALUES (?, ?, ?, ?)'
  );

  // M001 önceki sayım (3 gün önce)
  const c1 = insertCount.run(1, 3, '2026-02-22', '10:00', 'Haftalık sayım');
  for (let i = 1; i <= 80; i++) {
    const productId = ((i - 1) % 20) + 1;
    insertCountItem.run(c1.lastInsertRowid, i, productId, Math.floor(Math.random() * 8) + 2);
  }

  // M001 yeni sayım (bugün)
  const c2 = insertCount.run(1, 3, '2026-02-25', '14:00', 'Haftalık sayım');
  for (let i = 1; i <= 80; i++) {
    const productId = ((i - 1) % 20) + 1;
    insertCountItem.run(c2.lastInsertRowid, i, productId, Math.floor(Math.random() * 5) + 1);
  }

  // Örnek transfer
  const insertTransfer = db.prepare(
    'INSERT INTO transfers (from_warehouse_id, to_warehouse_id, status, requested_by, approved_by, notes, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertTransferItem = db.prepare('INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)');

  // Tamamlanmış transfer
  const t1 = insertTransfer.run(1, 2, 'completed', 2, 1, 'Haftalık tedarik', datetime());
  for (let i = 1; i <= 10; i++) {
    insertTransferItem.run(t1.lastInsertRowid, i, 50);
  }

  // Bekleyen transfer
  const t2 = insertTransfer.run(1, 3, 'pending', 2, null, 'Acil tedarik talebi', null);
  for (let i = 5; i <= 15; i++) {
    insertTransferItem.run(t2.lastInsertRowid, i, 30);
  }

  console.log('Seed tamamlandı!');
  console.log('Giriş bilgileri:');
  console.log('  Admin:    admin / 123456');
  console.log('  Depo:     depo1 / 123456');
  console.log('  Saha 1:   saha1 / 123456');
  console.log('  Saha 2:   saha2 / 123456');
  console.log('  Saha 3:   saha3 / 123456');
}

function datetime() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

seed();
