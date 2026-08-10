const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function loadJSON(filename, fallback) {
try {
const file = path.join(__dirname, filename);

```
if (!fs.existsSync(file)) {
  console.log(filename + " tidak ditemukan");
  return fallback;
}

const data = JSON.parse(
  fs.readFileSync(file, "utf8")
);

console.log(filename + " berhasil dimuat");

return data;
```

} catch (error) {
console.error(
"Gagal membaca " + filename + ":",
error.message
);

```
return fallback;
```

}
}

const knowledge = loadJSON("knowledge.json", {});
const customers = loadJSON("customers.json", {});
const clients = loadJSON("clients.json", {});
const companyData = loadJSON("company-data.json", {});

app.get("/", (req, res) => {
res.sendFile(
path.join(__dirname, "index.html")
);
});

app.get(
"/api/company/:companyId/customer/:customerId",
(req, res) => {

```
const companyId =
  String(req.params.companyId || "")
    .trim()
    .toUpperCase();

const customerId =
  String(req.params.customerId || "")
    .trim()
    .toUpperCase();

const company = clients[companyId];

if (!company) {
  return res.status(404).json({
    success: false,
    message: "Perusahaan tidak ditemukan."
  });
}

if (company.status !== "active") {
  return res.status(403).json({
    success: false,
    message: "Layanan perusahaan tidak aktif."
  });
}

const customer = customers[customerId];

if (!customer) {
  return res.status(404).json({
    success: false,
    message: "Customer tidak ditemukan."
  });
}

res.json({
  success: true,
  company: {
    id: company.company_id,
    name: company.company_name
  },
  customer: {
    id: customerId,
    ...customer
  }
});
```

}
);

app.post("/chat", async (req, res) => {

try {

```
const message =
  String(req.body.message || "").trim();

const companyId =
  String(
    req.body.companyId || "ABC001"
  )
    .trim()
    .toUpperCase();

const customerId =
  String(
    req.body.customerId || ""
  )
    .trim()
    .toUpperCase();

if (!message) {
  return res.json({
    reply:
      "Silakan tuliskan pertanyaan Anda."
  });
}

if (!GROQ_API_KEY) {
  console.error(
    "GROQ_API_KEY belum tersedia."
  );

  return res.status(500).json({
    reply:
      "Konfigurasi AI belum tersedia di server."
  });
}

const company = clients[companyId];

if (!company) {
  return res.status(404).json({
    reply:
      "Perusahaan tidak ditemukan."
  });
}

let customerInfo =
  "Data customer belum tersedia.";

if (customerId) {

  const customer =
    customers[customerId];

  if (!customer) {
    return res.json({
      reply:
        "Data customer tersebut tidak ditemukan."
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

let operationalInfo =
  "Data operasional customer belum tersedia.";

if (
  customerId &&
  companyData[customerId]
) {

  operationalInfo =
    JSON.stringify(
      companyData[customerId],
      null,
      2
    );
}

const systemPrompt =
  "Kamu adalah AI Customer Service untuk " +
  company.company_name +
  ".\n\n" +

  "Gunakan bahasa Indonesia.\n\n" +

  "Tugas kamu adalah membantu customer " +
  "menyelesaikan masalah berdasarkan data " +
  "yang diberikan sistem.\n\n" +

  "Gunakan data customer jika tersedia.\n" +

  "Gunakan data operasional customer jika tersedia.\n\n" +

  "Jangan mengarang saldo.\n" +
  "Jangan mengarang transaksi.\n" +
  "Jangan mengarang status withdrawal.\n" +
  "Jangan mengarang alasan withdrawal gagal.\n" +
  "Jangan mengarang bonus.\n\n" +

  "Jika customer menanyakan saldo, " +
  "gunakan saldo dari data customer.\n\n" +

  "Jika customer menanyakan withdrawal, " +
  "periksa status dan alasan withdrawal " +
  "dari data yang tersedia.\n\n" +

  "Jika masalah dapat diselesaikan berdasarkan " +
  "data yang tersedia, berikan penyebab dan solusi.\n\n" +

  "Jika data yang diperlukan tidak tersedia, " +
  "katakan bahwa data tersebut belum tersedia.\n\n" +

  "Jangan pernah meminta password, PIN, OTP, " +
  "API key, atau kode keamanan rahasia.\n\n" +

  "INFORMASI PERUSAHAAN:\n" +
  JSON.stringify(company, null, 2) +
  "\n\n" +

  "KNOWLEDGE BASE:\n" +
  JSON.stringify(knowledge, null, 2) +
  "\n\n" +

  "DATA CUSTOMER:\n" +
  customerInfo +
  "\n\n" +

  "DATA OPERASIONAL CUSTOMER:\n" +
  operationalInfo;

const response =
  await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "Authorization":
          "Bearer " + GROQ_API_KEY
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

        temperature: 0.2,

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
  customerId:
    customerId || null
});
```

} catch (error) {

```
console.error(
  "ERROR CHAT:",
  error
);

return res.status(500).json({
  reply:
    "Maaf, terjadi masalah pada sistem AI."
});
```

}
});

const PORT =
process.env.PORT || 3000;

app.listen(
PORT,
() => {
console.log(
"AI Customer Service berjalan pada port " +
PORT
);
}
);
