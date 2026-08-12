const express = require("express");
const customers = require("./customers.json");

const router = express.Router();

/*
 * ==============================
 * GET CUSTOMER
 * ==============================
 */

router.get(
  "/customer/:customerId",
  function (req, res) {
    try {
      const customerId =
        String(
          req.params.customerId || ""
        )
          .trim()
          .toUpperCase();

      const customer =
        customers[customerId];

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer tidak ditemukan."
        });
      }

      return res.json({
  success: true,

  customer: {
    id: customerId,

    name:
      customer.name || null,

    company_id:
      customer.company_id || null,

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
  }
});

    } catch (error) {
      console.error(
        "DEMO COMPANY API ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal mengambil data customer."
      });
    }
  }
);

module.exports = router;
