/* Basic offline queue for POST /api/entries/today */
const DB_NAME = 'dailyping-queue';
const STORE = 'requests';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function idb() {
  return await new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

async function put(store, value) {
  const tx = store.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).add(value);
  return await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll(store) {
  const tx = store.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).getAll();
  return await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clear(store) {
  const tx = store.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  return await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/api/entries/today') {
    event.respondWith((async () => {
      try {
        const res = await fetch(request.clone());
        return res;
      } catch (err) {
        const db = await idb();
        const headers = {};
        request.headers.forEach((v, k) => (headers[k] = v));
        const body = await request.clone().text();
        await put(db, { url: request.url, method: request.method, headers, body, ts: Date.now() });
        return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { 'content-type': 'application/json' } });
      }
    })());
  }
});

async function flushQueue() {
  const db = await idb();
  const items = await getAll(db);
  for (const it of items) {
    try {
      await fetch(it.url, { method: it.method, headers: it.headers, body: it.body });
    } catch (e) {
      // still offline; bail
      return;
    }
  }
  await clear(db);
}

self.addEventListener('sync', (e) => {
  if (e.tag === 'flush-queue') e.waitUntil(flushQueue());
});

self.addEventListener('message', (e) => {
  if (e.data === 'flush') flushQueue();
});

self.addEventListener('online', () => flushQueue());

