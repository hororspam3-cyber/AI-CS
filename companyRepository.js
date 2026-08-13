const { pool } = require("./database");

/*
=====================================
GET COMPANY
=====================================
*/

async function getCompany(companyId) {
  const id = String(companyId || "")
    .trim()
    .toUpperCase();

  if (!id) {
    return null;
  }

  const result = await pool.query(
    `
    SELECT
      id,
      name,
      api_url,
      api_key_env,
      integration_type,
      api_enabled
    FROM companies
    WHERE id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/*
=====================================
SAVE / UPDATE COMPANY
=====================================
*/

async function saveCompany(company) {
  const id = String(company.id || "")
    .trim()
    .toUpperCase();

  const name = String(company.name || "")
    .trim();

  const apiUrl =
    company.api_url || null;

  const apiKeyEnv =
    company.api_key_env || null;

  const integrationType =
    company.integration_type || "demo";

  const apiEnabled =
    company.api_enabled === true;

  if (!id) {
    throw new Error(
      "Company ID diperlukan."
    );
  }

  if (!name) {
    throw new Error(
      "Nama perusahaan diperlukan."
    );
  }

  const result = await pool.query(
    `
    INSERT INTO companies (
      id,
      name,
      api_url,
      api_key_env,
      integration_type,
      api_enabled
    )
    VALUES ($1, $2, $3, $4, $5, $6)

    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      api_url = EXCLUDED.api_url,
      api_key_env = EXCLUDED.api_key_env,
      integration_type = EXCLUDED.integration_type,
      api_enabled = EXCLUDED.api_enabled

    RETURNING
      id,
      name,
      api_url,
      api_key_env,
      integration_type,
      api_enabled
    `,
    [
      id,
      name,
      apiUrl,
      apiKeyEnv,
      integrationType,
      apiEnabled
    ]
  );

  return result.rows[0];
}

module.exports = {
  getCompany,
  saveCompany
};
