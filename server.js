const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));


// =====================================
// GROQ
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
// CUSTOMER
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


    if (!GROQ_API_KEY) {

      return res.status(500).json({
        reply: "GROQ_API_KEY belum ditemukan di server."
      });

    }


    // =================================
    // CUSTOMER ID
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


      customerInfo = `
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
      JSON.stringify(knowledge);


    // =================================
    // INSTRUKSI AI
    // =================================

    const systemPrompt = `

Kamu adalah AI Customer Service untuk ABC Company.

Gunakan bahasa Indonesia.

Jawablah dengan ramah, jelas, dan mudah dipahami.

Bantu pelanggan mengenai:

- Akun
- Pembelian
- Pembayaran
- Transaksi
- Keamanan
- Customer Service

Jangan mengarang informasi.

Jika data tidak tersedia, katakan bahwa informasi
belum tersedia.

Jangan pernah memberikan API key,
password, atau informasi rahasia.

Knowledge Base:

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

            model: "llama-3.3-70b-versatile",

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
    // CEK RESPONSE
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
          "Maaf, terjadi masalah pada layanan AI. Silakan coba lagi."

      });

    }


    // =================================
    // AMBIL JAWABAN
    // =================================

    const reply =
      data.choices?.[0]?.message?.content;


    if (!reply) {

      return res.json({

        reply:
          "Maaf, AI tidak memberikan jawaban."

      });

    }


    // =================================
    // KIRIM KE WEBSITE
    // =================================

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

});
