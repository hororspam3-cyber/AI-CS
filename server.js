const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));


// ===============================
// KNOWLEDGE BASE
// ===============================

const knowledge = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "knowledge.json"),
    "utf8"
  )
);


// ===============================
// CUSTOMER DATABASE DUMMY
// ===============================

const customers = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "customers.json"),
    "utf8"
  )
);


// ===============================
// HALAMAN UTAMA
// ===============================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});


// ===============================
// FUNGSI MENCARI CUSTOMER
// ===============================

function findCustomer(customerId) {
  return customers[customerId];
}


// ===============================
// CHAT CUSTOMER SERVICE
// ===============================

app.post("/chat", (req, res) => {

  const originalMessage = req.body.message || "";

  const message = originalMessage.toLowerCase().trim();

  let reply;


  // ===============================
  // CEK ID CUSTOMER
  // ===============================

  const customerIdMatch =
    originalMessage.match(/\bUSER\d{3}\b/i);


  if (customerIdMatch) {

    const customerId =
      customerIdMatch[0].toUpperCase();

    const customer =
      findCustomer(customerId);


    if (!customer) {

      reply =
        "Maaf, ID customer tersebut tidak ditemukan di sistem demo. Silakan periksa kembali ID Anda.";

    } else {

      reply =
        `Saya sudah menemukan data customer ${customerId}.\n\n` +
        `Nama: ${customer.name}\n` +
        `Status akun: ${customer.account_status}\n` +
        `Verifikasi: ${customer.verification}\n` +
        `Saldo dummy: Rp${customer.balance.toLocaleString("id-ID")}\n` +
        `Status withdrawal: ${customer.withdrawal.status}\n` +
        `Keterangan: ${customer.withdrawal.reason}`;

    }


    return res.json({
      reply: reply
    });

  }


  // ===============================
  // LOGIN
  // ===============================

  if (
    message.includes("login") ||
    message.includes("masuk") ||
    message.includes("tidak bisa login")
  ) {

    reply =
      knowledge.login.join(" ");

  }


  // ===============================
  // AKUN
  // ===============================

  else if (
    message.includes("akun") ||
    message.includes("account")
  ) {

    reply =
      knowledge.akun.join(" ");

  }


  // ===============================
  // WEBSITE / TEKNIS
  // ===============================

  else if (
    message.includes("website") ||
    message.includes("error") ||
    message.includes("tidak bisa dibuka") ||
    message.includes("aplikasi")
  ) {

    reply =
      knowledge.teknis.join(" ");

  }


  // ===============================
  // TRANSAKSI
  // ===============================

  else if (
    message.includes("transaksi") ||
    message.includes("status transaksi")
  ) {

    reply =
      knowledge.transaksi.join(" ");

  }


  // ===============================
  // KEAMANAN
  // ===============================

  else if (
    message.includes("aman") ||
    message.includes("keamanan") ||
    message.includes("otp") ||
    message.includes("password") ||
    message.includes("pin")
  ) {

    reply =
      knowledge.keamanan.join(" ");

  }


  // ===============================
  // CUSTOMER SUPPORT
  // ===============================

  else if (
    message.includes("cs") ||
    message.includes("customer service") ||
    message.includes("bantuan") ||
    message.includes("support")
  ) {

    reply =
      knowledge.customer_support.join(" ");

  }


  // ===============================
  // SALAM
  // ===============================

  else if (
    message.includes("halo") ||
    message.includes("hai") ||
    message.includes("hello")
  ) {

    reply =
      "Halo 👋 Selamat datang di Customer Service. Ada yang bisa saya bantu?";

  }


  // ===============================
  // DEFAULT
  // ===============================

  else {

    reply =
      "Terima kasih atas pertanyaan Anda. Untuk demo ini, saya dapat membantu masalah login, akun, website, transaksi, keamanan, dan customer support.";

  }


  res.json({
    reply: reply
  });

});


// ===============================
// SERVER
// ===============================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server demo berjalan pada port ${PORT}`
  );

});
