const express = require("express");

const app = express();

app.use(express.json());

// Allow the browser app to call this Render API
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const VOICE_ID = "nJPQW86B3xSFcIV4aV5H";

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    voice_id: VOICE_ID
  });
});

app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Text is required"
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "ELEVENLABS_API_KEY is not configured"
      });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",

        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2"
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(response.status).send(errorText);
    }

    const audio = Buffer.from(
      await response.arrayBuffer()
    );

    res.setHeader(
      "Content-Type",
      "audio/mpeg"
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.send(audio);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "TTS generation failed"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `TTS server running on port ${PORT}`
  );
});
