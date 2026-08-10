const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());

let customers = {};

try {
  customers = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "customers.json"),
      "utf8"
    )
  );
} catch (error) {
  console.error("customers.json tidak ditemukan");
}

// ===============================
// API CUSTOMER
// ===============================

app.get("/api/customer/:customerId", (req, res) => {

  const customerId =
    req.params.customerId.toUpperCase();

  const customer =
    customers[customerId];

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer tidak ditemukan"
    });
  }

  res.json({
    success: true,
    company: "ABC Company",
    customerId: customerId,
    customer: customer
  });

});

// ===============================
// SERVER
// ===============================

const PORT =
  process.env.API_PORT || 4000;

app.listen(PORT, () => {

  console.log(
    `ABC Company API berjalan di port ${PORT}`
  );

});
