const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { initDatabase } = require("./database");

const {
  saveCompany,
  getCompany
} = require("./companyRepository");

const demoCompanyApi =
  require("./demoCompanyApi");

const companyApi =
require("./company-api");

const {
  getCustomerFromCompany
} = require("./companyAdapter");

const {
  getCompanyKnowledge
} = require("./companyKnowledgeAdapter");

const app = express();

app.use(
  "/api/demo-company",
  demoCompanyApi
);

app.use(
"/api/ai-cs",
companyApi
);

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

function getCompanyApiKey(companyId) {
  const keys = {
  ABC001:
    process.env.ABC001_API_KEY,

  XYZ001:
    process.env.XYZ001_API_KEY,

  PZ001:
    process.env.PLAYZONE_API_KEY
};
  return keys[companyId] || null;
}

function authenticateServer(req, res, next) {
  const companyId = String(
    req.headers["x-company-id"] || ""
  )
    .trim()
    .toUpperCase();

  const providedKey =
    req.headers["x-ai-cs-key"];

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message:
        "Company ID diperlukan."
    });
  }

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      message:
        "Unauthorized."
    });
  }

  const expectedKey =
    getCompanyApiKey(companyId);

  if (!expectedKey) {
    return res.status(401).json({
      success: false,
      message:
        "API perusahaan tidak tersedia."
    });
  }

  const providedBuffer =
    Buffer.from(String(providedKey));

  const expectedBuffer =
    Buffer.from(String(expectedKey));

  const isValid =
    providedBuffer.length ===
      expectedBuffer.length &&
    crypto.timingSafeEqual(
      providedBuffer,
      expectedBuffer
    );

  if (!isValid) {
    return res.status(401).json({
      success: false,
      message:
        "Unauthorized."
    });
  }

  req.companyId = companyId;

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
==============================
REGISTER COMPANY
==============================
*/

app.post(
  "/api/admin/company",
  async function (req, res) {
    try {
      const companyId = String(
        req.body.companyId || ""
      )
        .trim()
        .toUpperCase();

      const companyName = String(
        req.body.companyName || ""
      ).trim();

      const apiUrl = String(
        req.body.apiUrl || ""
      ).trim();

      const apiKeyEnv = String(
        req.body.apiKeyEnv || ""
      ).trim();

      if (
        !companyId ||
        !companyName
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Company ID dan nama perusahaan diperlukan."
        });
      }

      const company =
        await saveCompany({
          id: companyId,
          name: companyName,
          api_url: apiUrl || null,
          api_key_env:
            apiKeyEnv || null,
          integration_type:
            apiUrl
              ? "production"
              : "demo",
          api_enabled:
            Boolean(apiUrl)
        });

      return res.json({
        success: true,
        message:
          "Perusahaan berhasil disimpan.",
        company: company
      });

    } catch (error) {
      console.error(
        "REGISTER COMPANY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal menyimpan perusahaan."
      });
    }
  }
);
/*
==============================
TEST REGISTER XYZ
==============================
*/

