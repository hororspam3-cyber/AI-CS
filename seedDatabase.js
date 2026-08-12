const { pool } = require("./database");
const customers = require("./customers.json");
const clients = require("./clients.json");

async function seedDatabase() {
  try {
    // =========================
    // SEED COMPANIES
    // =========================

    for (const [id, company] of Object.entries(clients)) {
      await pool.query(
        `
        INSERT INTO companies (
          id,
          name
        )
        VALUES ($1, $2)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name
        `,
        [
          id,
          company.company_name || "Perusahaan"
        ]
      );
    }

    console.log(
      "Semua perusahaan berhasil dimasukkan ke PostgreSQL."
    );

    // =========================
    // SEED CUSTOMERS
    // =========================

    for (const [id, customer] of Object.entries(customers)) {
      await pool.query(
        `
        INSERT INTO customers (
          id,
          company_id,
          name,
          account_status,
          account_detail,
          verification,
          balance,
          deposit,
          withdrawal,
          bonus,
          transaction_data
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
        ON CONFLICT (id)
        DO UPDATE SET
          company_id = EXCLUDED.company_id,
          name = EXCLUDED.name,
          account_status = EXCLUDED.account_status,
          account_detail = EXCLUDED.account_detail,
          verification = EXCLUDED.verification,
          balance = EXCLUDED.balance,
          deposit = EXCLUDED.deposit,
          withdrawal = EXCLUDED.withdrawal,
          bonus = EXCLUDED.bonus,
          transaction_data = EXCLUDED.transaction_data
        `,
        [
          id,
          customer.company_id,
          customer.name,
          customer.account_status || null,
          customer.account_detail || null,
          customer.verification || null,
          customer.balance || 0,
          customer.deposit || null,
          customer.withdrawal || null,
          customer.bonus || null,
          customer.transaction || null
        ]
      );
    }

    console.log(
      "Semua customer berhasil dimasukkan ke PostgreSQL."
    );

  } catch (error) {
    console.error(
      "Gagal melakukan seed:",
      error.message
    );
  } finally {
    await pool.end();
  }
}

seedDatabase();
