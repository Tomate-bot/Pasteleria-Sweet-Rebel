import { useState } from 'react';
import { api } from './api.js';
import { fechaNacimientoMaxima } from './fecha.js';

const post = (ruta, body) => api('/api/auth/' + ruta, { method: 'POST', body, auth: false });
const VACIO = { username: '', nombre: '', apellidoPaterno: '', apellidoMaterno: '', email: '', telefono: '', direccion: '', fechaNacimiento: '', password: '', codigo: '', passwordNueva: '' };

/** Panel con el código de recuperación (se muestra UNA vez). */
export function CodigoPanel({ codigo }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => { try { await navigator.clipboard.writeText(codigo); setCopiado(true); } catch { /* el usuario puede copiarlo a mano */ } };
  const bajar = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`Sweet Rebel - código de recuperación\n${codigo}\nGuárdalo en un lugar seguro.\n`], { type: 'text/plain' }));
    a.download = 'sweet-rebel-codigo-recuperacion.txt'; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="codigo-rec" aria-label="Código de recuperación">{codigo}</div>
      <p className="nota">Sirve para recuperar tu cuenta si olvidas tu contraseña. <b>Solo se muestra ahora</b>: guárdalo.</p>
      <div className="acciones izq"><button type="button" className="btn suave" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button><button type="button" className="btn suave" onClick={bajar}>Descargar</button></div>
    </>
  );
}

/** Registro (siempre crea un cliente, entra de inmediato) y recuperación con correo + código de recuperación. */
export default function Acceso({ vista, ir }) {
  const [modo] = useState(vista === 'registro' ? 'registro' : 'recuperar');
  const [v, setV] = useState(VACIO);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [hecho, setHecho] = useState(null);
  const [guardado, setGuardado] = useState(false);
  const campo = (k, l, o = {}) => <label className="campo">{l}<input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...o} /></label>;
  const enviar = (ruta, cuerpo) => async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { setHecho(await post(ruta, cuerpo)); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const reg = { username: v.username, nombre: v.nombre, apellidoPaterno: v.apellidoPaterno, apellidoMaterno: v.apellidoMaterno, email: v.email, telefono: v.telefono, direccion: v.direccion, fechaNacimiento: v.fechaNacimiento, password: v.password };

  return (
    <div className={'ticket' + (modo === 'registro' && !hecho ? ' ancho' : '')}>
      <h1>{hecho ? (modo === 'registro' ? '¡Cuenta creada!' : 'Contraseña actualizada') : modo === 'registro' ? 'Crear cuenta' : 'Recuperar acceso'}</h1>
      {hecho ? (
        <>
          <p className="ok">{hecho.mensaje}</p>
          {modo === 'recuperar' && <p>Tu usuario es: <b>{hecho.username}</b></p>}
          <CodigoPanel codigo={hecho.codigoRecuperacion} />
          <label className="campo"><input type="checkbox" style={{ display: 'inline', width: 'auto', minHeight: 0 }} checked={guardado} onChange={(e) => setGuardado(e.target.checked)} /> Ya guardé mi código</label>
          <button className="btn grande" disabled={!guardado} onClick={() => ir('login')}>Ir a entrar</button>
        </>
      ) : modo === 'registro' ? (
        <form onSubmit={enviar('registro', reg)}>
          <p className="nota">Tu cuenta será de <b>cliente</b>. Los campos con * son obligatorios.</p>
          {campo('username', 'Usuario *', { required: true, autoComplete: 'username', minLength: 3, maxLength: 50, pattern: '[A-Za-z0-9_.@-]{3,50}' })}
          <div className="dos-col">{campo('nombre', 'Nombre(s) *', { required: true, maxLength: 60 })}{campo('apellidoPaterno', 'Apellido paterno *', { required: true, maxLength: 60 })}</div>
          <div className="dos-col">{campo('apellidoMaterno', 'Apellido materno', { maxLength: 60 })}{campo('telefono', 'Teléfono (10 dígitos)', { type: 'tel', maxLength: 20, inputMode: 'tel', pattern: '(\\+?52)?[0-9\\s()\\-]{10,18}', title: 'Escribe 10 dígitos; puedes agregar el prefijo +52.' })}</div>
          {campo('email', 'Correo *', { required: true, type: 'email', maxLength: 150, autoComplete: 'email' })}
          <label className="campo">Dirección de entrega (opcional)<textarea rows="2" maxLength="250" value={v.direccion} onChange={(e) => setV({ ...v, direccion: e.target.value })} /></label>
          {campo('fechaNacimiento', 'Fecha de nacimiento (opcional)', { type: 'date', max: fechaNacimientoMaxima() })}
          {campo('password', 'Contraseña * (12 a 72 caracteres)', { required: true, type: 'password', minLength: 12, maxLength: 72, autoComplete: 'new-password' })}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn grande" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
        </form>
      ) : (
        <form onSubmit={enviar('recuperar/confirmar', { email: v.email, codigo: v.codigo, passwordNueva: v.passwordNueva })}>
          <p className="nota">Escribe tu correo, el código de recuperación que te dimos al registrarte y una contraseña nueva. También te mostraremos tu usuario.</p>
          {campo('email', 'Correo', { required: true, type: 'email', maxLength: 150, autoComplete: 'email' })}
          {campo('codigo', 'Código de recuperación (XXXX-XXXX-XXXX)', { required: true, maxLength: 20, autoCapitalize: 'characters' })}
          {campo('passwordNueva', 'Contraseña nueva (12 a 72 caracteres)', { required: true, type: 'password', minLength: 12, maxLength: 72, autoComplete: 'new-password' })}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn grande" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
          <p className="nota">¿No tienes tu código? Pide a administración que te ayude.</p>
        </form>
      )}
      {!hecho && <div className="enlaces"><button className="lnk" onClick={() => ir('login')}>Volver a entrar</button></div>}
    </div>
  );
}
