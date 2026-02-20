CREATE TABLE address_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_name TEXT NOT NULL,
  restaurant_address TEXT NOT NULL,
  suggested_address TEXT NOT NULL,
  comment TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'pending'
);
