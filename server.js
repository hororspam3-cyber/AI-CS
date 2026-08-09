const express = require("express");
const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();

app.use(express.json());

// Menampilkan file index.html
app.use(express.static(path.join(__dirname)));

// OpenAI
const client = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

// Halaman utama
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "index.html"));
});

// Chat AI
app.post("/chat", async (req, res) => {
try {
const message = req.body.message;

```
if (!message) {
  return res.status(400).json({
    error: "Pesan belum dikirim."
  });
}

const response = await client.responses.create({
  model: "gpt-5-mini",
  instructions: `
```

Kamu adalah AI Customer Service.

Tugas kamu:

* Membantu customer dengan ramah dan profesional.
* Memahami pertanyaan customer.
* Menjawab menggunakan bahasa Indonesia yang sederhana dan jelas.
* Membantu pertanyaan tentang bonus, pembelian, transaksi, akun, pembayaran, dan masalah customer service lainnya.
* Jangan mengarang informasi yang tidak diberikan.
* Jika informasi tidak tersedia, katakan bahwa informasi tersebut perlu diperiksa oleh customer service.
* Jika masalah membutuhkan pemeriksaan akun atau transaksi, minta ID akun atau nomor transaksi.
* Jangan meminta password, PIN, OTP, API key, atau data rahasia lainnya.
  `,
  input: message
  });

  res.json({
  reply: response.output_text
  });

  } catch (error) {
  console.error(error);

  res.status(500).json({
  error: "Terjadi kesalahan pada server."
  });
  }
  });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(`Server berjalan pada port ${PORT}`);
});
