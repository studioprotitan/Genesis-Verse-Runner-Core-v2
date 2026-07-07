import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API Route: ElevenLabs TTS Proxy
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceId = "pNInz6obpgHs9S3AsBsc" } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Missing text parameter" });
      }

      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "ELEVENLABS_API_KEY_MISSING",
          message: "ElevenLabs API key is not configured in the environment. Falling back to local SpeechSynthesis."
        });
      }

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          error: "ElevenLabs API Error",
          message: errText || "Failed to synthesize speech using ElevenLabs."
        });
      }

      // Read audio data and return as binary stream
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(buffer);
    } catch (err: any) {
      console.error("ElevenLabs TTS proxy error:", err);
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  });

  // Serve static site / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CST-ERT SERVER] Full-stack instance running on http://localhost:${PORT}`);
  });
}

startServer();
