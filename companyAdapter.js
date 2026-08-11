const customers = require("./customers.json");
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

  const customer =
    customers[customerId];

  if (!customer) {
    throw new Error(
      "Customer tidak ditemukan."
    );
  }

  if (
    customer.company_id &&
    customer.company_id !== companyId
  ) {
    throw new Error(
      "Customer tidak terdaftar pada perusahaan ini."
    );
  }

  /*
   * MODE DEMO
   *
   * Nanti bagian ini diganti
   * dengan request ke API perusahaan.
   */

  return {
    customerId: customerId,
    companyId: companyId,

    name:
      customer.name || null,

    account_status:
      customer.account_status || null,

    account_detail:
      customer.account_detail || null,

    verification:
      customer.verification || null,

    balance:
      customer.balance ?? null,

    deposit:
      customer.deposit || null,

    withdrawal:
      customer.withdrawal || null,

    bonus:
      customer.bonus || null,

    transaction:
      customer.transaction || null
  };
}

module.exports = {
  getCustomerFromCompany
};
