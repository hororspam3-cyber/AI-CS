const {
  getCompany
} = require("./companyRepository");

/*
=====================================
GET CUSTOMER FROM COMPANY API
=====================================
*/

async function getCustomerFromCompany(
  companyId,
  customerId
) {
  companyId = String(companyId || "")
    .trim()
    .toUpperCase();

  customerId = String(customerId || "")
    .trim()
    .toUpperCase();

  if (!companyId) {
    throw new Error(
      "Company ID diperlukan."
    );
  }

  if (!customerId) {
    throw new Error(
      "Customer ID diperlukan."
    );
  }

  /*
  =====================================
  AMBIL KONFIGURASI PERUSAHAAN
  =====================================
  */

  const company =
    await getCompany(companyId);

  if (!company) {
    throw new Error(
      "Perusahaan tidak ditemukan di database."
    );
  }

  /*
  =====================================
  DEMO MODE
  =====================================
  */

  if (
    company.integration_type === "demo" ||
    company.api_enabled !== true
  ) {
    const apiUrl =
      "https://ai-cs-pt47.onrender.com/api/demo-company/customer/" +
      encodeURIComponent(customerId);

    const apiKeyEnv =
      company.api_key_env;

    if (!apiKeyEnv) {
      throw new Error(
        "Environment API key perusahaan belum dikonfigurasi."
      );
    }

    const apiKey =
      process.env[apiKeyEnv];

    if (!apiKey) {
      throw new Error(
        "API key perusahaan belum tersedia."
      );
    }

    const response =
      await fetch(apiUrl, {
        method: "GET",

        headers: {
          "Content-Type":
            "application/json",

          "x-company-id":
            companyId,

          "x-ai-cs-key":
            apiKey
        }
      });

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Gagal mengambil data customer dari API demo."
      );
    }

    if (
      !data.success ||
      !data.customer
    ) {
      throw new Error(
        "Format data API perusahaan tidak valid."
      );
    }

    if (
      data.customer.company_id &&
      String(
        data.customer.company_id
      ).toUpperCase() !== companyId
    ) {
      throw new Error(
        "Customer tidak terdaftar pada perusahaan ini."
      );
    }

    return normalizeCustomer(
      data.customer,
      customerId
    );
  }

  /*
  =====================================
  PRODUCTION MODE
  =====================================
  */

  if (
    company.integration_type ===
      "production" &&
    company.api_enabled === true
  ) {
    const apiUrl =
      company.api_url;

    if (!apiUrl) {
      throw new Error(
        "API URL perusahaan belum dikonfigurasi."
      );
    }

    const apiKeyEnv =
      company.api_key_env;

    if (!apiKeyEnv) {
      throw new Error(
        "Environment API key perusahaan belum dikonfigurasi."
      );
    }

    const apiKey =
      process.env[apiKeyEnv];

    if (!apiKey) {
      throw new Error(
        "API key perusahaan belum tersedia."
      );
    }

    /*
    =====================================
    PANGGIL API PERUSAHAAN
    =====================================
    */

    const response =
      await fetch(apiUrl, {
        method: "GET",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            "Bearer " + apiKey,

          "X-Customer-ID":
            customerId
        }
      });

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Gagal mengambil data dari API perusahaan."
      );
    }

    if (
      !data.success ||
      !data.customer
    ) {
      throw new Error(
        "Format API perusahaan tidak valid."
      );
    }

    /*
    =====================================
    PASTIKAN CUSTOMER SESUAI
    =====================================
    */

    if (
      data.customer.id &&
      String(
        data.customer.id
      ).toUpperCase() !== customerId
    ) {
      throw new Error(
        "API perusahaan mengembalikan customer yang tidak sesuai."
      );
    }

    return normalizeCustomer(
      data.customer,
      customerId
    );
  }

  throw new Error(
    "Konfigurasi integration perusahaan tidak valid."
  );
}


/*
=====================================
NORMALIZE CUSTOMER
=====================================
*/

function normalizeCustomer(
  customer,
  customerId
) {
  return {
    id:
      customer.id ||
      customerId,

    name:
      customer.name ||
      null,

    company_id:
      customer.company_id ||
      null,

    account_status:
      customer.account_status ||
      null,

    account_detail:
      customer.account_detail ||
      null,

    verification:
      customer.verification ||
      null,

    balance:
      customer.balance ??
      null,

    deposit:
      customer.deposit ||
      null,

    withdrawal:
      customer.withdrawal ||
      null,

    bonus:
      customer.bonus ||
      null,

    transaction:
      customer.transaction ||
      null
  };
}


module.exports = {
  getCustomerFromCompany
};
