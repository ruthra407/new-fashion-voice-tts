const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));

/*
 * NEW FASHION TAILORING
 * Gemini Tamil TTS Backend
 *
 * API key:
 *   Render Environment Variable -> GEMINI_API_KEY
 *
 * Browser-ல் API key இருக்காது.
 */

const MODEL = "gemini-3.1-flash-tts-preview";
const VOICE = "Kore";
const PORT = process.env.PORT || 3000;


/* =========================
   CORS
========================= */

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


/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  console.log("GET / received");

  res.json({
    status: "ok",
    provider: "Gemini",
    model: MODEL,
    voice: VOICE,
    language: "Tamil",
    endpoint: "/tts"
  });
});


/* =========================
   PCM -> WAV
========================= */

function pcmToWav(pcm) {
  const sampleRate = 24000;
  const channels = 1;
  const bitsPerSample = 16;

  const byteRate =
    sampleRate * channels * bitsPerSample / 8;

  const blockAlign =
    channels * bitsPerSample / 8;

  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(
    36 + pcm.length,
    4
  );

  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([
    header,
    pcm
  ]);
}


/* =========================
   GEMINI TTS
========================= */

app.post("/tts", async (req, res) => {
  console.log("====================================");
  console.log("POST /tts received");

  try {

    const text =
      typeof req.body?.text === "string"
        ? req.body.text.trim()
        : "";

    if (!text) {
      console.log("TTS ERROR: Text missing");

      return res.status(400).json({
        error: "Text is required"
      });
    }


    /* =========================
       API KEY
    ========================= */

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "TTS ERROR: GEMINI_API_KEY is NOT configured"
      );

      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not configured"
      });
    }


    console.log("Gemini API key detected");
    console.log("Model:", MODEL);
    console.log("Voice:", VOICE);
    console.log("Tamil TTS text:", text);


    /* =========================
       GEMINI INPUT
    ========================= */

    const input =
      "Speak naturally in Tamil. " +
      "Use a clear, warm, friendly Tamil voice " +
      "suitable for a mobile tailoring business reminder. " +
      "Do not translate the message. " +
      "Speak the message exactly as provided. " +
      "Numbers should be pronounced naturally in Tamil. " +
      "Do not add any extra words.\n\n" +
      text;


    console.log(
      "Sending request to Gemini..."
    );


    /* =========================
       GEMINI REQUEST
    ========================= */

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",

        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          model: MODEL,

          input: input,

          response_format: {
            type: "audio"
          },

          generation_config: {

            speech_config: [
              {
                voice: VOICE
              }
            ]

          }

        })
      }
    );


    console.log(
      "Gemini response status:",
      response.status
    );


    /* =========================
       GEMINI ERROR
    ========================= */

    if (!response.ok) {

      const errorText =
        await response.text();

      console.error(
        "Gemini ERROR:",
        errorText
      );

      return res
        .status(response.status)
        .send(errorText);
    }


    /* =========================
       READ RESPONSE
    ========================= */

    const data =
      await response.json();


    console.log(
      "Gemini response received"
    );


    const base64Audio =
      data?.output_audio?.data;


    if (!base64Audio) {

      console.error(
        "Gemini ERROR: output_audio.data missing"
      );

      console.error(
        "Response keys:",
        Object.keys(data || {})
      );

      console.error(
        "Full response:",
        JSON.stringify(
          data,
          null,
          2
        )
      );

      return res.status(502).json({
        error:
          "Gemini returned no audio"
      });
    }


    /* =========================
       BASE64 -> PCM
    ========================= */

    const pcmAudio =
      Buffer.from(
        base64Audio,
        "base64"
      );


    console.log(
      "PCM bytes:",
      pcmAudio.length
    );


    /* =========================
       PCM -> WAV
    ========================= */

    const wavAudio =
      pcmToWav(pcmAudio);


    console.log(
      "WAV bytes:",
      wavAudio.length
    );


    /* =========================
       SEND AUDIO
    ========================= */

    res.setHeader(
      "Content-Type",
      "audio/wav"
    );

    res.setHeader(
      "Content-Length",
      wavAudio.length
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.send(wavAudio);


    console.log(
      "TTS completed successfully"
    );

    console.log(
      "====================================");

  } catch (error) {

    console.error(
      "===================================="
    );

    console.error(
      "TTS SERVER ERROR:"
    );

    console.error(error);


    if (!res.headersSent) {

      return res.status(500).json({

        error:
          "TTS generation failed",

        details:
          error?.message ||
          "Unknown error"

      });

    }
  }
});


/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {

  console.log(
    "===================================="
  );

  console.log(
    "New Fashion Gemini TTS Server"
  );

  console.log(
    "Server running on port:",
    PORT
  );

  console.log(
    "Provider: Gemini"
  );

  console.log(
    "Model:",
    MODEL
  );

  console.log(
    "Voice:",
    VOICE
  );

  console.log(
    "Language: Tamil"
  );

  console.log(
    "Endpoint: POST /tts"
  );

  console.log(
    "===================================="
  );

});
