const clients = require("./clients.json");

async function getCustomerFromCompany(
  companyId,
  customerId
) {
  const company =
    clients[companyId];

  if (!company) {
    throw new Error(
      "Perusahaan tidak ditemukan."
    );
  }

  /*
   * ==============================
   * DEMO COMPANY API
   * ==============================
   *
   * Untuk sekarang menggunakan
   * API simulator.
   *
   * Nanti URL ini diganti dengan
   * API perusahaan sungguhan.
   */

  const apiUrl =
    "https://ai-cs-pt47.onrender.com/api/demo-company/customer/" +
    encodeURIComponent(customerId);

  /*
   * Gunakan API key perusahaan.
   */

  let apiKey = null;

  if (companyId === "ABC001") {
    apiKey =
      process.env.ABC001_API_KEY;
  }

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

        "x-ai-cs-key":
          apiKey
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
      "Format data API perusahaan tidak valid."
    );
  }

  /*
   * Pastikan customer memang
   * berasal dari perusahaan
   * yang sedang digunakan.
   */

  if (
    data.customer.company_id &&
    data.customer.company_id !==
      companyId
  ) {
    throw new Error(
      "Customer tidak terdaftar pada perusahaan ini."
    );
  }

  return {
    id:
      data.customer.id,

    name:
      data.customer.name ||
      null,

    account_status:
      data.customer.account_status ||
      null,

    account_detail:
      data.customer.account_detail ||
      null,

    verification:
      data.customer.verification ||
      null,

    balance:
      data.customer.balance ??
      null,

    deposit:
      data.customer.deposit ||
      null,

    withdrawal:
      data.customer.withdrawal ||
      null,

    bonus:
      data.customer.bonus ||
      null,

    transaction:
      data.customer.transaction ||
      null
  };
}

module.exports = {
  getCustomerFromCompany
};
