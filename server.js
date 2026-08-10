const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// =====================================
// BACA FILE JSON
// =====================================

function readJSON(filename) {
  const filePath = path.join(__dirname, filename);

  if (!fs.existsSync(filePath)) {
    console.log(filename + " tidak ditemukan");
    return {};
  }

  try {
    const text = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(text);

    console.log(filename + " berhasil dimuat");

    return data;
  } catch (error) {
    console.log(
      "Gagal membaca " + filename + ": " + error.message
    );

    return {};
  }
}

// =====================================
// DATABASE
// =====================================

const knowledge = readJSON("knowledge.json");
const customers = readJSON("customers.json");
const clients = readJSON("clients.json");

// =====================================
// HOME
// =====================================

app.get("/", function (req, res) {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

// =====================================
// CHAT
// =====================================

app.post("/chat", async function (req, res) {

  try {

    const message = String(
      req.body.message || ""
    ).trim();

    const companyId = String(
      req.body.companyId || "ABC001"
    )
      .trim()
      .toUpperCase();

    const customerId = String(
      req.body.customerId || ""
    )
      .trim()
      .toUpperCase();

    // ================================
    // CEK PESAN
    // ================================

    if (!message) {

      return res.json({
        reply:
          "Silakan tuliskan pertanyaan Anda."
      });

    }

    // ================================
    // CEK API KEY
    // ================================

    if (!GROQ_API_KEY) {

      console.error(
        "GROQ_API_KEY belum tersedia."
      );

      return res.status(500).json({
        reply:
          "Layanan AI belum dikonfigurasi dengan benar."
      });

    }

    // ================================
    // PERUSAHAAN
    // ================================

    const company =
      clients[companyId];

    let companyName =
      "ABC Company";

    if (
      company &&
      company.company_name
    ) {

      companyName =
        company.company_name;

    }

    // ================================
    // CUSTOMER
    // ================================

    let customerInfo =
      "Data customer belum tersedia.";

    if (customerId) {

      const customer =
        customers[customerId];

      if (!customer) {

        return res.json({
          reply:
            "Maaf, data customer tidak ditemukan."
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

    // ================================
    // SYSTEM PROMPT
    // ================================

    const systemPrompt =

      "Kamu adalah AI Customer Service untuk " +
      companyName +
      ".\n\n" +

      "Gunakan bahasa Indonesia.\n" +

      "Jawab dengan ramah, jelas, dan singkat.\n\n" +

      "DATA CUSTOMER:\n" +
      customerInfo +
      "\n\n" +

      "KNOWLEDGE BASE:\n" +
      JSON.stringify(
        knowledge,
        null,
        2
      ) +
      "\n\n" +

      "PERATURAN:\n" +

      "1. Gunakan data customer jika tersedia.\n" +

      "2. Jangan mengarang saldo, transaksi, " +
      "bonus, deposit, withdrawal, atau data customer.\n" +

      "3. Jika data yang dibutuhkan tidak tersedia, " +
      "katakan bahwa data tersebut belum tersedia.\n" +

      "4. Jangan meminta password, PIN, OTP, " +
      "atau kode keamanan.\n" +

      "5. Gunakan Knowledge Base sebagai panduan.\n" +

      "6. Jika masalah membutuhkan data yang tidak tersedia, " +
      "jelaskan bahwa informasi tersebut belum tersedia.";

    // ================================
    // REQUEST KE GROQ
    // ================================

    const response =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              "Bearer " +
              GROQ_API_KEY
          },

          body: JSON.stringify({

            model:
              "llama-3.3-70b-versatile",

            messages: [

              {
                role: "system",
                content:
                  systemPrompt
              },

              {
                role: "user",
                content:
                  message
              }

            ],

            temperature:
              0.2,

            max_tokens:
              500

          })

        }
      );

    // ================================
    // HASIL GROQ
    // ================================

    const data =
      await response.json();

    if (!response.ok) {

      console.error(
        "GROQ ERROR:",
        data
      );

      return res.status(500).json({
        reply:
          "Maaf, layanan AI sedang mengalami masalah."
      });

    }

    // ================================
    // AMBIL JAWABAN
    // ================================

    const reply =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (!reply) {

      return res.json({
        reply:
          "Maaf, AI tidak memberikan jawaban."
      });

    }

    // ================================
    // RESPONSE
    // ================================

    return res.json({

      reply:
        reply,

      companyId:
        companyId,

      customerId:
        customerId || null

    });

  } catch (error) {

    console.error(
      "CHAT ERROR:",
      error
    );

    return res.status(500).json({

      reply:
        "Maaf, terjadi masalah pada sistem AI."

    });

  }

});

// =====================================
// SERVER
// =====================================

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  function () {

    console.log(
      "AI Customer Service berjalan pada port " +
      PORT
    );

  }
);
