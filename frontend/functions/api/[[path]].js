// Cloudflare Pages: reenvía /api/* a tu backend (variable de entorno BACKEND_URL, sin "/" al final).
export async function onRequest({ request, env }) {
  const u = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete('origin'); headers.delete('host');
  return fetch(env.BACKEND_URL.replace(/\/$/, '') + u.pathname + u.search, {
    method: request.method, headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  });
}
