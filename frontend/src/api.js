// Único punto de contacto con el backend. Misma URL de siempre: /api/...
const BASE = import.meta.env.VITE_API_URL || '';
let token = sessionStorage.getItem('tk') || '';
let onExpired = null;
let waiting = null;

export const setToken = (t) => { token = t || ''; t ? sessionStorage.setItem('tk', t) : sessionStorage.removeItem('tk'); };
export const hasToken = () => !!token;
export const setExpiredHandler = (f) => { onExpired = f; };

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const TEXTO = {
  400: 'Revisa los datos: falta algo o hay un valor incorrecto.',
  403: 'Tu usuario no tiene permiso para hacer esto.',
  404: 'No se encontró el registro (quizá ya fue eliminado).',
  409: 'No se pudo: el dato está repetido o está relacionado con otros registros.',
};

export async function api(path, { method = 'GET', body, auth = true } = {}, reintento = true) {
  let res;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth && token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'No hubo respuesta del servidor. Revisa tu conexión; la operación puede seguir pendiente y puedes reintentarla.');
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 401 && auth) {
    if (!auth || !onExpired || !reintento) throw new ApiError(401, 'Tu sesión terminó. Entra de nuevo.');
    // Pausa la acción, pide la contraseña y la repite: lo escrito en pantalla no se pierde.
    waiting = waiting || onExpired().finally(() => { waiting = null; });
    await waiting;
    return api(path, { method, body, auth }, false);
  }
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) {
    if (res.status === 401) throw new ApiError(401, 'Usuario o contraseña incorrectos.');
    throw new ApiError(res.status, data?.mensaje || TEXTO[res.status] || 'El servidor tuvo un problema. Intenta de nuevo en un momento.');
  }
  return data;
}

export async function login(username, password) {
  const r = await api('/api/auth/login', { method: 'POST', body: { username, password }, auth: false });
  setToken(r.access_token);
}
