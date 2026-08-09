const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message) {
      return res.status(400).json({
        error: "Pesan belum dikirim."
      });
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: message
    });

    res.json({
      reply: response.output_text
    });

  } catch (error) {
    console.error("OPENAI ERROR:", error);

    res.status(500).json({
      error: "Terjadi kesalahan pada AI."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server berjalan pada port ${PORT}`);
});
