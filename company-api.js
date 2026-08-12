const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

app.use(express.json());

/*
 * =====================================
 * LOAD CUSTOMER DATA
 * =====================================
 */

let customers = {};

try {
  customers = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "customers.json"),
      "utf8"
    )
  );
} catch (error) {
  console.error(
    "customers.json tidak ditemukan."
  );
}

/*
 * =====================================
 * API KEY
 * =====================================
 *
 * API key perusahaan disimpan di
 * environment variable.
 */

function getCompanyApiKey() {
  return process.env.ABC001_API_KEY || null;
}

/*
 * =====================================
 * AUTHENTICATION
 * =====================================
 */

function authenticateCompany(
  req,
  res,
  next
) {
  const providedKey =
    req.headers["x-ai-cs-key"];

  const expectedKey =
    getCompanyApiKey();

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      message:
        "API key diperlukan."
    });
  }

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      message:
        "API key perusahaan belum dikonfigurasi."
    });
  }

  const providedBuffer =
    Buffer.from(
      String(providedKey)
    );

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

  next();
}

/*
 * =====================================
 * GET CUSTOMER
 * =====================================
 *
 * Standar API perusahaan:
 *
 * GET /api/ai-cs/customer/:customerId
 */

app.get(
  "/api/ai-cs/customer/:customerId",
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
       * Pastikan customer memang
       * milik ABC Company.
       */

      if (
        customer.company_id &&
        customer.company_id !==
          "ABC001"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Customer tidak terdaftar pada perusahaan ini."
        });
      }

      /*
       * Format response standar
       * untuk AI-CS.
       */

      return res.json({
        success: true,

        customer: {
          id: customerId,

          name:
            customer.name ||
            null,

          company_id:
            customer.company_id ||
            "ABC001",

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
        "ABC COMPANY API ERROR:",
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

/*
 * =====================================
 * HEALTH CHECK
 * =====================================
 */

app.get(
  "/api/ai-cs/health",
  function (req, res) {
    return res.json({
      success: true,
      companyId: "ABC001",
      companyName:
        "ABC Company",
      status: "online"
    });
  }
);

/*
 * =====================================
 * SERVER
 * =====================================
 */

const PORT =
  process.env.API_PORT || 4000;

app.listen(
  PORT,
  function () {
    console.log(
      "ABC Company API berjalan pada port " +
        PORT
    );
  }
);
