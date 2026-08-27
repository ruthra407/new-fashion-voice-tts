const express = require("express");

const app = express();

app.use(express.json());

/*
 * Allow browser app to call this Render API
 */
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

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

/*
 * ElevenLabs Voice ID
 */
const VOICE_ID =
  "nJPQW86B3xSFcIV4aV5H";

/*
 * Health check
 */
app.get("/", (req, res) => {

  console.log(
    "GET / received"
  );

  res.json({
    status: "ok",
    voice_id: VOICE_ID
  });
});

/*
 * TTS endpoint
 */
app.post("/tts", async (req, res) => {

  console.log(
    "===================================="
  );

  console.log(
    "POST /tts received"
  );

  try {

    const { text } = req.body;

    /*
     * Check text
     */
    if (
      !text ||
      typeof text !== "string" ||
      !text.trim()
    ) {

      console.log(
        "TTS ERROR: Text is missing"
      );

      return res.status(400).json({
        error: "Text is required"
      });
    }

    /*
     * Log only the text.
     *
     * API key is NEVER logged.
     */
    console.log(
      "TTS text:",
      text.trim()
    );

    /*
     * Check ElevenLabs API key
     */
    if (
      !process.env.ELEVENLABS_API_KEY
    ) {

      console.error(
        "TTS ERROR: ELEVENLABS_API_KEY is NOT configured"
      );

      return res.status(500).json({
        error:
          "ELEVENLABS_API_KEY is not configured"
      });
    }

    console.log(
      "ElevenLabs API key detected"
    );

    console.log(
      "Voice ID:",
      VOICE_ID
    );

    /*
     * Send text to ElevenLabs
     */
    console.log(
      "Sending request to ElevenLabs..."
    );

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",

        headers: {
          "xi-api-key":
            process.env.ELEVENLABS_API_KEY,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          text: text.trim(),

          model_id:
            "eleven_multilingual_v2"

        })
      }
    );

    console.log(
      "ElevenLabs response status:",
      response.status
    );

    /*
     * ElevenLabs error
     */
    if (!response.ok) {

      const errorText =
        await response.text();

      console.error(
        "ElevenLabs ERROR:",
        errorText
      );

      return res
        .status(response.status)
        .send(errorText);
    }

    /*
     * Convert returned audio to Buffer
     */
    console.log(
      "ElevenLabs audio received"
    );

    const audio =
      Buffer.from(
        await response.arrayBuffer()
      );

    console.log(
      "Audio size:",
      audio.length,
      "bytes"
    );

    /*
     * Return MP3 to Android app
     */
    res.setHeader(
      "Content-Type",
      "audio/mpeg"
    );

    res.setHeader(
      "Content-Length",
      audio.length
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    console.log(
      "Sending MP3 to Android..."
    );

    res.send(audio);

    console.log(
      "TTS request completed successfully"
    );

    console.log(
      "===================================="
    );

  } catch (error) {

    console.error(
      "===================================="
    );

    console.error(
      "TTS SERVER ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "===================================="
    );

    /*
     * If response has not already been sent
     */
    if (!res.headersSent) {

      return res.status(500).json({
        error:
          "TTS generation failed",
        details:
          error.message || "Unknown error"
      });
    }
  }
});

/*
 * Render provides PORT through environment variable.
 */
const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  () => {

    console.log(
      "===================================="
    );

    console.log(
      `TTS server running on port ${PORT}`
    );

    console.log(
      "Voice ID:",
      VOICE_ID
    );

    console.log(
      "TTS endpoint: POST /tts"
    );

    console.log(
      "===================================="
    );
  }
);
