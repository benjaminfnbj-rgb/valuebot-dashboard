// api/send-message.js — Relais Telegram pour ValueBot
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8655583864:AAErBm4R_-BLlU7w-4-ijK9YFVaRyU4uuIY";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "5487283830";
const SECRET = process.env.RELAY_SECRET || "valuebot2026";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = req.headers["x-api-key"] || "";
  if (apiKey !== SECRET) return res.status(401).json({ error: "Unauthorized" });

  const { text, chat_id = CHAT_ID, parse_mode = "HTML" } = req.body || {};
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode, disable_web_page_preview: true })
    });
    const data = await r.json();
    if (data.ok) return res.status(200).json({ success: true });
    return res.status(500).json({ error: data.description });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
