import db from './index';
import bcrypt from 'bcryptjs';

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'warehouse_manager', 'field_worker')),
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('sanal', 'sabit', 'tedarikci')),
      address TEXT,
      manager_id INTEGER REFERENCES users(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_no TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      location_description TEXT,
      latitude REAL,
      longitude REAL,
      warehouse_id INTEGER REFERENCES warehouses(id),
      spiral_rows INTEGER NOT NULL DEFAULT 8,
      spiral_cols INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT,
      category TEXT,
      cost_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS product_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      spiral_number INTEGER NOT NULL,
      product_id INTEGER REFERENCES products(id),
      capacity INTEGER NOT NULL DEFAULT 10,
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(machine_id, spiral_number)
    );

    CREATE TABLE IF NOT EXISTS warehouse_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(warehouse_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS warehouse_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('in', 'out')),
      reference_type TEXT CHECK(reference_type IN ('purchase', 'transfer', 'loading', 'adjustment')),
      reference_id INTEGER,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      to_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'completed')),
      requested_by INTEGER NOT NULL REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      approved_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS loadings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL REFERENCES machines(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      route_id INTEGER REFERENCES routes(id),
      loading_date TEXT NOT NULL,
      loading_time TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS loading_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loading_id INTEGER NOT NULL REFERENCES loadings(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      spiral_number INTEGER NOT NULL,
      quantity INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machine_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL REFERENCES machines(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      count_date TEXT NOT NULL,
      count_time TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS machine_count_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      count_id INTEGER NOT NULL REFERENCES machine_counts(id) ON DELETE CASCADE,
      spiral_number INTEGER NOT NULL,
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 0
    );

    -- Firma Grupları
    CREATE TABLE IF NOT EXISTS firma_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Firma Çeşitleri
    CREATE TABLE IF NOT EXISTS firma_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Firmalar
    CREATE TABLE IF NOT EXISTS firms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firma_group_id INTEGER REFERENCES firma_groups(id) ON DELETE SET NULL,
      firma_adi TEXT NOT NULL,
      unvan TEXT,
      adres TEXT,
      telefon TEXT,
      vergi_no TEXT,
      firma_type_id INTEGER REFERENCES firma_types(id) ON DELETE SET NULL,
      fatura_listesi INTEGER NOT NULL DEFAULT 1,
      otomat_gelir_listesi INTEGER NOT NULL DEFAULT 1,
      kota_var INTEGER NOT NULL DEFAULT 0,
      ucret_degisiklik_tarihi TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_firms_group ON firms(firma_group_id);
    CREATE INDEX IF NOT EXISTS idx_firms_type ON firms(firma_type_id);

    -- Otomat Modelleri
    CREATE TABLE IF NOT EXISTS otomat_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    -- Otomat Bölgeleri
    CREATE TABLE IF NOT EXISTS otomat_regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    -- Otomat Tipleri
    CREATE TABLE IF NOT EXISTS otomat_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    -- Ürün Türleri
    CREATE TABLE IF NOT EXISTS product_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    -- Ürün Markaları
    CREATE TABLE IF NOT EXISTS product_brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    -- Ürün Çeşitleri
    CREATE TABLE IF NOT EXISTS product_varieties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    -- İçecek Grupları
    CREATE TABLE IF NOT EXISTS drink_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    -- Otomat Grupları (Bölgeler)
    CREATE TABLE IF NOT EXISTS otomat_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Kullanıcı-Otomat Grubu ilişkisi (çoktan çoğa)
    CREATE TABLE IF NOT EXISTS user_otomat_groups (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otomat_group_id INTEGER NOT NULL REFERENCES otomat_groups(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, otomat_group_id)
    );

    -- Tedarikçiler
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      tax_no TEXT DEFAULT '',
      tax_office TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Fiyat Listeleri (şablonlar)
    CREATE TABLE IF NOT EXISTS price_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Fiyat Listesi Kalemleri
    CREATE TABLE IF NOT EXISTS price_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      price_list_id INTEGER NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sale_price REAL NOT NULL DEFAULT 0,
      UNIQUE(price_list_id, product_id)
    );

    -- Firma Ürün Fiyatları
    CREATE TABLE IF NOT EXISTS firm_product_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firm_id INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sale_price REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(firm_id, product_id)
    );

    -- İndeksler
    CREATE INDEX IF NOT EXISTS idx_machines_warehouse ON machines(warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
    CREATE INDEX IF NOT EXISTS idx_product_maps_machine ON product_maps(machine_id);
    CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_warehouse ON warehouse_transactions(warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
    CREATE INDEX IF NOT EXISTS idx_routes_user ON routes(user_id);
    CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(date);
    CREATE INDEX IF NOT EXISTS idx_loadings_machine ON loadings(machine_id);
    CREATE INDEX IF NOT EXISTS idx_loadings_user ON loadings(user_id);
    CREATE INDEX IF NOT EXISTS idx_loadings_date ON loadings(loading_date);
    CREATE INDEX IF NOT EXISTS idx_machine_counts_machine ON machine_counts(machine_id);
    CREATE INDEX IF NOT EXISTS idx_machine_counts_date ON machine_counts(count_date);
  `);

  // Kullanıcı tablosuna yeni alanlar ekle (mevcut veritabanları için)
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
  const colNames = userColumns.map((c: any) => c.name);
  if (!colNames.includes('surname')) db.exec("ALTER TABLE users ADD COLUMN surname TEXT DEFAULT ''");
  if (!colNames.includes('address')) db.exec("ALTER TABLE users ADD COLUMN address TEXT DEFAULT ''");
  if (!colNames.includes('salary')) db.exec("ALTER TABLE users ADD COLUMN salary REAL DEFAULT 0");
  if (!colNames.includes('agi')) db.exec("ALTER TABLE users ADD COLUMN agi REAL DEFAULT 0");
  if (!colNames.includes('shift_start')) db.exec("ALTER TABLE users ADD COLUMN shift_start TEXT DEFAULT '08:00'");
  if (!colNames.includes('shift_end')) db.exec("ALTER TABLE users ADD COLUMN shift_end TEXT DEFAULT '17:00'");
  if (!colNames.includes('warehouse_id')) db.exec("ALTER TABLE users ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id)");

  // Machines tablosuna yeni alanlar ekle
  const machineColumns = db.prepare("PRAGMA table_info(machines)").all() as any[];
  const machColNames = machineColumns.map((c: any) => c.name);
  if (!machColNames.includes('serial_no')) db.exec("ALTER TABLE machines ADD COLUMN serial_no TEXT DEFAULT ''");
  if (!machColNames.includes('firm_id')) db.exec("ALTER TABLE machines ADD COLUMN firm_id INTEGER REFERENCES firms(id)");
  if (!machColNames.includes('otomat_model_id')) db.exec("ALTER TABLE machines ADD COLUMN otomat_model_id INTEGER REFERENCES otomat_models(id)");
  if (!machColNames.includes('otomat_region_id')) db.exec("ALTER TABLE machines ADD COLUMN otomat_region_id INTEGER REFERENCES otomat_regions(id)");
  if (!machColNames.includes('otomat_type_id')) db.exec("ALTER TABLE machines ADD COLUMN otomat_type_id INTEGER REFERENCES otomat_types(id)");
  if (!machColNames.includes('address')) db.exec("ALTER TABLE machines ADD COLUMN address TEXT DEFAULT ''");
  if (!machColNames.includes('sales_quota')) db.exec("ALTER TABLE machines ADD COLUMN sales_quota REAL DEFAULT 1");
  if (!machColNames.includes('responsible_user_id')) db.exec("ALTER TABLE machines ADD COLUMN responsible_user_id INTEGER REFERENCES users(id)");
  if (!machColNames.includes('is_filling')) db.exec("ALTER TABLE machines ADD COLUMN is_filling INTEGER DEFAULT 1");
  if (!machColNames.includes('credit_card')) db.exec("ALTER TABLE machines ADD COLUMN credit_card INTEGER DEFAULT 0");
  if (!machColNames.includes('cup_capacity_1')) db.exec("ALTER TABLE machines ADD COLUMN cup_capacity_1 INTEGER DEFAULT 0");
  if (!machColNames.includes('cup_capacity_2')) db.exec("ALTER TABLE machines ADD COLUMN cup_capacity_2 INTEGER DEFAULT 0");
  if (!machColNames.includes('drink_group_id')) db.exec("ALTER TABLE machines ADD COLUMN drink_group_id INTEGER REFERENCES drink_groups(id)");
  if (!machColNames.includes('otomat_group_id')) db.exec("ALTER TABLE machines ADD COLUMN otomat_group_id INTEGER REFERENCES otomat_groups(id)");
  if (!machColNames.includes('yandolap_depo')) db.exec("ALTER TABLE machines ADD COLUMN yandolap_depo TEXT DEFAULT ''");
  if (!machColNames.includes('dia_depo')) db.exec("ALTER TABLE machines ADD COLUMN dia_depo TEXT DEFAULT ''");

  // Product maps tablosuna sale_price ekle
  const pmColumns = db.prepare("PRAGMA table_info(product_maps)").all() as any[];
  const pmColNames = pmColumns.map((c: any) => c.name);
  if (!pmColNames.includes('sale_price')) db.exec("ALTER TABLE product_maps ADD COLUMN sale_price REAL DEFAULT 0");

  // Products tablosuna yeni alanlar ekle
  const prodColumns = db.prepare("PRAGMA table_info(products)").all() as any[];
  const prodColNames = prodColumns.map((c: any) => c.name);
  // Firms tablosuna price_list_name ekle
  const firmColumns = db.prepare("PRAGMA table_info(firms)").all() as any[];
  const firmColNames = firmColumns.map((c: any) => c.name);
  if (!firmColNames.includes('price_list_name')) db.exec("ALTER TABLE firms ADD COLUMN price_list_name TEXT DEFAULT ''");

  if (!prodColNames.includes('short_name')) db.exec("ALTER TABLE products ADD COLUMN short_name TEXT DEFAULT ''");
  if (!prodColNames.includes('product_type_id')) db.exec("ALTER TABLE products ADD COLUMN product_type_id INTEGER REFERENCES product_types(id)");
  if (!prodColNames.includes('brand_id')) db.exec("ALTER TABLE products ADD COLUMN brand_id INTEGER REFERENCES product_brands(id)");
  if (!prodColNames.includes('variety_id')) db.exec("ALTER TABLE products ADD COLUMN variety_id INTEGER REFERENCES product_varieties(id)");
  if (!prodColNames.includes('unit_type')) db.exec("ALTER TABLE products ADD COLUMN unit_type TEXT DEFAULT 'GRAM'");
  if (!prodColNames.includes('unit_value')) db.exec("ALTER TABLE products ADD COLUMN unit_value TEXT DEFAULT ''");
  if (!prodColNames.includes('kdv_rate')) db.exec("ALTER TABLE products ADD COLUMN kdv_rate REAL DEFAULT 0");
  if (!prodColNames.includes('default_unit')) db.exec("ALTER TABLE products ADD COLUMN default_unit TEXT DEFAULT ''");
  if (!prodColNames.includes('shelf_life')) db.exec("ALTER TABLE products ADD COLUMN shelf_life TEXT DEFAULT ''");
  if (!prodColNames.includes('box_barcode')) db.exec("ALTER TABLE products ADD COLUMN box_barcode TEXT DEFAULT ''");
  if (!prodColNames.includes('case_barcode')) db.exec("ALTER TABLE products ADD COLUMN case_barcode TEXT DEFAULT ''");
  if (!prodColNames.includes('case_quantity')) db.exec("ALTER TABLE products ADD COLUMN case_quantity INTEGER DEFAULT 1");
  if (!prodColNames.includes('box_quantity')) db.exec("ALTER TABLE products ADD COLUMN box_quantity INTEGER DEFAULT 1");
  if (!prodColNames.includes('stock_no')) db.exec("ALTER TABLE products ADD COLUMN stock_no TEXT DEFAULT ''");
  if (!prodColNames.includes('default_spiral_capacity')) db.exec("ALTER TABLE products ADD COLUMN default_spiral_capacity INTEGER DEFAULT 8");

  // Warehouses tablosuna supplier_id ekle ve type constraint güncelle
  const whColumns = db.prepare("PRAGMA table_info(warehouses)").all() as any[];
  const whColNames = whColumns.map((c: any) => c.name);
  if (!whColNames.includes('supplier_id')) db.exec("ALTER TABLE warehouses ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)");

  // Warehouse type constraint'i güncelle (central→sabit, field→sanal, tedarikci ekle)
  try {
    const whSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='warehouses'").get() as any;
    if (whSchema?.sql?.includes("'central', 'field'")) {
      db.exec("PRAGMA foreign_keys = OFF");
      db.exec(`
        CREATE TABLE warehouses_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('sanal', 'sabit', 'tedarikci')),
          address TEXT,
          manager_id INTEGER REFERENCES users(id),
          supplier_id INTEGER REFERENCES suppliers(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
        INSERT INTO warehouses_new (id, name, type, address, manager_id, created_at)
          SELECT id, name,
            CASE type WHEN 'central' THEN 'sabit' WHEN 'field' THEN 'sanal' ELSE type END,
            address, manager_id, created_at
          FROM warehouses;
        DROP TABLE warehouses;
        ALTER TABLE warehouses_new RENAME TO warehouses;
      `);
      db.exec("PRAGMA foreign_keys = ON");
      console.log('Warehouses tablosu yeni tiplere güncellendi (sanal, sabit, tedarikci)');
    }
  } catch (e) {
    console.log('Warehouse migration atlandı:', e);
  }

  console.log('Veritabanı tabloları oluşturuldu.');

  // Auto-seed: Create default admin if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare('INSERT INTO users (username, full_name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)').run('admin', 'Yönetici', hash, 'admin', '');
    console.log('Varsayılan admin kullanıcı oluşturuldu (admin / 123456)');
  }
}
