const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Origin",
    "https://hororspam3-cyber.github.io"
  );

  res.header(
    "Access-Control-Allow-Credentials",
    "true"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const AI_CS_API_KEY = process.env.AI_CS_API_KEY;

/*
========================================
DATA
========================================
*/

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

/*
========================================
DEMO SESSION
========================================

Session disimpan sementara di memory server.

Untuk production nanti akan diganti
dengan sistem authentication perusahaan.
*/

const sessions = new Map();

function createSession(customerId, companyId) {
  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    customerId: customerId,
    companyId: companyId,
    createdAt: Date.now()
  });

  return token;
}

function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || "";

  const cookies = cookieHeader
    .split(";")
    .map(function (item) {
      return item.trim();
    });

  for (const cookie of cookies) {
    const parts = cookie.split("=");

    if (parts[0] === "ai_cs_session") {
      return parts.slice(1).join("=");
    }
  }

  return null;
}

function getSession(req) {
  const token = getSessionToken(req);

  if (!token) {
    return null;
  }

  return sessions.get(token) || null;
}

/*
========================================
AI-CS API KEY SECURITY
========================================

Digunakan untuk komunikasi server-to-server.

Jangan pernah memasukkan key ini
ke index.html.
*/

function authenticateServer(req, res, next) {
  if (!AI_CS_API_KEY) {
    console.error(
      "AI_CS_API_KEY belum tersedia."
    );

    return res.status(500).json({
      success: false,
      message: "Security AI-CS belum dikonfigurasi."
    });
  }

  const providedKey = req.headers["x-ai-cs-key"];

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized."
    });
  }

  const providedBuffer = Buffer.from(
    String(providedKey)
  );

  const expectedBuffer = Buffer.from(
    String(AI_CS_API_KEY)
  );

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(
      providedBuffer,
      expectedBuffer
    )
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized."
    });
  }

  next();
}

/*
========================================
CUSTOMER SESSION SECURITY
========================================
*/

function authenticateCustomer(req, res, next) {
  const session = getSession(req);

  if (!session) {
    return res.status(401).json({
      success: false,
      message: "Silakan login terlebih dahulu."
    });
  }

  const customer = customers[session.customerId];

  if (!customer) {
    return res.status(401).json({
      success: false,
      message: "Session customer tidak valid."
    });
  }

  req.customerSession = session;
  req.customer = customer;

  next();
}

/*
========================================
HOME
========================================
*/

app.get("/", function (req, res) {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/*
========================================
DEMO LOGIN
========================================

Untuk demo saja.

Nanti perusahaan sungguhan akan
menggantikan endpoint ini dengan
authentication mereka sendiri.
*/

app.post("/login", function (req, res) {
  try {
    const customerId = String(
      req.body.customerId || ""
    )
      .trim()
      .toUpperCase();

    const companyId = String(
      req.body.companyId || "ABC001"
    )
      .trim()
      .toUpperCase();

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID diperlukan."
      });
    }

    const company = clients[companyId];

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan."
      });
    }

    const customer = customers[customerId];

if (!customer) {
  return res.status(401).json({
    success: false,
    message: "Customer tidak ditemukan."
  });
}

if (customer.company_id !== companyId) {
  return res.status(403).json({
    success: false,
    message: "Customer tidak terdaftar pada perusahaan ini."
  });
}

    const token = createSession(
      customerId,
      companyId
    );

    res.setHeader(
  "Set-Cookie",
  "ai_cs_session=" +
    token +
    "; HttpOnly; Path=/; SameSite=None; Secure"
);

    return res.json({
      success: true,
      message: "Login berhasil.",
      customer: {
        id: customerId,
        name: customer.name || null
      },
      company: {
        id: companyId,
        name:
          company.company_name ||
          "ABC Company"
      }
    });

  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Terjadi masalah saat login."
    });
  }
});

/*
========================================
CURRENT CUSTOMER
========================================
*/

app.get(
  "/me",
  authenticateCustomer,
  function (req, res) {
    const session =
      req.customerSession;

    const customer =
      req.customer;

    const company =
      clients[session.companyId];

    return res.json({
      success: true,

      company: {
        id: session.companyId,
        name:
          company.company_name ||
          "ABC Company"
      },

      customer: {
        id: session.customerId,
        ...customer
      }
    });
  }
);

/*
========================================
LOGOUT
========================================
*/

app.post("/logout", function (req, res) {
  const token = getSessionToken(req);

  if (token) {
    sessions.delete(token);
  }

  res.setHeader(
  "Set-Cookie",
  "ai_cs_session=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure"
);

  return res.json({
    success: true,
    message: "Logout berhasil."
  });
});

