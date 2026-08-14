const { getCompany } = require("./companyRepository");

async function getCompanyKnowledge(companyId) {
  const id = String(companyId || "")
    .trim()
    .toUpperCase();

  if (!id) {
    throw new Error(
      "Company ID diperlukan."
    );
  }

  /*
  =====================================
  AMBIL PERUSAHAAN DARI POSTGRESQL
  =====================================
  */

  const company =
    await getCompany(id);

  if (!company) {
    throw new Error(
      "Perusahaan tidak ditemukan di database."
    );
  }

  /*
  =====================================
  AMBIL KNOWLEDGE BASE
  =====================================
  */

  const knowledgeData =
    require("./companyKnowledge.json");

  const companyKnowledge =
    knowledgeData[id];

  /*
  =====================================
  JIKA KNOWLEDGE BELUM ADA
  =====================================
  */

  if (!companyKnowledge) {
    return [];
  }

  /*
  =====================================
  KEMBALIKAN FAQ
  =====================================
  */

  return companyKnowledge.faq || [];
}

module.exports = {
  getCompanyKnowledge
};