app.get(
  "/api/admin/test-xyz",
  async function (req, res) {
    try {
      const company =
        await saveCompany({
          id: "XYZ001",
          name: "XYZ Company",
          api_url: null,
          api_key_env: "XYZ001_API_KEY",
          integration_type: "demo",
          api_enabled: true
        });

      return res.json({
        success: true,
        message:
          "XYZ berhasil disimpan ke database.",
        company: company
      });

    } catch (error) {
      console.error(
        "TEST XYZ ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);
/*
==============================
TEST REGISTER PLAYZONE
==============================
*/

app.get(
  "/api/admin/test-playzone",
  async function (req, res) {
    try {
      const company =
        await saveCompany({
          id: "PZ001",
          name: "PLAYZONE",
          api_url:
            "https://playzone-api.onrender.com/api/customer/{customerId}",
          api_key_env:
            "PLAYZONE_API_KEY",
          integration_type:
            "production",
          api_enabled:
            true
        });

      return res.json({
        success: true,
        message:
          "PLAYZONE berhasil disimpan ke database.",
        company: company
      });

    } catch (error) {
      console.error(
        "TEST PLAYZONE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);
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
 * COMPANY DATA ADAPTER
 * ==============================
 *
 * Menyamakan format data dari
 * berbagai API perusahaan.
 */

async function getCompanyCustomerData(
  companyId,
  customerId
) {
  /*
   * DEMO:
   * Saat ini data masih berasal
   * dari customers.json.
   *
   * Nanti untuk perusahaan sungguhan,
   * bagian ini akan mengambil data
   * dari API perusahaan.
   */

  const customer =
    customers[customerId];

  if (!customer) {
    return null;
  }

  if (
    customer.company_id &&
    customer.company_id !== companyId
  ) {
    return null;
  }

  return {
    id: customerId,
    name: customer.name || null,

    account_status:
      customer.account_status || null,

    account_detail:
      customer.account_detail || null,

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
  };
}
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
 * ==============================
 * DEMO COMPANY API
 * ==============================
 *
 * Simulator API perusahaan.
 * Nanti bagian ini tidak diperlukan
 * ketika memakai API perusahaan asli.
 */

app.get(
  "/api/demo-company/customer/:customerId",
  authenticateServer,
  function (req, res) {
    try {
      const customerId =
        String(
          req.params.customerId || ""
        )
          .trim()
          .toUpperCase();

      const customer =
        customers[customerId];

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer tidak ditemukan."
        });
      }

      return res.json({
        success: true,

        customer: {
          id: customerId,

          name:
            customer.name || null,

          company_id:
            customer.company_id || null,

          account_status:
            customer.account_status || null,

          account_detail:
            customer.account_detail || null,

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
        "DEMO COMPANY API ERROR:",
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
 * ==============================
 * DEMO COMPANY KNOWLEDGE API
 * ==============================
 */

app.get(
  "/api/demo-company/knowledge/:companyId",
  authenticateServer,
  function (req, res) {
    try {
      const companyId =
        String(
          req.params.companyId || ""
        )
          .trim()
          .toUpperCase();

      const company =
        clients[companyId];

      if (!company) {
        return res.status(404).json({
          success: false,
          message:
            "Perusahaan tidak ditemukan."
        });
      }

      const knowledgeData =
        readJSON("companyKnowledge.json");

      const companyKnowledge =
        knowledgeData[companyId];

      if (!companyKnowledge) {
        return res.status(404).json({
          success: false,
          message:
            "Knowledge Base perusahaan tidak ditemukan."
        });
      }

      return res.json({
        success: true,

        company: {
          id: companyId,
          name:
            company.company_name ||
            "Perusahaan"
        },

        knowledge:
          companyKnowledge.faq || []
      });

    } catch (error) {
      console.error(
        "DEMO KNOWLEDGE API ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal mengambil Knowledge Base."
      });
    }
  }
);
/*
 * ==============================
 * COMPANY CHAT API
 * ==============================
 *
 * Endpoint untuk sistem Live Chat
 * perusahaan mengirim pesan ke AI-CS.
 */

app.post(
  "/api/company/chat",
  authenticateServer,
  async function (req, res) {
    try {
      const companyId = String(
        req.body.companyId || ""
      )
        .trim()
        .toUpperCase();

      const customerId = String(
        req.body.customerId || ""
      )
        .trim()
        .toUpperCase();

      const message = String(
        req.body.message || ""
      ).trim();

      if (
        !companyId ||
        !customerId ||
        !message
      ) {
        return res.status(400).json({
          success: false,
          message:
            "companyId, customerId, dan message diperlukan."
        });
      }

      /*
       * Pastikan perusahaan terdaftar.
       */

      const company =
  await getCompany(companyId);

if (!company) {
  return res.status(404).json({
    success: false,
    message:
      "Perusahaan tidak ditemukan di database."
  });
}

      /*
       * Ambil data customer melalui
       * Company API Adapter.
       */

      const customer =
        await getCustomerFromCompany(
          companyId,
          customerId
        );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer tidak ditemukan."
        });
      }

      /*
       * Ambil Knowledge Base perusahaan.
       */

      const companyKnowledge =
        await getCompanyKnowledge(
          companyId
        );

      const companyName =
        company.company_name ||
        "Perusahaan";

      const customerInfo =
        JSON.stringify(
          customer,
          null,
          2
        );

      const knowledgeInfo =
        JSON.stringify(
          companyKnowledge,
          null,
          2
        );

      /*
       * Instruksi AI.
       */

      const systemPrompt =
        "Kamu adalah AI Customer Service untuk " +
        companyName +
        ".\n\n" +

        "Gunakan bahasa Indonesia.\n" +
        "Jawab dengan ramah, jelas, dan singkat.\n\n" +

        "DATA CUSTOMER:\n" +
        customerInfo +
        "\n\n" +

        "KNOWLEDGE BASE PERUSAHAAN:\n" +
        knowledgeInfo +
        "\n\n" +

        "PERATURAN:\n" +

        "1. Gunakan data customer jika tersedia.\n" +

        "2. Gunakan Knowledge Base perusahaan untuk pertanyaan tentang layanan perusahaan.\n" +

        "3. Jangan mengarang data customer.\n" +

        "4. Jangan memberikan data customer lain.\n" +

        "5. Jika informasi tidak tersedia, katakan bahwa informasi tersebut belum tersedia.\n" +

        "6. Jangan meminta password, PIN, OTP, atau kode keamanan.\n" +

        "7. Jangan mengungkapkan data internal perusahaan.\n";

      /*
       * Kirim ke AI.
       */

      if (!GROQ_API_KEY) {
        return res.status(500).json({
          success: false,
          message:
            "GROQ_API_KEY belum tersedia."
        });
      }

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

      if (!response.ok) {
        console.error(
          "COMPANY CHAT GROQ ERROR:",
          data
        );

        return res.status(500).json({
          success: false,
          message:
            "Layanan AI sedang mengalami masalah."
        });
      }

      const reply =
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;

      if (!reply) {
        return res.status(500).json({
          success: false,
          message:
            "AI tidak memberikan jawaban."
        });
      }

      /*
       * Jawaban dikembalikan ke
       * Live Chat perusahaan.
       */

      return res.json({
        success: true,

        companyId:
          companyId,

        customerId:
          customerId,

        reply:
          reply
      });

    } catch (error) {
      console.error(
        "COMPANY CHAT API ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Terjadi masalah pada Company Chat API."
      });
    }
  }
);
/*
 * ==============================
 * COMPANY CHAT DEMO PROXY
 * ==============================
 */

app.post(
  "/api/company-chat-demo",
  async function (req, res) {
    try {
      const companyId = "ABC001";
      const customerId = "USER001";

      const message = String(
        req.body.message || ""
      ).trim();

      if (!message) {
        return res.status(400).json({
          success: false,
          message:
            "Pesan diperlukan."
        });
      }

      const companyApiKey =
        process.env.ABC001_API_KEY;

      if (!companyApiKey) {
        return res.status(500).json({
          success: false,
          message:
            "ABC001_API_KEY belum tersedia."
        });
      }

      const baseUrl =
        "http://localhost:" +
        PORT;

      const response =
        await fetch(
          baseUrl +
            "/api/company/chat",
          {
            method: "POST",

            headers: {
  "Content-Type":
    "application/json",

  "x-company-id":
    companyId,

  "x-ai-cs-key":
    companyApiKey
},

            body:
              JSON.stringify({
                companyId:
                  companyId,

                customerId:
                  customerId,

                message:
                  message
              })
          }
        );

      const data =
        await response.json();

      return res.status(
        response.status
      ).json(data);

    } catch (error) {
      console.error(
        "COMPANY CHAT DEMO PROXY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal menghubungkan Company Chat."
      });
    }
  }
);
/*
 * ==============================
 * SECURITY TESTER
 * ==============================
 */

app.get(
  "/api/test-company-security",
  async function (req, res) {
    try {
      const companyId = "ABC001";

      /*
       * Sengaja meminta customer
       * milik perusahaan XYZ.
       */

      const customerId = "XYZ001";

      const customer =
        await getCustomerFromCompany(
          companyId,
          customerId
        );

      return res.json({
        success: true,
        message:
          "PERINGATAN: Customer perusahaan lain berhasil diakses.",
        customer: customer
      });

    } catch (error) {
      console.error(
        "SECURITY TEST:",
        error.message
      );

      return res.status(403).json({
        success: false,
        message:
          "Customer perusahaan lain berhasil ditolak.",
        detail:
          error.message
      });
    }
  }
);
/*
 * ==============================
 * XYZ COMPANY CHAT TESTER
 * ==============================
 */

app.get(
  "/api/test-xyz-chat",
  async function (req, res) {
    try {
      const companyId = "XYZ001";
      const customerId = "XYZ001";

      const message = String(
        req.query.message ||
          "Berapa saldo saya?"
      ).trim();

      const company =
        clients[companyId];

      if (!company) {
        return res.status(404).json({
          success: false,
          message:
            "Perusahaan XYZ tidak ditemukan."
        });
      }

      const customer =
        await getCustomerFromCompany(
          companyId,
          customerId
        );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer XYZ tidak ditemukan."
        });
      }

      const companyKnowledge =
        await getCompanyKnowledge(
          companyId
        );

      const companyName =
        company.company_name ||
        "XYZ Company";

      const systemPrompt =
        "Kamu adalah AI Customer Service untuk " +
        companyName +
        ".\n\n" +

        "Gunakan bahasa Indonesia.\n" +
        "Jawab dengan ramah, jelas, dan singkat.\n\n" +

        "DATA CUSTOMER:\n" +
        JSON.stringify(
          customer,
          null,
          2
        ) +
        "\n\n" +

        "KNOWLEDGE BASE PERUSAHAAN:\n" +
        JSON.stringify(
          companyKnowledge,
          null,
          2
        ) +
        "\n\n" +

        "Jangan mengarang data.\n" +
        "Jangan memberikan data customer lain.";

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

      if (!response.ok) {
        return res.status(500).json({
          success: false,
          message:
            "AI mengalami masalah."
        });
      }

      const reply =
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;

      return res.json({
        success: true,
        companyId:
          companyId,
        customerId:
          customerId,
        reply:
          reply
      });

    } catch (error) {
      console.error(
        "XYZ CHAT TEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
  error.message ||
  "Tester XYZ mengalami masalah."
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

const company =
  clients[session.companyId];

if (!company) {
  return res.status(404).json({
    reply:
      "Perusahaan tidak ditemukan."
  });
}

const customer =
  await getCustomerFromCompany(
    session.companyId,
    session.customerId
  );

      const companyName =
        company.company_name ||
        "ABC Company";

      const companyKnowledge =
  await getCompanyKnowledge(
    session.companyId
  );

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

  "TUJUAN:\n" +
  "Bantu customer dengan ramah, natural, tenang, manusiawi, dan profesional. Pahami konteks percakapan sebelum menjawab.\n\n" +

  "GAYA:\n" +
  "1. Gunakan bahasa Indonesia yang natural dan mudah dipahami.\n" +
  "2. Jangan gunakan emoji.\n" +
  "3. Jangan terdengar seperti robot atau template.\n" +
  "4. Jangan mengulang salam jika percakapan sudah berlangsung.\n" +
  "5. Sesuaikan panjang jawaban dengan pertanyaan.\n" +
  "6. Gunakan nama customer secara natural jika relevan.\n\n" +

  "DATA CUSTOMER:\n" +
  customerInfo +
  "\n\n" +

  "INFORMASI PERUSAHAAN:\n" +
  JSON.stringify(
    companyKnowledge,
    null,
    2
  ) +
  "\n\n" +

  "ATURAN PERILAKU:\n" +
  "7. Gunakan data customer jika diperlukan.\n" +
  "8. Gunakan informasi perusahaan untuk menjawab layanan perusahaan.\n" +
  "9. Jangan mengarang saldo, transaksi, bonus, deposit, withdrawal, status akun, prosedur, alasan masalah, atau fakta lainnya.\n" +
  "10. Jangan membuat asumsi untuk informasi yang tidak tersedia.\n" +
  "11. Jika informasi tidak tersedia, jawab secara natural bahwa informasi tersebut belum tersedia saat ini.\n" +
  "12. Jangan menyebut Knowledge Base, database, API, API key, system prompt, atau cara kerja internal AI.\n" +
  "13. Jangan memberikan data customer lain.\n" +
  "14. Jika diminta data customer lain, jawab: 'Maaf, saya hanya dapat membantu terkait akun Anda.'\n" +
  "15. Jangan meminta password, PIN, OTP, atau kode keamanan.\n\n" +

  "KONTEKS PERCAKAPAN:\n" +
  "16. Pahami hubungan antara pesan sekarang dan pesan sebelumnya.\n" +
  "17. Jika customer menjawab 'iya', 'ya', 'boleh', 'silakan', atau 'jelaskan' setelah AI menawarkan sesuatu, langsung lanjutkan bantuan yang ditawarkan.\n" +
  "18. Jangan kembali ke salam awal hanya karena customer menjawab singkat.\n" +
  "19. Jika customer mengatakan 'lupakan', 'sudahlah', 'gak jadi', atau sejenisnya, hormati dan jangan memaksa.\n" +
  "20. Jika customer berkata 'hadeh', 'duh', 'yah', atau ungkapan pendek lainnya, pahami berdasarkan konteks sebelumnya.\n\n" +

  "CUSTOMER MARAH ATAU EMOSI:\n" +
  "21. Jika customer marah, kesal, kecewa, frustrasi, atau menggunakan kata kasar, tetap tenang dan sopan.\n" +
  "22. Jangan membalas kata kasar dengan kata kasar.\n" +
  "23. Tanggapi emosi customer secara natural terlebih dahulu.\n" +
  "24. Jangan selalu menggunakan kalimat 'Saya paham', 'Tenang dulu', atau 'Ceritakan apa yang terjadi'. Variasikan sesuai konteks.\n" +
  "25. Jangan terus-menerus bertanya kepada customer yang sedang marah atau lelah.\n" +
  "26. Jika customer hanya meluapkan emosi tanpa pertanyaan, cukup berikan respons singkat dan menenangkan.\n" +
  "27. Jika customer mengatakan capek, tidak tahu, atau tidak ingin bicara, beri ruang dan jangan memaksa.\n" +
  "28. Jika customer mulai menjelaskan masalah, fokus membantu masalah tersebut.\n" +
  "29. Jangan menyalahkan, menghakimi, berdebat, atau menguliahi customer.\n\n" +

  "WITHDRAWAL:\n" +
  "30. Jika status withdrawal adalah 'Tidak ada permintaan aktif', jangan mengatakan customer pernah melakukan withdrawal atau withdrawal pernah gagal.\n" +
  "31. Jika alasan withdrawal tidak tersedia, jangan menebak.\n" +
  "32. Jika prosedur withdrawal tidak tersedia, jangan membuat prosedur sendiri.\n\n" +

  "NOMINAL:\n" +
  "33. Gunakan format Rupiah yang mudah dibaca, misalnya Rp2.500.000.\n\n" +

  "PENTING:\n" +
  "34. Jangan otomatis menganggap setiap pesan berkaitan dengan akun atau perusahaan.\n" +
  "35. Jangan otomatis menggunakan istilah 'situs kami' atau 'layanan kami' jika konteks belum jelas.\n" +
  "36. Jika customer meminta nama dan data akunnya, jawab langsung dan ramah menggunakan data yang tersedia. Contoh: 'Tentu, Dina. Saldo Anda saat ini adalah Rp2.500.000.'\n" +
  "37. Jika customer kembali bertanya tentang akun setelah percakapan emosional, langsung bantu pertanyaannya tanpa mengulang salam.\n" +
  "38. Jangan menawarkan customer service manusia sebagai solusi. Usahakan menyelesaikan masalah sendiri berdasarkan informasi yang tersedia.";

const currentCustomerName =
  String(customer.name || "").trim();

const currentCustomerId =
  String(session.customerId || "").trim();

const lowerMessage =
  message.toLowerCase();

const customerNames = Object.values(customers)
  .map(function (item) {
    return String(item.name || "")
      .trim()
      .toLowerCase();
  })
  .filter(Boolean);

const customerIds = Object.keys(customers)
  .map(function (id) {
    return String(id)
      .trim()
      .toLowerCase();
  });

const mentionsOtherCustomer =
  customerNames.some(function (name) {
    return (
      lowerMessage.includes(name) &&
      name !== currentCustomerName.toLowerCase()
    );
  }) ||
  customerIds.some(function (id) {
    return (
      lowerMessage.includes(id) &&
      id !== currentCustomerId.toLowerCase()
    );
  });

if (mentionsOtherCustomer) {
  return res.json({
    reply:
      "Maaf, saya hanya dapat membantu terkait akun Anda."
  });
}
      
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
            max_tokens: 300
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
 * ==============================
 * ABC COMPANY CHAT TEST
 * ==============================
 */

app.get(
  "/api/test-abc-chat",
  async function (req, res) {
    try {
      const companyId = "ABC001";
      const customerId = "USER001";

      const message = String(
        req.query.message ||
          "Berapa saldo saya?"
      ).trim();

      const companyApiKey =
        process.env.ABC001_API_KEY;

      if (!companyApiKey) {
        return res.status(500).json({
          success: false,
          message:
            "ABC001_API_KEY belum tersedia."
        });
      }

      const response =
        await fetch(
          "http://localhost:" +
            PORT +
            "/api/company/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-company-id":
                companyId,

              "x-ai-cs-key":
                companyApiKey
            },

            body: JSON.stringify({
              companyId:
                companyId,

              customerId:
                customerId,

              message:
                message
            })
          }
        );

      const data =
        await response.json();

      return res.status(
        response.status
      ).json(data);

    } catch (error) {
      console.error(
        "ABC TEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Tester ABC mengalami masalah."
      });
    }
  }
);
/*
 * ==============================
 * API KEY SECURITY TESTER
 * ==============================
 */

app.get(
  "/api/test-api-key-security",
  async function (req, res) {
    try {
      const companyId = String(
        req.query.companyId || ""
      )
        .trim()
        .toUpperCase();

      const apiKeyType = String(
        req.query.key || ""
      )
        .trim()
        .toUpperCase();

      if (!companyId || !apiKeyType) {
        return res.status(400).json({
          success: false,
          message:
            "Gunakan companyId dan key."
        });
      }

      let testKey = null;

      if (apiKeyType === "ABC") {
        testKey =
          process.env.ABC001_API_KEY;
      }

      if (apiKeyType === "XYZ") {
        testKey =
          process.env.XYZ001_API_KEY;
      }

      if (!testKey) {
        return res.status(500).json({
          success: false,
          message:
            "API key untuk test belum tersedia."
        });
      }

      const expectedKey =
        getCompanyApiKey(companyId);

      if (!expectedKey) {
        return res.status(401).json({
          success: false,
          message:
            "API perusahaan tidak tersedia."
        });
      }

      const providedBuffer =
        Buffer.from(String(testKey));

      const expectedBuffer =
        Buffer.from(String(expectedKey));

      const isValid =
        providedBuffer.length ===
          expectedBuffer.length &&
        crypto.timingSafeEqual(
          providedBuffer,
          expectedBuffer
        );

      if (!isValid) {
        return res.status(401).json({
          success: false,
          companyId: companyId,
          keyUsed: apiKeyType,
          message: "Unauthorized."
        });
      }

      return res.json({
        success: true,
        companyId: companyId,
        keyUsed: apiKeyType,
        message:
          "API key valid untuk perusahaan ini."
      });

    } catch (error) {
      console.error(
        "API KEY SECURITY TEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Security tester mengalami masalah."
      });
    }
  }
);

/*
========================================
TEST PLAYZONE AI-CS
========================================
*/

app.get(
  "/api/test-playzone-chat",
  async function (req, res) {
    try {
      const companyId = "PZ001";
      const customerId = "NX-4721";

      const message = String(
        req.query.message ||
        "Berapa saldo saya?"
      ).trim();

      const customer =
        await getCustomerFromCompany(
          companyId,
          customerId
        );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer PLAYZONE tidak ditemukan."
        });
      }

      const company =
        await getCompany(companyId);

      if (!company) {
        return res.status(404).json({
          success: false,
          message:
            "PLAYZONE tidak ditemukan."
        });
      }

      const companyKnowledge =
        await getCompanyKnowledge(
          companyId
        );

      if (!GROQ_API_KEY) {
        return res.status(500).json({
          success: false,
          message:
            "GROQ_API_KEY belum tersedia."
        });
      }

      const systemPrompt =
        "Kamu adalah AI Customer Service untuk PLAYZONE.\n\n" +

        "Gunakan bahasa Indonesia.\n" +
        "Jawab dengan ramah, jelas, singkat, dan natural.\n\n" +

        "DATA CUSTOMER:\n" +
        JSON.stringify(
          customer,
          null,
          2
        ) +
        "\n\n" +

        "INFORMASI PLAYZONE:\n" +
        JSON.stringify(
          companyKnowledge,
          null,
          2
        ) +
        "\n\n" +

        "ATURAN:\n" +
        "1. Gunakan data customer yang tersedia.\n" +
        "2. Jangan mengarang data.\n" +
        "3. Jangan memberikan data customer lain.\n" +
        "4. Jangan meminta password, PIN, atau OTP.";

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
              max_tokens: 300
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        return res.status(500).json({
          success: false,
          message:
            "AI mengalami masalah."
        });
      }

      const reply =
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;

      return res.json({
        success: true,
        companyId: companyId,
        customerId: customerId,
        customer: customer,
        reply: reply
      });

    } catch (error) {
      console.error(
        "PLAYZONE TEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Tester PLAYZONE mengalami masalah."
      });
    }
  }
);
/*
========================================
TEST DATABASE PLAYZONE
========================================
*/

app.get(
  "/api/test-playzone-db",
  async function (req, res) {
    try {
      const company =
        await getCompany("PZ001");

      if (!company) {
        return res.status(404).json({
          success: false,
          message:
            "PZ001 tidak ditemukan di PostgreSQL."
        });
      }

      return res.json({
        success: true,
        message:
          "PZ001 ditemukan di PostgreSQL.",
        company: company
      });

    } catch (error) {
      console.error(
        "TEST PLAYZONE DB ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);
/*
=====================================
DEBUG PLAYZONE DATABASE
=====================================
*/

app.get(
  "/api/debug-playzone",
  async function (req, res) {
    try {
      const company =
        await getCompany("PZ001");

      return res.json({
        success: true,
        company: company
      });

    } catch (error) {
      console.error(
        "DEBUG PLAYZONE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);
/*
========================================
SERVER
========================================
*/

initDatabase().then(() => {
  app.listen(PORT, function () {
    console.log(
      "AI Customer Service berjalan pada port " +
      PORT
    );
  });
});