/*
========================================
CUSTOMER DATA
========================================

Sekarang browser menggunakan session.
Tidak lagi mengirim customerId untuk
menentukan akun.
*/

app.get(
  "/api/company/:companyId/customer/:customerId",
  authenticateCustomer,
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

    const session =
      req.customerSession;

    if (
      companyId !== session.companyId ||
      customerId !== session.customerId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Akses data customer ditolak."
      });
    }

    const company =
      clients[session.companyId];

    const customer =
      customers[session.customerId];

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tidak ditemukan."
      });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer tidak ditemukan."
      });
    }

    return res.json({
      success: true,

      company: {
        id: session.companyId,
        name:
          company.company_name ||
          "ABC Company"
      },

      customer: {
        id: session.customerId,
        ...customer
      }
    });
  }
);

/*
 * ==============================
 * COMPANY API INTEGRATION
 * ==============================
 *
 * Ini adalah API internal AI-CS
 * untuk mengambil data customer.
 *
 * Nanti pada perusahaan sungguhan,
 * bagian ini akan diganti/diadaptasi
 * agar mengambil data dari API perusahaan.
 */

app.get(
  "/api/integration/customer",
  authenticateCustomer,
  function (req, res) {
    try {
      const session = req.customerSession;

      const company =
        clients[session.companyId];

      const customer =
        customers[session.customerId];

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Perusahaan tidak ditemukan."
        });
      }

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer tidak ditemukan."
        });
      }

      return res.json({
        success: true,

        company: {
          id: session.companyId,
          name:
            company.company_name ||
            "Perusahaan"
        },

        customer: {
          id: session.customerId,
          name: customer.name || null,
          account_status:
            customer.account_status || null,
          verification:
            customer.verification || null,
          balance:
            customer.balance ?? null,
          deposit:
            customer.deposit || null,
          withdrawal:
            customer.withdrawal || null,
          bonus:
            customer.bonus || null,
          transaction:
            customer.transaction || null
        }
      });

    } catch (error) {
      console.error(
        "COMPANY API ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal mengambil data customer."
      });
    }
  }
);
/*
========================================
CHAT
========================================
*/

app.post(
  "/chat",
  authenticateCustomer,
  async function (req, res) {
    try {
      const message = String(
        req.body.message || ""
      ).trim();

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
            "Layanan AI belum dikonfigurasi dengan benar."
        });
      }

      const session =
        req.customerSession;

      const customer =
        req.customer;

      const company =
        clients[session.companyId];

      if (!company) {
        return res.status(404).json({
          reply:
            "Perusahaan tidak ditemukan."
        });
      }

      const companyName =
        company.company_name ||
        "ABC Company";

      const customerInfo =
        JSON.stringify(
          {
            id: session.customerId,
            ...customer
          },
          null,
          2
        );

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

        "2. Jangan mengarang atau menyimpulkan fakta yang tidak tertulis di data customer.\n" +

        "3. Jangan mengatakan customer pernah melakukan sesuatu jika data tidak menyatakannya.\n" +

        "4. Jika status withdrawal adalah 'Tidak ada permintaan aktif', jangan mengatakan withdrawal pernah dilakukan atau ditolak.\n" +

        "5. Jika customer menanyakan alasan, penyebab, atau kenapa suatu tindakan tidak dapat dilakukan dan data tidak memberikan alasannya, jangan menebak. Katakan bahwa alasan tersebut belum tersedia di data yang dapat diakses AI.\n" +

        "6. Jangan mengarang saldo, transaksi, bonus, deposit, withdrawal, atau data customer.\n" +

        "7. Jika data yang dibutuhkan tidak tersedia, katakan data tersebut belum tersedia.\n" +

        "8. Jangan meminta password, PIN, OTP, atau kode keamanan.\n" +

        "9. Gunakan Knowledge Base sebagai panduan.\n" +

        "10. Jangan menyuruh customer menghubungi customer service atau tim lain jika AI tidak memiliki informasi tambahan. Jika penyebab atau informasi yang dibutuhkan tidak tersedia, cukup jelaskan bahwa informasi tersebut belum tersedia di data yang dapat diakses AI.";

      const response = await fetch(
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
          session.companyId,

        customerId:
          session.customerId
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
  }
);

/*
========================================
SERVER
========================================
*/

app.listen(PORT, function () {
  console.log(
    "AI Customer Service berjalan pada port " +
      PORT
  );
});
