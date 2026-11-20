import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { fechaNacimientoMaxima } from './fecha.js';
import './perfil.css';
import { CodigoPanel } from './Acceso.jsx';

const BASE = import.meta.env.VITE_API_URL || '';
const fechaISO = (valor) => {
  if (!valor) return '';
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
};
async function bajarFoto() {
  const r = await fetch(BASE + '/api/perfil/foto', { headers: { Authorization: 'Bearer ' + (sessionStorage.getItem('tk') || '') } });
  return r.ok ? URL.createObjectURL(await r.blob()) : null;
}

/** Foto del usuario (o un icono si aún no tiene). Se actualiza sola al cambiarla. */
export function Avatar({ grande }) {
  const [url, setUrl] = useState(null);
  const cargar = useCallback(() => { bajarFoto().then((u) => setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return u; })).catch(() => {}); }, []);
  useEffect(() => { cargar(); window.addEventListener('foto-actualizada', cargar); return () => window.removeEventListener('foto-actualizada', cargar); }, [cargar]);
  const clase = 'avatar' + (grande ? ' grande' : '');
  return url ? <img className={clase} src={url} alt="Tu foto de perfil" /> : <span className={clase + ' avatar-vacio'} aria-hidden="true">👤</span>;
}

/** Recorta al centro y reduce a 256×256 JPEG en el navegador: pesa ~30 KB y no se sube la foto original. */
function reducir(archivo) {
  return new Promise((ok, no) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement('canvas');
      c.width = c.height = 256;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('No pudimos leer esa imagen. Prueba con JPG o PNG.')); };
    img.src = url;
  });
}

export function Perfil({ ui }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const cargar = useCallback(() => {
    api('/api/perfil').then((r) => setD({ nombre: r.nombres || r.nombre || '', apellidoPaterno: r.apellidoPaterno || '', apellidoMaterno: r.apellidoMaterno || '',
      telefono: r.telefono || '', direccion: r.direccion || '', fechaNacimiento: fechaISO(r.fechaNacimiento), email: r.email || '' })).catch((x) => setErr(x.message));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  if (err) return <div className="vacio error">{err} <button className="btn suave" onClick={() => { setErr(''); cargar(); }}>Reintentar</button></div>;
  if (!d) return <div className="vacio">Cargando tu perfil…</div>;
  const campo = (k, l, o = {}) => <label className="campo">{l}<input value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} {...o} /></label>;
  const guardar = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      ui.toast((await api('/api/perfil', { method: 'PUT', body: { ...d, passwordActual } })).mensaje);
      setPasswordActual('');
      cargar();
    } catch (x) { ui.toast(x.message, 'error'); }
    setBusy(false);
  };
  const foto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { ui.toast((await api('/api/perfil/foto', { method: 'PUT', body: { imagen: await reducir(f), passwordActual } })).mensaje); setPasswordActual(''); window.dispatchEvent(new Event('foto-actualizada')); }
    catch (x) { ui.toast(x.message, 'error'); }
  };
  const quitar = async () => {
    try { ui.toast((await api('/api/perfil/foto', { method: 'DELETE', body: { passwordActual } })).mensaje); setPasswordActual(''); window.dispatchEvent(new Event('foto-actualizada')); }
    catch (x) { ui.toast(x.message, 'error'); }
  };
  return (
    <section>
      <h2>Datos personales y entrega</h2>
      <p className="nota">Estos datos ayudan a identificar tu cuenta y preparar tus pedidos. Tu nombre visible y usuario de inicio se administran en “Acceso y seguridad”.</p>
      <form className="tarjeta" onSubmit={guardar}>
        <div className="foto-fila"><Avatar grande />
          <label className="btn suave archivo">Cambiar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={foto} aria-label="Elegir foto de perfil" /></label>
          <button type="button" className="btn suave" onClick={quitar}>Quitar foto</button></div>
        <p className="nota">Confirma tu contraseña actual para guardar cualquier cambio en este perfil.</p>
        <label className="campo">Contraseña actual<input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required autoComplete="current-password" /></label>
        <div className="rejilla dos" style={{ margin: 0 }}>
          <div>{campo('nombre', 'Nombre(s)', { required: true, maxLength: 60 })}{campo('apellidoPaterno', 'Apellido paterno', { required: true, maxLength: 60 })}{campo('apellidoMaterno', 'Apellido materno (opcional)', { maxLength: 60 })}</div>
          <div>{campo('telefono', 'Teléfono (10 dígitos)', { type: 'tel', maxLength: 20, inputMode: 'tel', pattern: '(\\+?52)?[0-9\\s()\\-]{10,18}', title: 'Escribe 10 dígitos; puedes agregar el prefijo +52.' })}
            {campo('fechaNacimiento', 'Fecha de nacimiento (opcional)', { type: 'date', max: fechaNacimientoMaxima() })}
            <label className="campo">Correo<input value={d.email} disabled /></label></div>
        </div>
        <label className="campo">Dirección de entrega (opcional)<textarea rows="2" maxLength="250" value={d.direccion} onChange={(e) => setD({ ...d, direccion: e.target.value })} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar mis datos'}</button>
      </form>
    </section>
  );
}

/** Genera un código de respaldo de un solo uso. Pide la contraseña actual. */
export function CodigoRecuperacion({ ui }) {
  const [pw, setPw] = useState('');
  const [codigo, setCodigo] = useState(null);
  const [busy, setBusy] = useState(false);
  const generar = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api('/api/auth/codigo-recuperacion', { method: 'POST', body: { passwordActual: pw } }); setCodigo(r.codigoRecuperacion); setPw(''); ui.toast(r.mensaje); }
    catch (x) { ui.toast(x.message, 'error'); }
    setBusy(false);
  };
  return (
    <form className="tarjeta" onSubmit={generar} style={{ marginTop: '1rem' }}>
      <h3>Código de recuperación</h3>
      <p className="nota">Si no puedes recibir el código por correo, este código de respaldo te permite recuperar la cuenta una vez. Generar uno nuevo invalida el anterior.</p>
      {codigo && <CodigoPanel codigo={codigo} />}
      <label className="campo">Tu contraseña actual<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" /></label>
      <button className="btn" disabled={busy}>{busy ? 'Generando…' : 'Generar código nuevo'}</button>
    </form>
  );
}
