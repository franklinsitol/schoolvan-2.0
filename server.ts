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
        contents: `${systemPrompt || ''}\n\nPergunta do Motorista: ${query}`,
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

  // API endpoint for T.IA Copilot & CSM Assistant with Operational Actions
  app.post("/api/ai/csm-assistant", async (req, res) => {
    try {
      const { message, contextPrompt, driverId } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(503).json({ 
          error: "API Key não configurada", 
          fallback: true 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const fullSystemPrompt = `${contextPrompt || ''}

Você é a T.IA, copiloto operacional de inteligência artificial do app SchoolVan para motoristas e monitoras de vans escolares no Brasil.
Você fala em português do Brasil de maneira calorosa, acolhedora e eficiente ("Fala Tio/Tia!", "Show de bola!", "Tudo pronto!").

Se o motorista solicitar uma ação de gestão operacional:
- Se for cadastrar aluno sem dados suficientes (ex: "cadastre um aluno para mim", "quero cadastrar um aluno"): NÃO invente dados fictícios. Inicie o cadastro passo a passo, perguntando o nome do aluno com carinho e explicando que ele pode ir falando ou preenchendo a ficha, com a opção de salvar como rascunho. Retorne o bloco action com type "START_STUDENT_DRAFT".
- Se fornecer dados parciais ou completos de aluno: extraia o que foi informado e pergunte os dados faltantes (Escola, Turno, Responsável, Telefone/Zap, Endereço de Embarque, Mensalidade).

Bloco de ação JSON:
\`\`\`action
{
  "type": "START_STUDENT_DRAFT",
  "data": { "name": "...", "schoolName": "...", "shift": "Manhã", "parentName": "...", "parentPhone": "...", "studentAddress": "...", "value": 350, "paymentDay": 10 }
}
\`\`\`

Exemplos de types:
- START_STUDENT_DRAFT
- CREATE_STUDENT
- UPDATE_PAYMENT
- CREATE_TEAM_MEMBER
- CREATE_VEHICLE
- SEARCH_CONTACTS

Se for apenas uma dúvida, responda normalmente de forma concisa e útil.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `${fullSystemPrompt}\n\nComando / Pergunta do Motorista: ${message}`,
      });

      const responseText = response.text || "";
      return res.json({ 
        reply: responseText,
        text: responseText
      });
    } catch (error: any) {
      console.error("T.IA CSM Assistant API error:", error);
      return res.status(500).json({ 
        error: error.message || "Erro no processamento da T.IA", 
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
