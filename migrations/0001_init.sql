CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, name TEXT NOT NULL, product_id TEXT, route TEXT, country TEXT, device TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS events_time ON events(created_at);
CREATE INDEX IF NOT EXISTS events_session ON events(session_id,name);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, session_id TEXT, lines TEXT NOT NULL, total REAL NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS orders_time ON orders(created_at);
