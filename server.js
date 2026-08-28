const express = require("express");

const app = express();

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;

const GEMINI_MODEL = "gemini-3.1-flash-tts-preview";
const GEMINI_VOICE = "Kore";


// ============================================================
// CORS
// ============================================================

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
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


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {

    console.log("GET / received");

    res.json({
        status: "ok",
        service: "New Fashion Tailoring Tamil TTS",
        provider: "Google Gemini",
        model: GEMINI_MODEL,
        voice: GEMINI_VOICE,
        language: "Tamil",
        endpoint: "/tts"
    });
});


// ============================================================
// PCM → WAV
// Gemini returns:
// 24000 Hz
// mono
// 16-bit PCM
// ============================================================

function pcmToWav(pcmData) {

    const sampleRate = 24000;
    const channels = 1;
    const bitsPerSample = 16;

    const byteRate =
        sampleRate *
        channels *
        bitsPerSample / 8;

    const blockAlign =
        channels *
        bitsPerSample / 8;

    const header = Buffer.alloc(44);

    header.write("RIFF", 0);

    header.writeUInt32LE(
        36 + pcmData.length,
        4
    );

    header.write("WAVE", 8);

    header.write("fmt ", 12);

    header.writeUInt32LE(
        16,
        16
    );

    header.writeUInt16LE(
        1,
        20
    );

    header.writeUInt16LE(
        channels,
        22
    );

    header.writeUInt32LE(
        sampleRate,
        24
    );

    header.writeUInt32LE(
        byteRate,
        28
    );

    header.writeUInt16LE(
        blockAlign,
        32
    );

    header.writeUInt16LE(
        bitsPerSample,
        34
    );

    header.write("data", 36);

    header.writeUInt32LE(
        pcmData.length,
        40
    );

    return Buffer.concat([
        header,
        pcmData
    ]);
}


// ============================================================
// GEMINI TTS
// ============================================================

app.post("/tts", async (req, res) => {

    console.log("======================================");
    console.log("POST /tts received");

    try {

        const text =
            typeof req.body?.text === "string"
                ? req.body.text.trim()
                : "";

        if (!text) {

            console.log(
                "ERROR: text is missing"
            );

            return res.status(400).json({
                error: "Text is required"
            });
        }


        console.log(
            "Tamil text:",
            text
        );


        const apiKey =
            process.env.GEMINI_API_KEY;


        if (!apiKey) {

            console.error(
                "ERROR: GEMINI_API_KEY is missing"
            );

            return res.status(500).json({
                error:
                    "GEMINI_API_KEY is not configured"
            });
        }


        console.log(
            "Gemini API key detected"
        );

        console.log(
            "Gemini model:",
            GEMINI_MODEL
        );

        console.log(
            "Gemini voice:",
            GEMINI_VOICE
        );


        // ====================================================
        // Gemini TTS prompt
        // ====================================================

        const prompt =
            "Speak the following reminder naturally in Tamil. " +
            "Use a clear, warm and pleasant Tamil speaking style. " +
            "Do not translate the message. " +
            "Speak the message exactly as written.\n\n" +
            text;


        console.log(
            "Sending request to Gemini..."
        );


        // ====================================================
        // Gemini REST API
        // ====================================================

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            GEMINI_MODEL +
            ":generateContent",
            {
                method: "POST",

                headers: {
                    "x-goog-api-key": apiKey,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],

                    generationConfig: {

                        responseModalities: [
                            "AUDIO"
                        ],

                        speechConfig: {

                            voiceConfig: {

                                prebuiltVoiceConfig: {

                                    voiceName:
                                        GEMINI_VOICE
                                }
                            }
                        }
                    }
                })
            }
        );


        console.log(
            "Gemini response status:",
            response.status
        );


        // ====================================================
        // Gemini error
        // ====================================================

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Gemini ERROR:"
            );

            console.error(
                errorText
            );

            return res
                .status(response.status)
                .send(errorText);
        }


        const data =
            await response.json();


        // ====================================================
        // Extract PCM audio
        // ====================================================

        const base64Audio =
            data
                ?.candidates?.[0]
                ?.content?.parts?.[0]
                ?.inlineData?.data;


        if (!base64Audio) {

            console.error(
                "ERROR: Gemini returned no audio"
            );

            console.error(
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


        const pcmAudio =
            Buffer.from(
                base64Audio,
                "base64"
            );


        console.log(
            "PCM audio received:",
            pcmAudio.length,
            "bytes"
        );


        // ====================================================
        // Convert PCM → WAV
        // ====================================================

        const wavAudio =
            pcmToWav(
                pcmAudio
            );


        console.log(
            "WAV audio size:",
            wavAudio.length,
            "bytes"
        );


        // ====================================================
        // Send WAV to Android
        // ====================================================

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


        console.log(
            "Sending WAV audio to Android..."
        );


        res.send(
            wavAudio
        );


        console.log(
            "Gemini Tamil TTS SUCCESS"
        );

        console.log(
            "======================================"
        );

    }

    catch (error) {

        console.error(
            "TTS SERVER ERROR:"
        );

        console.error(
            error
        );


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


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "TTS server running on port",
            PORT
        );

        console.log(
            "Provider: Google Gemini"
        );

        console.log(
            "Model:",
            GEMINI_MODEL
        );

        console.log(
            "Voice:",
            GEMINI_VOICE
        );

        console.log(
            "Language: Tamil"
        );

        console.log(
            "TTS endpoint: POST /tts"
        );

        console.log(
            "======================================"
        );
    }
);
