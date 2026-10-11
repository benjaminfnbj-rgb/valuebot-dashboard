// api/get-updates.js — Relais Telegram getUpdates pour ValueBot
// HuggingFace ne peut pas joindre api.telegram.org directement (timeout).
// Vercel le peut : ce relais proxifie getUpdates pour que le bot REÇOIVE les commandes.
// SÉCURITÉ (audit) : plus de secret par défaut dans le code ; variables Vercel
// obligatoires : TELEGRAM_TOKEN, RELAY_SECRET.
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SECRET = process.env.RELAY_SECRET;

function safeEqual(a, b) {
  a = String(a || ""); b = String(b || "");
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!TELEGRAM_TOKEN || !SECRET) return res.status(503).json({ ok: false, error: "Relay not configured" });
  if (!safeEqual(req.headers["x-api-key"], SECRET)) return res.status(401).json({ error: "Unauthorized" });

  const src = req.method === "POST" ? (req.body || {}) : (req.query || {});
  const action = src.action || "getUpdates";
  if (!["getUpdates", "deleteWebhook"].includes(action)) {
    return res.status(400).json({ ok: false, error: "Invalid action" });
  }

  try {
    if (action === "deleteWebhook") {
      const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook?drop_pending_updates=false`);
      return res.status(200).json(await r.json());
    }
    // getUpdates (short-poll pour rester dans la limite de temps Vercel)
    const params = new URLSearchParams({ timeout: "0", limit: "10" });
    const off = src.offset;
    if (off !== undefined && off !== null && off !== "") {
      if (!/^-?\d+$/.test(String(off))) return res.status(400).json({ ok: false, error: "Invalid offset" });
      params.set("offset", String(off));
    }
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?${params.toString()}`);
    return res.status(200).json(await r.json());
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Relay error" });
  }
}
