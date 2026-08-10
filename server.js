const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ===============================
// LOAD COMPANY
// ===============================

let company = {};

try {
  company = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "company.json"),
      "utf8"
    )
  );

  console.log(
    "Company berhasil dimuat:",
    company.company_name
  );

} catch (error) {

  console.log(
    "company.json tidak ditemukan"
  );

  company = {
    company_name: "ABC Company",
    description: "AI Customer Service",
    services: []
  };
}

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

  console.log(
    "knowledge.json tidak ditemukan"
  );

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

  console.log(
    "customers.json tidak ditemukan"
  );

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

    const customerId =
      String(req.body.customerId || "")
        .trim()
        .toUpperCase();

    // ===========================
    // CEK PESAN
    // ===========================

    if (!message) {

      return res.json({
        reply:
          "Silakan tuliskan pertanyaan Anda."
      });

    }

    // ===========================
    // CEK GROQ API
    // ===========================

    if (!GROQ_API_KEY) {

      return res.status(500).json({

        reply:
          "GROQ_API_KEY belum tersedia di server."

      });

    }

    // ===========================
    // CUSTOMER DATA
    // ===========================

    let customerInfo =
      "Data customer belum tersedia.";

    if (customerId) {

      const customer =
        findCustomer(customerId);

      if (!customer) {

        return res.json({

          reply:
            "Maaf, akun customer tersebut tidak ditemukan."

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
    // COMPANY INFORMATION
    // ===========================

    const companyInfo =
      JSON.stringify(
        company,
        null,
        2
      );

    // ===========================
    // AI INSTRUCTION
    // ===========================

    const systemPrompt = `

Kamu adalah AI Customer Service
untuk perusahaan berikut:

NAMA PERUSAHAAN:
${company.company_name}

INFORMASI PERUSAHAAN:
${companyInfo}

Gunakan bahasa Indonesia.

Kamu adalah customer service resmi
untuk perusahaan tersebut.

Tugas kamu adalah membantu customer
dengan ramah, jelas, dan mudah dipahami.

==================================================
LAYANAN YANG DAPAT DIBANTU
==================================================

- Pendaftaran akun
- Login
- Akun pelanggan
- Deposit
- Withdrawal
- Pembelian
- Pembayaran
- Bonus
- Transaksi
- Password
- Verifikasi
- Customer Service

==================================================
DATA CUSTOMER
==================================================

${customerInfo}

Jika DATA CUSTOMER tersedia,
anggap customer tersebut adalah
orang yang sedang berbicara dengan kamu.

Jangan meminta customer mengetik
USER ID lagi jika data customer
sudah tersedia.

Gunakan data customer untuk menjawab
pertanyaan seperti:

- Nama
- Status akun
- Saldo
- Bonus
- Deposit
- Withdrawal
- Transaksi
- Verifikasi
- Status akun

Jangan mengarang data.

Jika informasi yang dibutuhkan
tidak tersedia dalam DATA CUSTOMER,
katakan dengan jujur bahwa data tersebut
belum tersedia.

==================================================
KNOWLEDGE BASE PERUSAHAAN
==================================================

${JSON.stringify(
  knowledge,
  null,
  2
)}

Gunakan Knowledge Base sebagai
pedoman layanan perusahaan.

Jangan membuat aturan perusahaan
sendiri.

==================================================
KEAMANAN
==================================================

Jangan pernah meminta:

- Password
- PIN
- API key
- OTP
- Kode keamanan rahasia

Jangan pernah menampilkan
API key atau informasi rahasia.

==================================================
GAYA JAWABAN
==================================================

Jawab dengan bahasa Indonesia.

Gunakan gaya:

- Ramah
- Profesional
- Singkat
- Mudah dipahami

Jika customer bertanya tentang
cara deposit, withdrawal, daftar akun,
bonus, pembayaran, atau layanan lainnya,
jelaskan langkah-langkahnya secara jelas.

Jika customer menanyakan data pribadinya,
gunakan DATA CUSTOMER yang tersedia.

`;

    // ===========================
    // GROQ AI
    // ===========================

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${GROQ_API_KEY}`

        },

        body: JSON.stringify({

          model:
            "llama-3.3-70b-versatile",

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

    // ===========================
    // GROQ RESPONSE
    // ===========================

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

    // ===========================
    // GET AI ANSWER
    // ===========================

    const reply =
      data.choices?.[0]?.message?.content;

    if (!reply) {

      return res.json({

        reply:
          "Maaf, AI tidak memberikan jawaban."

      });

    }

    // ===========================
    // SEND RESPONSE
    // ===========================

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

app.listen(
  PORT,
  () => {

    console.log(
      `Server AI Customer Service berjalan pada port ${PORT}`
    );

  }
);
