const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ===============================
// LOAD KNOWLEDGE
// ===============================

let knowledge = {};

try {
  knowledge = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "knowledge.json"),
      "utf8"
    )
  );
} catch (error) {
  console.log("knowledge.json tidak ditemukan");
}

// ===============================
// LOAD CUSTOMERS
// ===============================

let customers = {};

try {
  customers = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "customers.json"),
      "utf8"
    )
  );
} catch (error) {
  console.log("customers.json tidak ditemukan");
}

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

// ===============================
// FIND CUSTOMER
// ===============================

function findCustomer(customerId) {
  return customers[customerId];
}

// ===============================
// CHAT
// ===============================

app.post("/chat", async (req, res) => {

  try {

    const message =
      String(req.body.message || "").trim();

    if (!message) {
      return res.json({
        reply: "Silakan tuliskan pertanyaan Anda."
      });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        reply: "GROQ_API_KEY belum tersedia di server."
      });
    }

    // ===========================
    // CUSTOMER ID
    // ===========================

    const match =
      message.match(/\bUSER\d{3}\b/i);

    let customerInfo = "";

    if (match) {

      const customerId =
        match[0].toUpperCase();

      const customer =
        findCustomer(customerId);

      if (!customer) {
        return res.json({
          reply:
            "Maaf, ID customer tersebut tidak ditemukan."
        });
      }

      customerInfo =
        JSON.stringify(
          {
            id: customerId,
            ...customer
          },
          null,
          2
        );
    }

    // ===========================
    // SYSTEM PROMPT
    // ===========================

    const systemPrompt = `
Kamu adalah AI Customer Service
untuk ABC Company.

Gunakan bahasa Indonesia.

Jawablah dengan ramah, jelas,
dan mudah dipahami.

Kamu dapat membantu:

- Pendaftaran akun
- Akun
- Deposit
- Withdrawal
- Pembelian
- Pembayaran
- Bonus
- Transaksi
- Password
- Verifikasi
- Customer Service

Gunakan Knowledge Base sebagai
panduan utama.

Jika data customer tersedia,
gunakan data tersebut.

Jangan mengarang data customer.

Jangan meminta password,
PIN, API key, atau kode keamanan.

Jika informasi tidak tersedia,
katakan dengan jujur.

KNOWLEDGE BASE:

${JSON.stringify(knowledge, null, 2)}

DATA CUSTOMER:

${customerInfo}
`;

    // ===========================
    // GROQ REQUEST
    // ===========================

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${GROQ_API_KEY}`
        },

        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",

          messages: [
            {
              role: "system",
              content: systemPrompt
            },

            {
              role: "user",
              content: message
            }
          ],

          temperature: 0.3,
          max_tokens: 500
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {

      console.error(
        "GROQ ERROR:",
        data
      );

      return res.status(500).json({
        reply:
          "Maaf, terjadi masalah pada layanan AI."
      });
    }

    const reply =
      data.choices?.[0]?.message?.content;

    if (!reply) {

      return res.json({
        reply:
          "Maaf, AI tidak memberikan jawaban."
      });
    }

    res.json({
      reply: reply
    });

  } catch (error) {

    console.error(
      "ERROR CHAT:",
      error
    );

    res.status(500).json({
      reply:
        "Maaf, terjadi masalah pada sistem AI."
    });
  }

});

// ===============================
// SERVER
// ===============================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server AI Customer Service berjalan pada port ${PORT}`
  );

});
