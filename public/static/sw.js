const CACHE_NAME = "quartz-pwa-v1"
const CORE_ASSETS = [
  "/",
  "/index.css",
  "/prescript.js",
  "/postscript.js",
  "/static/contentIndex.json",
  "/static/llm-worker.js"
  // Add your local .wasm and .mjs ONNX runtime filenames here
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Let Transformers.js / WebLLM handle Hugging Face model downloads directly
  if (url.hostname.includes("huggingface.co") || url.hostname.includes("hf.co")) {
    return
  }

  // Only cache same-origin GET requests
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return
  }

  // Cache-First for static assets & WASM; Network-First for HTML pages
  if (url.pathname.startsWith("/static/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
  } else {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request))
    )
  }
})
