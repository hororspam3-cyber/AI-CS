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
   * DEMO:
   * Mengambil Knowledge Base
   * melalui API perusahaan.
   *
   * Nanti URL ini diganti
   * dengan API perusahaan asli.
   */

  const apiUrl =
    "https://ai-cs-pt47.onrender.com/api/demo-company/knowledge/" +
    encodeURIComponent(companyId);

  const apiKey =
    process.env.AI_CS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "AI_CS_API_KEY belum tersedia."
    );
  }

  const response =
    await fetch(apiUrl, {
      method: "GET",

      headers: {
        "Content-Type":
          "application/json",

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
