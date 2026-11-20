import { useState } from 'react';
import { api } from './api.js';
import { fechaNacimientoMaxima } from './fecha.js';

const post = (ruta, body) => api('/api/auth/' + ruta, { method: 'POST', body, auth: false });
const VACIO = { username: '', nombre: '', apellidoPaterno: '', apellidoMaterno: '', email: '', telefono: '', direccion: '', fechaNacimiento: '', password: '', codigo: '', passwordNueva: '' };

/** Panel para copiar un código de respaldo generado desde la cuenta. */
export function CodigoPanel({ codigo }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => { try { await navigator.clipboard.writeText(codigo); setCopiado(true); } catch { /* el usuario puede copiarlo a mano */ } };
  return (
    <>
      <div className="codigo-rec" aria-label="Código de recuperación">{codigo}</div>
      <p className="nota">Código de respaldo de un solo uso. Guárdalo en un lugar seguro.</p>
      <div className="acciones izq"><button type="button" className="btn suave" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button></div>
    </>
  );
}

/** Registro de clientes y recuperación de contraseña mediante código temporal por correo. */
export default function Acceso({ vista, ir }) {
  const [modo] = useState(vista === 'registro' ? 'registro' : 'recuperar');
  const [v, setV] = useState(VACIO);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [hecho, setHecho] = useState(null);
  const [codigoSolicitado, setCodigoSolicitado] = useState(false);
  const campo = (k, l, o = {}) => <label className="campo">{l}<input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...o} /></label>;
  const enviar = (ruta, cuerpo) => async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { setHecho(await post(ruta, cuerpo)); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const solicitarCodigo = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await post('recuperar', { email: v.email }); setCodigoSolicitado(true); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const reg = { username: v.username, nombre: v.nombre, apellidoPaterno: v.apellidoPaterno, apellidoMaterno: v.apellidoMaterno, email: v.email, telefono: v.telefono, direccion: v.direccion, fechaNacimiento: v.fechaNacimiento, password: v.password };

  return (
    <div className={'ticket' + (modo === 'registro' && !hecho ? ' ancho' : '')}>
      <h1>{hecho ? (modo === 'registro' ? '¡Cuenta creada!' : 'Contraseña actualizada') : modo === 'registro' ? 'Crear cuenta' : 'Recuperar acceso'}</h1>
      {hecho ? (
        <>
          <p className="ok">{hecho.mensaje}</p>
          <button className="btn grande" onClick={() => ir('login')}>Ir a entrar</button>
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
        codigoSolicitado ? (
          <form onSubmit={enviar('recuperar/confirmar', { email: v.email, codigo: v.codigo, passwordNueva: v.passwordNueva })}>
            <p className="nota">Si el correo corresponde a una cuenta activa, enviamos un código de 6 dígitos. Revisa también spam. El código vence en 10 minutos.</p>
            <label className="campo">Correo<input value={v.email} readOnly type="email" /></label>
            {campo('codigo', 'Código recibido por correo', { required: true, inputMode: 'numeric', pattern: '[0-9]{6}', maxLength: 6, autoComplete: 'one-time-code' })}
            {campo('passwordNueva', 'Contraseña nueva (12 a 72 caracteres)', { required: true, type: 'password', minLength: 12, maxLength: 72, autoComplete: 'new-password' })}
            {err && <p className="error" role="alert">{err}</p>}
            <button className="btn grande" disabled={busy}>{busy ? 'Actualizando…' : 'Cambiar contraseña'}</button>
            <button type="button" className="btn suave" onClick={() => { setCodigoSolicitado(false); setErr(''); setV({ ...v, codigo: '', passwordNueva: '' }); }}>Cambiar correo o solicitar otro código</button>
            <p className="nota">Si solicitas otro código, el anterior dejará de ser válido. Espera al menos un minuto antes de volver a pedirlo.</p>
          </form>
        ) : (
          <form onSubmit={solicitarCodigo}>
            <p className="nota">Escribe el correo asociado a tu cuenta. Te enviaremos un código temporal para cambiar tu contraseña.</p>
            {campo('email', 'Correo', { required: true, type: 'email', maxLength: 150, autoComplete: 'email' })}
            {err && <p className="error" role="alert">{err}</p>}
            <button className="btn grande" disabled={busy}>{busy ? 'Enviando…' : 'Enviar código al correo'}</button>
          </form>
        )
      )}
      {!hecho && <div className="enlaces"><button className="lnk" onClick={() => ir('login')}>Volver a entrar</button></div>}
    </div>
  );
}
