const clients = require("./clients.json");

async function getCompanyKnowledge(companyId) {
  const company =
    clients[companyId];

  if (!company) {
    throw new Error(
      "Perusahaan tidak ditemukan."
    );
  }

  /*
   * ==============================
   * DEMO COMPANY KNOWLEDGE API
   * ==============================
   */

  const apiUrl =
    "https://ai-cs-pt47.onrender.com/api/demo-company/knowledge/" +
    encodeURIComponent(companyId);

  /*
   * Gunakan API key perusahaan.
   */

  let apiKey = null;

  if (companyId === "ABC001") {
    apiKey =
      process.env.ABC001_API_KEY;
  }

  if (companyId === "XYZ001") {
    apiKey =
      process.env.XYZ001_API_KEY;
  }

  if (!apiKey) {
    throw new Error(
      "API key perusahaan belum tersedia."
    );
  }

  const response =
    await fetch(apiUrl, {
      method: "GET",

      headers: {
        "Content-Type":
          "application/json",

        "x-company-id":
          companyId,

        "x-ai-cs-key":
          apiKey
      }
    });

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Gagal mengambil Knowledge Base perusahaan."
    );
  }

  if (
    !data.success ||
    !Array.isArray(data.knowledge)
  ) {
    throw new Error(
      "Format Knowledge Base tidak valid."
    );
  }

  return data.knowledge;
}

module.exports = {
  getCompanyKnowledge
};
