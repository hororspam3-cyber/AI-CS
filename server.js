
const express = require("express");
const OpenAI = require("openai");

const app = express();

app.use(express.json());

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
    res.send("AI Customer Service Backend aktif.");
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
            instructions: `
Kamu adalah AI Customer Service.

Tugas kamu:
- Membantu customer dengan ramah.
- Memahami pertanyaan customer.
- Menjawab dengan bahasa Indonesia yang sederhana.
- Jangan mengarang informasi yang tidak diberikan.
- Jika informasi tidak tersedia, katakan bahwa informasi tersebut perlu diperiksa oleh customer service.
- Jika masalah membutuhkan pemeriksaan akun atau transaksi, minta ID akun atau nomor transaksi.
`,
            input: message
        });

        res.json({
            reply: response.output_text
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Terjadi kesalahan pada server."
        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan pada port ${PORT}`);
});
