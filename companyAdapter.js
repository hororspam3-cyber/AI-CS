const {
  getCompany
} = require("./companyRepository");

/*
=====================================
GET CUSTOMER FROM COMPANY
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
  AMBIL DATA PERUSAHAAN DARI DATABASE
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
  DEMO COMPANY
  =====================================
  */

  if (
    company.integration_type === "demo"
  ) {
    const apiKeyEnv =
      String(
        company.api_key_env || ""
      ).trim();

    if (!apiKeyEnv) {
      throw new Error(
        "API key perusahaan belum dikonfigurasi."
      );
    }

    const apiKey =
      process.env[apiKeyEnv];

    if (!apiKey) {
      throw new Error(
        "API key perusahaan belum tersedia: " +
        apiKeyEnv
      );
    }

    /*
     * Gunakan endpoint Demo API
     * yang sudah ada di server AI-CS.
     */

    const apiUrl =
      "https://ai-cs-pt47.onrender.com" +
      "/api/demo-company/customer/" +
      encodeURIComponent(customerId);

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

    const text =
      await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(
        "API Demo mengembalikan response yang bukan JSON."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Gagal mengambil data customer dari API Demo."
      );
    }

    if (
      !data.success ||
      !data.customer
    ) {
      throw new Error(
        "Format data customer dari API Demo tidak valid."
      );
    }

    /*
     * Pastikan customer memang
     * milik perusahaan yang diminta.
     */

    const returnedCustomer =
      data.customer;

    const returnedCompanyId =
      String(
        returnedCustomer.company_id ||
        returnedCustomer.companyId ||
        ""
      )
        .trim()
        .toUpperCase();

    if (
      returnedCompanyId &&
      returnedCompanyId !== companyId
    ) {
      throw new Error(
        "Customer bukan milik perusahaan ini."
      );
    }

    const returnedCustomerId =
      String(
        returnedCustomer.id ||
        returnedCustomer.customerId ||
        ""
      )
        .trim()
        .toUpperCase();

    if (
      returnedCustomerId &&
      returnedCustomerId !== customerId
    ) {
      throw new Error(
        "API perusahaan mengembalikan customer yang tidak sesuai."
      );
    }

    return normalizeCustomer(
      returnedCustomer,
      customerId,
      companyId
    );
  }

  /*
  =====================================
  PRODUCTION COMPANY
  =====================================
  */

  if (
    company.integration_type ===
      "production" &&
    company.api_enabled === true
  ) {
    let apiUrl =
      String(
        company.api_url || ""
      ).trim();

    if (!apiUrl) {
      throw new Error(
        "API URL perusahaan belum dikonfigurasi."
      );
    }

    apiUrl =
      apiUrl.replace(
        "{customerId}",
        encodeURIComponent(customerId)
      );

    const apiKeyEnv =
      String(
        company.api_key_env || ""
      ).trim();

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

          "Authorization":
            "Bearer " + apiKey,

          "X-Customer-ID":
            customerId
        }
      });

    const text =
      await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(
        "API perusahaan mengembalikan response yang bukan JSON."
      );
    }

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

    const returnedCustomer =
      data.customer;

    const returnedId =
      String(
        returnedCustomer.id ||
        returnedCustomer.customerId ||
        customerId
      )
        .trim()
        .toUpperCase();

    if (
      returnedId !== customerId
    ) {
      throw new Error(
        "API perusahaan mengembalikan customer yang tidak sesuai."
      );
    }

    return normalizeCustomer(
      returnedCustomer,
      customerId,
      companyId
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
  customerId,
  companyId
) {
  return {
    id:
      customer.id ||
      customer.customerId ||
      customerId,

    name:
      customer.name ||
      null,

    company_id:
      customer.company_id ||
      customer.companyId ||
      companyId,

    account_status:
      customer.account_status ||
      customer.status ||
      null,

    account_detail:
      customer.account_detail ||
      customer.membership ||
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
      customer.withdrawalStatus ||
      null,

    bonus:
      customer.bonus ??
      null,

    transaction:
      customer.transaction ||
      customer.transactions ||
      null
  };
}


module.exports = {
  getCustomerFromCompany
};
