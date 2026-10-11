// Tests du relais Telegram (node --test tests/). Aucun appel réseau : fetch est simulé.
import test from "node:test";
import assert from "node:assert/strict";

function res() {
  const r = { code: 200, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.end = () => r;
  return r;
}
let n = 0;
async function load(file, env) {
  for (const k of ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID", "RELAY_SECRET"]) delete process.env[k];
  Object.assign(process.env, env);
  return (await import(`../api/${file}?v=${++n}`)).default;
}
const FULL = { TELEGRAM_TOKEN: "t0k", TELEGRAM_CHAT_ID: "42", RELAY_SECRET: "s".repeat(32) };
const post = (body, key = FULL.RELAY_SECRET) => ({ method: "POST", headers: { "x-api-key": key }, body, query: {} });

test("send-message : 503 si non configuré (aucun secret par défaut)", async () => {
  const h = await load("send-message.js", {});
  const r = res(); await h(post({ text: "x" }), r);
  assert.equal(r.code, 503);
});

test("send-message : 401 avec une mauvaise clé, y compris l'ancien mot de passe", async () => {
  const h = await load("send-message.js", FULL);
  for (const bad of ["", "valuebot2026", "autre"]) {
    const r = res(); await h(post({ text: "x" }, bad), r);
    assert.equal(r.code, 401);
  }
});

test("send-message : le chat_id du corps est ignoré, destinataire fixé côté serveur", async () => {
  const h = await load("send-message.js", FULL);
  let sent;
  globalThis.fetch = async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return { json: async () => ({ ok: true }) }; };
  const r = res(); await h(post({ text: "bonjour", chat_id: "999999", parse_mode: "HTML" }), r);
  assert.equal(r.code, 200);
  assert.equal(sent.body.chat_id, "42");
  assert.ok(sent.url.includes("/bot" + FULL.TELEGRAM_TOKEN + "/sendMessage"));
});

test("send-message : parse_mode invalide, texte absent ou non texte, taille plafonnée, pas de CORS ouvert", async () => {
  const h = await load("send-message.js", FULL);
  let sent;
  globalThis.fetch = async (u, init) => { sent = JSON.parse(init.body); return { json: async () => ({ ok: true }) }; };
  let r = res(); await h(post({ text: "x", parse_mode: "Evil" }), r); assert.equal(r.code, 400);
  r = res(); await h(post({}), r); assert.equal(r.code, 400);
  r = res(); await h(post({ text: { a: 1 } }), r); assert.equal(r.code, 400);
  r = res(); await h(post({ text: "a".repeat(9000) }), r); assert.equal(r.code, 200); assert.equal(sent.text.length, 4000);
  assert.equal(r.headers["Access-Control-Allow-Origin"], undefined);
  r = res(); await h({ method: "GET", headers: {}, query: {} }, r); assert.equal(r.code, 405);
});

test("send-message : une erreur Telegram ne divulgue rien du réseau interne", async () => {
  const h = await load("send-message.js", FULL);
  globalThis.fetch = async () => { throw new Error("connect ECONNREFUSED 10.0.0.1:443 token=t0k"); };
  const r = res(); await h(post({ text: "x" }), r);
  assert.equal(r.code, 500);
  assert.ok(!JSON.stringify(r.body).includes("t0k"));
});

test("get-updates : 503 non configuré, 401 mauvaise clé, action et offset validés", async () => {
  let h = await load("get-updates.js", {});
  let r = res(); await h(post({}), r); assert.equal(r.code, 503);
  h = await load("get-updates.js", FULL);
  r = res(); await h(post({}, "nope"), r); assert.equal(r.code, 401);
  globalThis.fetch = async (u) => { globalThis.__u = String(u); return { json: async () => ({ ok: true, result: [] }) }; };
  r = res(); await h(post({ action: "setWebhook" }), r); assert.equal(r.code, 400);
  r = res(); await h(post({ offset: "1; drop" }), r); assert.equal(r.code, 400);
  r = res(); await h(post({ offset: 12 }), r); assert.equal(r.code, 200);
  assert.ok(globalThis.__u.includes("offset=12"));
});
