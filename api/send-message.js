// api/send-message.js — Relais Telegram pour ValueBot
// SÉCURITÉ (audit) : plus AUCUNE valeur secrète par défaut dans le code.
// Variables d'environnement Vercel obligatoires : TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, RELAY_SECRET.
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SECRET = process.env.RELAY_SECRET;

// Comparaison à temps constant (évite de deviner le secret par chronométrage)
function safeEqual(a, b) {
  a = String(a || ""); b = String(b || "");
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export default async function handler(req, res) {
  // Appelé uniquement par le bot (serveur à serveur) : pas d'en-têtes CORS ouverts.
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!TELEGRAM_TOKEN || !CHAT_ID || !SECRET) {
    return res.status(503).json({ error: "Relay not configured" });
  }
  if (!safeEqual(req.headers["x-api-key"], SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Le destinataire est FIXÉ côté serveur : le corps de la requête ne peut plus
  // rediriger les messages vers un autre chat.
  const { text, parse_mode = "HTML" } = req.body || {};
  if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing text" });
  if (!["HTML", "Markdown", "MarkdownV2"].includes(parse_mode)) {
    return res.status(400).json({ error: "Invalid parse_mode" });
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: text.slice(0, 4000), parse_mode, disable_web_page_preview: true })
    });
    const data = await r.json();
    if (data.ok) return res.status(200).json({ success: true });
    return res.status(502).json({ error: data.description });
  } catch (err) {
    return res.status(500).json({ error: "Relay error" });
  }
}
