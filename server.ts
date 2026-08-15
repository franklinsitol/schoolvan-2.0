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

Se o motorista solicitar uma ação de gestão operacional (ex: cadastrar aluno, editar aluno, cadastrar monitor, editar monitor, cadastrar van, editar van, atualizar status de pagamento para pago/atrasado, ou buscar contatos de responsáveis), você deve:
1. Responder em tom prestativo e amigável confirmando o entendimento.
2. Se a intenção for clara, incluir um bloco JSON ao final com o formato:
\`\`\`action
{
  "type": "CREATE_STUDENT" | "UPDATE_STUDENT" | "CREATE_TEAM_MEMBER" | "UPDATE_TEAM_MEMBER" | "CREATE_VEHICLE" | "UPDATE_VEHICLE" | "UPDATE_PAYMENT" | "SEARCH_CONTACTS",
  "data": { ... }
}
\`\`\`

Exemplos de dados no bloco action:
- CREATE_STUDENT: { "name": "...", "parentName": "...", "parentPhone": "...", "schoolName": "...", "value": 450, "paymentDay": 10 }
- UPDATE_PAYMENT: { "studentName": "...", "status": "Em Dia" | "Em Atraso", "value": 450 }
- CREATE_TEAM_MEMBER: { "name": "...", "phone": "...", "memberType": "Monitor" | "Motorista" }
- CREATE_VEHICLE: { "name": "...", "model": "...", "plate": "...", "capacity": 20 }
- SEARCH_CONTACTS: { "query": "..." }

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
