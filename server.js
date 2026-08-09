const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const knowledge = JSON.parse(
  fs.readFileSync(path.join(__dirname, "knowledge.json"), "utf8")
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/chat", (req, res) => {
  const message = (req.body.message || "").toLowerCase();

  let reply;

  if (
    message.includes("login") ||
    message.includes("masuk") ||
    message.includes("tidak bisa login")
  ) {
    reply = knowledge.login.join(" ");
  }

  else if (
    message.includes("akun") ||
    message.includes("account")
  ) {
    reply = knowledge.akun.join(" ");
  }

  else if (
    message.includes("website") ||
    message.includes("error") ||
    message.includes("tidak bisa dibuka") ||
    message.includes("aplikasi")
  ) {
    reply = knowledge.teknis.join(" ");
  }

  else if (
    message.includes("transaksi") ||
    message.includes("status transaksi")
  ) {
    reply = knowledge.transaksi.join(" ");
  }

  else if (
    message.includes("aman") ||
    message.includes("keamanan") ||
    message.includes("otp") ||
    message.includes("password") ||
    message.includes("pin")
  ) {
    reply = knowledge.keamanan.join(" ");
  }

  else if (
    message.includes("cs") ||
    message.includes("customer service") ||
    message.includes("bantuan") ||
    message.includes("support")
  ) {
    reply = knowledge.customer_support.join(" ");
  }

  else if (
    message.includes("halo") ||
    message.includes("hai")
  ) {
    reply =
      "Halo 👋 Selamat datang di Customer Service. Ada yang bisa saya bantu?";
  }

  else {
    reply =
      "Terima kasih atas pertanyaan Anda. Untuk demo ini, saya dapat membantu masalah login, akun, website, transaksi, keamanan, dan customer support.";
  }

  res.json({
    reply: reply
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server demo berjalan pada port ${PORT}`);
});
