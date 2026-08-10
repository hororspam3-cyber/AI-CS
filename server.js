const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// =====================================
// LOAD KNOWLEDGE BASE
// =====================================

let knowledge = {};

try {
knowledge = JSON.parse(
fs.readFileSync(
path.join(__dirname, "knowledge.json"),
"utf8"
)
);

console.log("Knowledge Base berhasil dimuat");
} catch (error) {
console.log("knowledge.json tidak ditemukan");
}

// =====================================
// LOAD CUSTOMER DATABASE
// =====================================

let customers = {};

try {
customers = JSON.parse(
fs.readFileSync(
path.join(__dirname, "customers.json"),
"utf8"
)
);

console.log("Customer database berhasil dimuat");
} catch (error) {
console.log("customers.json tidak ditemukan");
}

// =====================================
// LOAD CLIENT / COMPANY
// =====================================

let clients = {};

try {
clients = JSON.parse(
fs.readFileSync(
path.join(__dirname, "clients.json"),
"utf8"
)
);

console.log("Client database berhasil dimuat");
} catch (error) {
console.log("clients.json tidak ditemukan");
}

// =====================================
// LOAD COMPANY DATA DEMO
// =====================================

let companyData = {};

try {
companyData = JSON.parse(
fs.readFileSync(
path.join(__dirname, "company-data.json"),
"utf8"
)
);

console.log("Company data berhasil dimuat");
} catch (error) {
console.log("company-data.json tidak ditemukan");
}

// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {
res.sendFile(
path.join(__dirname, "index.html")
);
});

// =====================================
// API CUSTOMER
// =====================================

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

const company =
  clients[companyId];

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

const customer =
  customers[customerId];

if (!customer) {
  return res.status(404).json({
    success: false,
    message: "Customer tidak ditemukan."
  });
}

return res.json({
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

// =====================================
// API COMPANY DATA DEMO
// =====================================

app.get(
"/api/company-data/:customerId",
(req, res) => {

```
const customerId =
  String(req.params.customerId || "")
    .trim()
    .toUpperCase();

const customer =
  companyData[customerId];

if (!customer) {
  return res.status(404).json({
    success: false,
    message: "Data customer tidak ditemukan."
  });
}

return res.json({
  success: true,
  customerId: customerId,
  data: customer
});
```

}
);

// =====================================
// CHAT
// =====================================

app.post("/chat", async (req, res) => {

try {

```
const message =
  String(req.body.message || "").trim();

const companyId =
  String(req.body.companyId || "ABC001")
    .trim()
    .toUpperCase();

const customerId =
  String(req.body.customerId || "")
    .trim()
    .toUpperCase();

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

const company =
  clients[companyId];

if (!company) {
  return res.status(404).json({
    reply: "Perusahaan tidak ditemukan."
  });
}

let customerInfo =
  "Belum tersedia.";

if (customerId) {

  const customer =
    customers[customerId];

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

let companyCustomerInfo =
  "Belum tersedia.";

if (customerId) {

  const companyCustomer =
    companyData[customerId];

  if (companyCustomer) {

    companyCustomerInfo =
      JSON.stringify(
        {
          customerId: customerId,
          ...companyCustomer
        },
        null,
        2
      );
  }
}

const systemPrompt = [
  "Kamu adalah AI Customer Service untuk " +
    company.company_name +
    ".",

  "Gunakan bahasa Indonesia.",

  "Jawablah dengan ramah, jelas, dan tidak terlalu panjang.",

  "Tugas utama kamu adalah membantu customer menyelesaikan masalah mereka.",

  "Jika DATA CUSTOMER tersedia, gunakan data tersebut.",

  "Jika customer menanyakan masalah withdrawal, periksa status akun, verifikasi, saldo, limit withdrawal, status withdrawal terakhir, dan alasan withdrawal.",

  "Jika penyebab masalah tersedia di data, jelaskan penyebabnya kepada customer.",

  "Jika ada solusi yang jelas, berikan langkah yang dapat dilakukan customer.",

  "Jangan mengarang data.",

  "Jika informasi tidak tersedia, katakan bahwa informasi tersebut belum tersedia.",

  "Jangan meminta password.",

  "Jangan meminta PIN.",

  "Jangan meminta OTP.",

  "Jangan meminta API key.",

  "Jangan meminta kode keamanan rahasia.",

  "Jangan mengarang saldo.",

  "Jangan mengarang transaksi.",

  "Jangan mengarang status withdrawal.",

  "Jangan mengarang bonus.",

  "Jika masalah tidak dapat diselesaikan berdasarkan data yang tersedia, arahkan customer kepada customer service manusia.",

  "INFORMASI PERUSAHAAN:",

  JSON.stringify(
    company,
    null,
    2
  ),

  "KNOWLEDGE BASE:",

  JSON.stringify(
    knowledge,
    null,
    2
  ),

  "DATA CUSTOMER:",

  customerInfo,

  "DATA OPERASIONAL CUSTOMER:",

  companyCustomerInfo

].join("\n\n");

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

return res.json({
  reply: reply,
  companyId: companyId,
  customerId: customerId || null
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

// =====================================
// SERVER
// =====================================

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
