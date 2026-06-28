// api/send-message.js — Vercel Serverless Function
// Relay: HuggingFace -> Vercel -> Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ALLOWED_KEY = process.env.RELAY_SECRET || "valuebot2026";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth
  const apiKey = req.headers["x-api-key"] || "";
  if (apiKey !== ALLOWED_KEY) return res.status(401).json({ error: "Unauthorized" });

  const { text, chat_id, parse_mode = "HTML" } = req.body || {};
  if (!text || !chat_id) return res.status(400).json({ error: "Missing text or chat_id" });

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode, disable_web_page_preview: true })
    });
    const data = await tgRes.json();
    if (data.ok) {
      return res.status(200).json({ success: true, message_id: data.result?.message_id });
    } else {
      return res.status(500).json({ error: data.description });
    }
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
