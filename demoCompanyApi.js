const express = require("express");
const crypto = require("crypto");
const customers = require("./customers.json");

const router = express.Router();

/*
=====================================
AMBIL API KEY PERUSAHAAN
=====================================
*/

function getCompanyApiKey(companyId) {
  const keys = {
    ABC001:
      process.env.ABC001_API_KEY,

    XYZ001:
      process.env.XYZ001_API_KEY,

    PZ001:
      process.env.PLAYZONE_API_KEY
  };

  return keys[companyId] || null;
}


/*
=====================================
AUTHENTICATION
=====================================
*/

function authenticateCompany(
  req,
  res,
  next
) {
  const companyId =
    String(
      req.headers["x-company-id"] || ""
    )
      .trim()
      .toUpperCase();

  const providedKey =
    String(
      req.headers["x-ai-cs-key"] || ""
    );

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message:
        "Company ID diperlukan."
    });
  }

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      message:
        "Authorization diperlukan."
    });
  }

  const expectedKey =
    getCompanyApiKey(companyId);

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      message:
        "Environment API key perusahaan belum dikonfigurasi."
    });
  }

  const providedBuffer =
    Buffer.from(providedKey);

  const expectedBuffer =
    Buffer.from(
      String(expectedKey)
    );

  const isValid =
    providedBuffer.length ===
      expectedBuffer.length &&
    crypto.timingSafeEqual(
      providedBuffer,
      expectedBuffer
    );

  if (!isValid) {
    return res.status(401).json({
      success: false,
      message:
        "Unauthorized."
    });
  }

  req.companyId =
    companyId;

  next();
}


/*
=====================================
GET CUSTOMER
=====================================
*/

router.get(
  "/customer/:customerId",
  authenticateCompany,
  function (req, res) {
    try {
      const customerId =
        String(
          req.params.customerId || ""
        )
          .trim()
          .toUpperCase();

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message:
            "Customer ID diperlukan."
        });
      }

      const customer =
        customers[customerId];

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer tidak ditemukan."
        });
      }


      /*
      =====================================
      PASTIKAN CUSTOMER MILIK PERUSAHAAN
      =====================================
      */

      const customerCompanyId =
        String(
          customer.company_id || ""
        )
          .trim()
          .toUpperCase();

      if (
        customerCompanyId !==
        req.companyId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Customer tidak terdaftar pada perusahaan ini."
        });
      }


      /*
      =====================================
      RESPONSE CUSTOMER
      =====================================
      */

      return res.json({
        success: true,

        customer: {
          id:
            customerId,

          name:
            customer.name ||
            null,

          company_id:
            customerCompanyId,

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
