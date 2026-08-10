const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function readJSON(filename) {
  const filePath = path.join(__dirname, filename);

  if (!fs.existsSync(filePath)) {
    console.log(filename + " tidak ditemukan");
    return {};
  }

  try {
    const text = fs.readFileSync(filePath, "utf8");
    return JSON.parse(text);
  } catch (error) {
    console.error(
      "Gagal membaca " + filename + ":",
      error.message
    );
    return {};
  }
}

const knowledge = readJSON("knowledge.json");
const customers = readJSON("customers.json");
const clients = readJSON("clients.json");

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get(
  "/api/company/:companyId/customer/:customerId",
  function (req, res) {
    const companyId = String(
      req.params.companyId || ""
    )
      .trim()
      .toUpperCase();

    const customerId = String(
      req.params.customerId || ""
    )
      .trim()
      .toUpperCase();

    const company = clients[companyId];

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan."
      });
    }

    const customer = customers[customerId];

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer tidak ditemukan."
      });
    }

    return res.json({
      success: true,
      company: {
        id: companyId,
        name: company.company_name || "ABC Company"
      },
      customer: {
        id: customerId,
        ...customer
      }
    });
  }
);

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

    if (!message) {
      return res.json({
        reply: "Silakan tuliskan pertanyaan Anda."
      });
    }

    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY belum tersedia.");

      return res.status(500).json({
        reply:
          "Layanan AI belum dikonfigurasi dengan benar."
      });
    }

    const company = clients[companyId];

    if (!company) {
      return res.status(404).json({
        reply: "Perusahaan tidak ditemukan."
      });
    }

    const companyName =
      company.company_name || "ABC Company";

    let customerInfo =
      "Data customer belum tersedia.";

    if (customerId) {
      const customer = customers[customerId];

      if (!customer) {
        return res.json({
          reply:
            "Maaf, data customer tidak ditemukan."
        });
      }

      customerInfo = JSON.stringify(
        {
          id: customerId,
          ...customer
        },
        null,
        2
      );
    }

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
      JSON.stringify(knowledge, null, 2) +
      "\n\n" +
      "PERATURAN:\n" +
"1. Gunakan data customer jika tersedia.\n" +
"2. Jangan mengarang atau menyimpulkan fakta yang tidak tertulis di data customer.\n" +
"3. Jangan mengatakan customer pernah melakukan sesuatu jika data tidak menyatakannya.\n" +
"4. Jika status withdrawal adalah 'Tidak ada permintaan aktif', jangan mengatakan withdrawal pernah dilakukan atau ditolak.\n" +
"5. Jika customer menanyakan alasan, penyebab, atau kenapa suatu tindakan tidak dapat dilakukan dan data tidak memberikan alasannya, jangan menebak. Katakan bahwa alasan tersebut belum tersedia di data yang dapat diakses AI.\n" +
"6. Jangan mengarang saldo, transaksi, bonus, deposit, withdrawal, atau data customer.\n" +
"7. Jika data yang dibutuhkan tidak tersedia, katakan data tersebut belum tersedia.\n" +
"8. Jangan meminta password, PIN, OTP, atau kode keamanan.\n" +
"9. Gunakan Knowledge Base sebagai panduan.\n" +
"10. Jangan menyuruh customer menghubungi customer service jika AI masih dapat memberikan jawaban berdasarkan data yang tersedia. Arahkan ke pemeriksaan manusia hanya jika masalah benar-benar membutuhkan akses atau pemeriksaan yang tidak tersedia bagi AI.";
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Bearer " + GROQ_API_KEY
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
          temperature: 0.2,
          max_tokens: 500
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("GROQ ERROR:", data);

      return res.status(500).json({
        reply:
          "Maaf, layanan AI sedang mengalami masalah."
      });
    }

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

    return res.json({
      reply: reply,
      companyId: companyId,
      customerId: customerId || null
    });
  } catch (error) {
    console.error("CHAT ERROR:", error);

    return res.status(500).json({
      reply:
        "Maaf, terjadi masalah pada sistem AI."
    });
  }
});

app.listen(PORT, function () {
  console.log(
    "AI Customer Service berjalan pada port " +
    PORT
  );
});
