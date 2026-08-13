import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for Gemini AI Chat (Server-side proxy)
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { systemPrompt, query } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.warn("Server: GEMINI_API_KEY is not configured or uses placeholder.");
        return res.status(503).json({ 
          error: "API Key não configurada", 
          fallback: true 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `${systemPrompt}\n\nPergunta do Motorista: ${query}`,
      });

      return res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Gemini API server error:", error);
      return res.status(500).json({ 
        error: error.message || "Erro de integração no Gemini", 
        fallback: true 
      });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
