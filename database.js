const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on("error", (err) => {
  console.error("PostgreSQL error:", err);
});

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_url TEXT,
        api_key_env TEXT,
        integration_type TEXT DEFAULT 'demo',
        api_enabled BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        account_status TEXT,
        account_detail TEXT,
        verification TEXT,
        balance NUMERIC DEFAULT 0,
        deposit JSONB,
        withdrawal JSONB,
        bonus JSONB,
        transaction_data JSONB
      );
    `);

    console.log(
      "PostgreSQL: tabel berhasil dibuat."
    );
  } catch (error) {
    console.error(
      "PostgreSQL: gagal membuat tabel:",
      error.message
    );
  }
}

module.exports = {
  pool,
  initDatabase
};
