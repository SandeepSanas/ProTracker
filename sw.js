/* ProTracker service worker: makes the app installable and opens it offline.
   Your data is not stored here; Firestore keeps its own offline copy. */
const V = "protracker-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
const CDN = /^(www\.gstatic\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put("./index.html", cp)); return res; }).catch(() => caches.match("./index.html")));
    return;
  }
  const mine = u.origin === self.location.origin;
  const cdn = CDN.test(u.hostname) && (u.hostname !== "www.gstatic.com" || u.pathname.startsWith("/firebasejs/"));
  if (!mine && !cdn) return; // Firestore and sign-in traffic always goes to the network
  if (mine && u.pathname.endsWith("/sw.js")) return;
  e.respondWith(caches.match(r).then((hit) => {
    const net = fetch(r).then((res) => { if (res && (res.ok || res.type === "opaque")) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; });
    return mine ? net.catch(() => hit) : hit || net;
  }));
});
