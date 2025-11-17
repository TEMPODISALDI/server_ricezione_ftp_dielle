import express from "express";
import nodemailer from "nodemailer";
import fs from "fs";

const app = express();
app.use(express.json({ limit: "10mb" }));

// Endpoint per ricevere il TXT in base64
app.post("/upload", async (req, res) => {
  try {
    const { filename, txt } = req.body;

    if (!txt) {
      return res.status(400).json({ error: "Missing TXT data" });
    }

    // Decodifica TXT
    const txtContent = Buffer.from(txt, "base64").toString("utf8");

    // Conversione TXT → CSV (prima versione: copia 1:1)
    const lines = txtContent.trim().split(/\r?\n/);

    // Rimuove prima e ultima riga ("data inizio" / "data fine")
    const dataLines = lines.slice(1, -1);

    // Rimuove virgolette e aggiunge intestazioni CSV
    const csvLines = [
      "LDV,DimX,DimY,DimZ,Data,Hub,Peso",
      ...dataLines.map(l => l.replace(/"/g, ""))
    ];

    const csvContent = csvLines.join("\r\n");

    // Salva file temporaneo
    const csvPath = `/tmp/${filename}.csv`;
    fs.writeFileSync(csvPath, csvContent);

    // EMAIL
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: '"Sistema Dielle" <noreply@spedizioniprime.it>',
      to: "simone@spedizioniprime.it",
      subject: `CSV pesi rilevati - ${filename}`,
      text: "In allegato il CSV generato dal file Dielle.",
      attachments: [
        {
          filename: `${filename}.csv`,
          path: csvPath
        }
      ]
    });

    res.json({ status: "ok", sentTo: "simone@spedizioniprime.it" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(3000, () => console.log("Server pronto su Render"));
