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

function loadJSON(filename, defaultValue) {
try {
const filePath = path.join(__dirname, filename);

```
if (!fs.existsSync(filePath)) {
  console.log(filename + " tidak ditemukan");
  return defaultValue;
}

return JSON.parse(
  fs.readFileSync(filePath, "utf8")
);
```

} catch (error) {
console.error(
"Gagal membaca " + filename,
error.message
);

```
return defaultValue;
```

}
}

const knowledge =
loadJSON("knowledge.json", {});

const customers =
loadJSON("customers.json", {});

const clients =
loadJSON("clients.json", {});

const companyData =
loadJSON("company-data.json", {});

// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {
res.sendFile(
path.join(__dirname, "index.html")
);
});

// =====================================
// CEK CUSTOMER
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
// CHAT AI
// =====================================

app.post("/chat", async (req, res) => {

try {

```
const message =
  String(req.body.message || "")
    .trim();

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
  return res.status(500).json({
    reply:
      "GROQ_API_KEY belum tersedia di server."
  });
}

// =================================
// PERUSAHAAN
// =================================

const company =
  clients[companyId];

if (!company) {
  return res.status(404).json({
    reply:
      "Perusahaan tidak ditemukan."
  });
}

// =================================
// CUSTOMER
// =================================

let customerInfo =
  "Tidak ada data customer.";

if (customerId) {

  const customer =
    customers[customerId];

  if (!customer) {
    return res.json({
      reply:
        "Maaf, data customer tersebut tidak ditemukan."
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

// =================================
// DATA OPERASIONAL
// =================================

let operationalInfo =
  "Tidak ada data operasional customer.";

if (customerId) {

  const operational =
    companyData[customerId];

  if (operational) {

    operationalInfo =
      JSON.stringify(
        operational,
        null,
        2
      );
  }
}

// =================================
// SYSTEM INSTRUCTION
// =================================

const systemPrompt = [

  "Kamu adalah AI Customer Service.",

  "Kamu bekerja untuk perusahaan " +
    company.company_name +
    ".", 

  "Gunakan bahasa Indonesia.",

  "Jawablah dengan ramah, jelas, dan singkat.",

  "Tugas utama kamu adalah membantu customer menyelesaikan masalah mereka.",

  "Gunakan DATA CUSTOMER dan DATA OPERASIONAL CUSTOMER jika tersedia.",

  "Jika customer bertanya tentang saldo, gunakan saldo yang tersedia di data.",

  "Jika customer bertanya tentang withdrawal, periksa data withdrawal yang tersedia.",

  "Jika withdrawal gagal dan alasan kegagalan tersedia, jelaskan penyebabnya.",

  "Jika ada solusi yang tersedia, berikan langkah penyelesaiannya.",

  "Jika customer bertanya tentang transaksi, gunakan data transaksi yang tersedia.",

  "Jika customer bertanya tentang verifikasi, gunakan status verifikasi yang tersedia.",

  "Jangan meminta customer memberikan ID customer lagi jika ID sudah diberikan sistem.",

  "Jangan mengarang saldo.",

  "Jangan mengarang transaksi.",

  "Jangan mengarang status withdrawal.",

  "Jangan mengarang alasan kegagalan.",

  "Jangan mengarang bonus.",

  "Jika informasi yang dibutuhkan tidak tersedia, katakan bahwa data tersebut belum tersedia.",

  "Jangan meminta password.",

  "Jangan meminta PIN.",

  "Jangan meminta OTP.",

  "Jangan meminta API key.",

  "Jangan meminta kode keamanan rahasia.",

  "Jika masalah tidak dapat diselesaikan berdasarkan data yang tersedia, katakan bahwa masalah tersebut perlu diperiksa lebih lanjut oleh sistem perusahaan.",

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

  operationalInfo

].join("\n\n");

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

        temperature: 0.2,

        max_tokens: 500

      })
    }
  );

const data =
  await response.json();

// =================================
// ERROR GROQ
// =================================

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

// =================================
// JAWABAN AI
// =================================

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

// =================================
// RESPONSE
// =================================

return res.json({

  reply: reply,

  companyId:
    companyId,

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

// =====================================
// SERVER
// =====================================

const PORT =
process.env.PORT || 3000;

app.listen(
PORT,
() => {

```
console.log(
  "AI Customer Service berjalan pada port " +
  PORT
);
```

}
);
