CREATE TABLE restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  recommendation TEXT NOT NULL DEFAULT '',
  categories TEXT NOT NULL DEFAULT '[]',
  region TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL
);

CREATE INDEX idx_restaurants_region ON restaurants(region);
CREATE INDEX idx_restaurants_coords ON restaurants(lat, lng);
