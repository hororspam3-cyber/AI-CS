const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/chat", (req, res) => {
  const message = (req.body.message || "").toLowerCase();

  let reply;

  if (message.includes("halo") || message.includes("hai")) {
    reply = "Halo 👋 Selamat datang di Customer Service. Ada yang bisa saya bantu?";
  } 
  else if (message.includes("harga") || message.includes("price")) {
    reply = "Untuk informasi harga, silakan sebutkan produk yang ingin Anda tanyakan.";
  } 
  else if (message.includes("pembelian") || message.includes("beli")) {
    reply = "Tentu. Saya dapat membantu proses pembelian. Silakan sebutkan produk yang ingin Anda beli.";
  } 
  else if (message.includes("pembayaran") || message.includes("bayar")) {
    reply = "Saya dapat membantu masalah pembayaran. Silakan jelaskan kendala pembayaran Anda.";
  } 
  else if (message.includes("transaksi")) {
    reply = "Untuk pemeriksaan transaksi, silakan siapkan nomor transaksi. Jangan berikan password atau OTP.";
  } 
  else if (message.includes("akun")) {
    reply = "Saya dapat membantu masalah akun. Jelaskan masalah yang Anda alami.";
  } 
  else if (message.includes("terima kasih") || message.includes("thanks")) {
    reply = "Sama-sama 😊 Senang bisa membantu.";
  } 
  else {
    reply = "Terima kasih atas pertanyaan Anda. Untuk demo ini, saya dapat membantu tentang akun, pembelian, harga, pembayaran, dan transaksi.";
  }

  res.json({
    reply: reply
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server demo berjalan pada port ${PORT}`);
});
