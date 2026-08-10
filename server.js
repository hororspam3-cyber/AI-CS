const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function readData(filename) {
try {
const filePath = path.join(__dirname, filename);

```
return JSON.parse(
  fs.readFileSync(filePath, "utf8")
);
```

} catch (error) {

```
console.error(
  "Gagal membaca " + filename + ":",
  error.message
);

return {};
```

}
}

const knowledge = readData("knowledge.json");
const customers = readData("customers.json");
const clients = readData("clients.json");

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

const company =
  clients[companyId];

if (!company) {

  return res.status(404).json({
    success: false,
    message: "Perusahaan tidak ditemukan."
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
    id: company.company_id || companyId,
    name:
      company.company_name ||
      "ABC Company"
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
  String(
    req.body.message || ""
  ).trim();

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
      "GROQ_API_KEY belum dipasang di Render."
  });

}

const company =
  clients[companyId];

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
        "Data customer tidak ditemukan."
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

const systemPrompt =

  "Kamu adalah AI Customer Service untuk " +
  (company.company_name || "ABC Company") +
  ".\n\n" +

  "Gunakan bahasa Indonesia.\n" +

  "Jawab dengan ramah dan singkat.\n\n" +

  "Gunakan DATA CUSTOMER untuk menjawab " +
  "pertanyaan tentang akun customer.\n\n" +

  "Jangan mengarang saldo, transaksi, " +
  "withdrawal, bonus, atau data lainnya.\n\n" +

  "Jika data yang diperlukan tidak tersedia, " +
  "katakan bahwa data tersebut belum tersedia.\n\n" +

  "Jangan meminta password, PIN, OTP, " +
  "atau kode keamanan.\n\n" +

  "KNOWLEDGE BASE:\n" +
  JSON.stringify(
    knowledge,
    null,
    2
  ) +

  "\n\nDATA CUSTOMER:\n" +
  customerInfo;

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
