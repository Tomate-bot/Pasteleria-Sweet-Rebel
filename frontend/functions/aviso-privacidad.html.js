export async function onRequest({ env }) {
  return fetch(env.BACKEND_URL.replace(/\/$/, '') + '/aviso-privacidad.html');
}
