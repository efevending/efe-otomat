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
      type TEXT NOT NULL CHECK(type IN ('central', 'field')),
      address TEXT,
      manager_id INTEGER REFERENCES users(id),
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

  console.log('Veritabanı tabloları oluşturuldu.');

  // Auto-seed: Create default admin if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare('INSERT INTO users (username, full_name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)').run('admin', 'Yönetici', hash, 'admin', '');
    console.log('Varsayılan admin kullanıcı oluşturuldu (admin / 123456)');
  }
}
