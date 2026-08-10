const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));


// =====================================
// GROQ API KEY
// =====================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;


// =====================================
// KNOWLEDGE BASE
// =====================================

let knowledge = {};

try {
  knowledge = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "knowledge.json"),
      "utf8"
    )
  );
} catch (error) {
  console.log("knowledge.json tidak ditemukan.");
}


// =====================================
// CUSTOMER DATABASE
// =====================================

let customers = {};

try {
  customers = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "customers.json"),
      "utf8"
    )
  );
} catch (error) {
  console.log("customers.json tidak ditemukan.");
}


// =====================================
// HALAMAN UTAMA
// =====================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});


// =====================================
// CARI CUSTOMER
// =====================================

function findCustomer(customerId) {
  return customers[customerId];
}


// =====================================
// CHAT
// =====================================

app.post("/chat", async (req, res) => {

  try {

    const originalMessage =
      String(req.body.message || "").trim();


    if (!originalMessage) {

      return res.json({
        reply: "Silakan tuliskan pertanyaan Anda."
      });

    }


    // =================================
    // CEK GROQ API KEY
    // =================================

    if (!GROQ_API_KEY) {

      console.error(
        "GROQ_API_KEY tidak ditemukan."
      );

      return res.status(500).json({

        reply:
          "Konfigurasi AI belum tersedia di server."

      });

    }


    // =================================
    // CEK CUSTOMER ID
    // =================================

    const customerIdMatch =
      originalMessage.match(/\bUSER\d{3}\b/i);


    let customerInfo = "";


    if (customerIdMatch) {

      const customerId =
        customerIdMatch[0].toUpperCase();


      const customer =
        findCustomer(customerId);


      if (!customer) {

        return res.json({

          reply:
            "Maaf, ID customer tersebut tidak ditemukan di sistem demo."

        });

      }


      // Semua data customer diberikan
      // kepada AI

      customerInfo = `

DATA CUSTOMER:

${JSON.stringify(
  {
    id: customerId,
    ...customer
  },
  null,
  2
)}

`;

    }


    // =================================
    // KNOWLEDGE BASE
    // =================================

    const knowledgeText =
      JSON.stringify(
        knowledge,
        null,
        2
      );


    // =================================
    // INSTRUKSI AI
    // =================================

    const systemPrompt = `

Kamu adalah AI Customer Service
untuk ABC Company.

Gunakan bahasa Indonesia.

Jawablah dengan ramah, jelas,
dan mudah dipahami.

Kamu dapat membantu pelanggan
mengenai:

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

Jika terdapat DATA CUSTOMER,
gunakan data tersebut untuk
menjawab pertanyaan pelanggan.

Jangan mengarang data customer.

Jika informasi tidak tersedia,
katakan bahwa informasi tersebut
belum tersedia.

Jangan pernah meminta atau
menampilkan:

- Password
- PIN
- API key
- Kode keamanan rahasia

Jika pelanggan membutuhkan bantuan
yang tidak dapat diselesaikan AI,
arahkan kepada customer service.

KNOWLEDGE BASE:

${knowledgeText}

${customerInfo}

`;


    // =================================
    // REQUEST KE GROQ
    // =================================

    const response =
      await fetch(
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
                content: originalMessage
              }

            ],

            temperature: 0.3,

            max_tokens: 500

          })

        }
      );


    // =================================
    // BACA RESPONSE
    // =================================

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


    // =================================
    // AMBIL JAWABAN AI
    // =================================

    const reply =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message
        ? data.choices[0].message.content
        : null;


    if (!reply) {

      return res.json({

        reply:
          "Maaf, AI tidak memberikan jawaban."

      });

    }


    // =================================
    // KIRIM JAWABAN KE WEBSITE
    // =================================

    res.json({

      reply: reply

    });

  }


  catch (error) {

    console.error(
      "ERROR CHAT:",
      error
    );


    res.status(500).json({

      reply:
        "Maaf, terjadi masalah pada sistem AI. Silakan coba lagi."

    });

  }

});


// =====================================
// SERVER
// =====================================

const PORT =
  process.env.PORT || 3000;


app.listen(PORT, () => {

  console.log(
    `Server AI Customer Service berjalan pada port ${PORT}`
  );

});  );

});
