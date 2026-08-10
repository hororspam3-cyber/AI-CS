const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

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
console.log(
"Gagal membaca " + filename + ": " + error.message
);
return {};
}
}

const knowledge = readJSON("knowledge.json");
const customers = readJSON("customers.json");
const clients = readJSON("clients.json");

console.log("Knowledge Base berhasil dimuat");
console.log("Customer database berhasil dimuat");
console.log("Client database berhasil dimuat");

app.get("/", function (req, res) {
res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/chat", async function (req, res) {

try {

```
const message = String(req.body.message || "").trim();

const companyId = String(
  req.body.companyId || "ABC001"
).trim().toUpperCase();

const customerId = String(
  req.body.customerId || ""
).trim().toUpperCase();

if (!message) {
  return res.json({
    reply: "Silakan tuliskan pertanyaan Anda."
  });
}

if (!GROQ_API_KEY) {
  return res.status(500).json({
    reply: "GROQ_API_KEY belum tersedia di Render."
  });
}

const company = clients[companyId];

let companyName = "ABC Company";

if (company && company.company_name) {
  companyName = company.company_name;
}

let customerInfo = "Data customer belum tersedia.";

if (customerId) {

  const customer = customers[customerId];

  if (!customer) {
    return res.json({
      reply: "Data customer tidak ditemukan."
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

  "Gunakan data customer yang diberikan oleh sistem.\n\n" +

  "Jangan mengarang saldo, transaksi, bonus, " +
  "withdrawal, deposit, atau data customer.\n\n" +

  "Jika data yang dibutuhkan tidak tersedia, " +
  "katakan bahwa data tersebut belum tersedia.\n\n" +

  "Jangan meminta password, PIN, OTP, " +
  "atau kode keamanan.\n\n" +

  "KNOWLEDGE BASE:\n" +
  JSON.stringify(knowledge, null, 2) +

  "\n\nDATA CUSTOMER:\n" +
  customerInfo;

const response = await fetch(
  "https://api.groq.com/openai/v1/chat/completions",
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + GROQ_API_KEY
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
    reply: "Maaf, layanan AI sedang mengalami masalah."
  });
}

const reply =
  data.choices &&
  data.choices[0] &&
  data.choices[0].message &&
  data.choices[0].message.content;

if (!reply) {
  return res.json({
    reply: "Maaf, AI tidak memberikan jawaban."
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
console.error("CHAT ERROR:", error);

return res.status(500).json({
  reply: "Maaf, terjadi masalah pada sistem AI."
});
```

}

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {

console.log(
"AI Customer Service berjalan pada port " + PORT
);

});
