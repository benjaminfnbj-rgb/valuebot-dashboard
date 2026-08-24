// api/get-updates.js — Relais Telegram getUpdates pour ValueBot
// HuggingFace ne peut pas joindre api.telegram.org directement (timeout).
// Vercel le peut : ce relais proxifie getUpdates pour que le bot RECOIVE
// les commandes (comme send-message.js le fait pour l'ENVOI).
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8655583864:AAErBm4R_-BLlU7w-4-ijK9YFVaRyU4uuIY";
const SECRET = process.env.RELAY_SECRET || "valuebot2026";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = req.headers["x-api-key"] || "";
  if (apiKey !== SECRET) return res.status(401).json({ error: "Unauthorized" });

  // offset et action depuis body (POST) ou query (GET)
  const src = req.method === "POST" ? (req.body || {}) : (req.query || {});
  const offset = src.offset;
  const action = src.action || "getUpdates";

  try {
    if (action === "deleteWebhook") {
      const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook?drop_pending_updates=false`);
      const data = await r.json();
      return res.status(200).json(data);
    }
    // getUpdates (short-poll pour rester dans la limite de temps Vercel)
    const params = new URLSearchParams({ timeout: "0", limit: "10" });
    if (offset !== undefined && offset !== null && offset !== "") {
      params.set("offset", String(offset));
    }
    const r = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?${params.toString()}`
    );
    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
