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

  // ==========================================
  // ASAAS PAYMENT GATEWAY INTEGRATION ENDPOINTS
  // ==========================================

  // Endpoint to create Asaas Payment (PIX / Boleto) with automatic Platform Split
  app.post("/api/asaas/create-payment", async (req, res) => {
    try {
      const {
        customerName,
        customerCpfCnpj,
        customerEmail,
        customerPhone,
        value,
        dueDate,
        description,
        billingType, // 'PIX' | 'BOLETO' | 'UNDEFINED'
        splitFee, // R$ 1.50 (SchoolVan take-rate)
        subaccountWalletId,
        customApiKey,
        customEnvironment
      } = req.body;

      const apiKey = customApiKey || process.env.ASAAS_API_KEY;
      const environment = customEnvironment || process.env.ASAAS_ENVIRONMENT || "sandbox";
      const baseUrl = environment === "production" 
        ? "https://api.asaas.com/v3" 
        : "https://sandbox.asaas.com/api/v3";

      if (!apiKey) {
        return res.status(400).json({ 
          error: "Chave de API do Asaas não configurada. Configure no painel do Super Admin ou no arquivo .env." 
        });
      }

      // Step 1: Create or find Asaas Customer
      let customerId: string | null = null;
      try {
        const customerSearchRes = await fetch(`${baseUrl}/customers?cpfCnpj=${customerCpfCnpj || ''}&email=${customerEmail || ''}`, {
          headers: { 'access_token': apiKey }
        });
        const customerSearchData = await customerSearchRes.json();
        if (customerSearchData?.data && customerSearchData.data.length > 0) {
          customerId = customerSearchData.data[0].id;
        }
      } catch (err) {
        console.warn("Asaas customer search failed:", err);
      }

      if (!customerId) {
        const createCustomerRes = await fetch(`${baseUrl}/customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": apiKey
          },
          body: JSON.stringify({
            name: customerName || "Responsável Aluno",
            cpfCnpj: customerCpfCnpj,
            email: customerEmail,
            mobilePhone: customerPhone
          })
        });
        const newCustomer = await createCustomerRes.json();
        if (newCustomer.id) {
          customerId = newCustomer.id;
        } else {
          return res.status(400).json({ 
            error: newCustomer.errors?.[0]?.description || "Erro ao cadastrar cliente no Asaas" 
          });
        }
      }

      // Step 2: Build Split configuration if subaccount exists
      const splits = [];
      if (subaccountWalletId && splitFee && Number(splitFee) > 0) {
        splits.push({
          walletId: subaccountWalletId,
          fixedValue: Math.max(0, Number(value) - Number(splitFee))
        });
      }

      // Step 3: Create Payment
      const paymentPayload: any = {
        customer: customerId,
        billingType: billingType || "PIX",
        value: Number(value),
        dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        description: description || "Mensalidade de Transporte Escolar - SchoolVan",
        postalService: false
      };

      if (splits.length > 0) {
        paymentPayload.split = splits;
      }

      const paymentRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": apiKey
        },
        body: JSON.stringify(paymentPayload)
      });
      const paymentData = await paymentRes.json();

      if (!paymentData.id) {
        return res.status(400).json({ 
          error: paymentData.errors?.[0]?.description || "Erro ao criar cobrança no Asaas" 
        });
      }

      // Step 4: If PIX, fetch QR Code payload
      let pixQrCode = null;
      let pixCopiaECola = null;
      if (billingType === "PIX" || !billingType) {
        try {
          const pixRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, {
            headers: { 'access_token': apiKey }
          });
          const pixData = await pixRes.json();
          pixQrCode = pixData.encodedImage;
          pixCopiaECola = pixData.payload;
        } catch (err) {
          console.warn("Failed to get Asaas PIX QR code:", err);
        }
      }

      return res.json({
        success: true,
        paymentId: paymentData.id,
        status: paymentData.status,
        invoiceUrl: paymentData.invoiceUrl,
        bankSlipUrl: paymentData.bankSlipUrl,
        pixQrCode,
        pixCopiaECola,
        value: paymentData.value,
        dueDate: paymentData.dueDate
      });
    } catch (error: any) {
      console.error("Asaas create payment error:", error);
      return res.status(500).json({ error: error.message || "Falha na comunicação com Asaas" });
    }
  });

  // Asaas Webhook receiver (Payment confirmed / received)
  app.post("/api/asaas/webhook", async (req, res) => {
    try {
      const event = req.body;
      console.log(`[ASAAS WEBHOOK RECEIVED] Event: ${event?.event}, Payment ID: ${event?.payment?.id}`);

      // Handle Events: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE
      const eventType = event?.event;
      const payment = event?.payment;

      if (!payment || !payment.id) {
        return res.status(200).json({ received: true });
      }

      return res.status(200).json({
        received: true,
        event: eventType,
        paymentId: payment.id,
        status: payment.status,
        value: payment.value,
        confirmedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Asaas webhook handler error:", error);
      return res.status(200).json({ received: true, error: error.message });
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
