import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { Pastel } from './Arte.jsx';
import './equipo.css';

const money = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const ETAPAS = [['PENDIENTE', 'Pendiente'], ['PREPARANDO', 'En preparación'], ['ENTREGADO', 'Entregado']];
const ROLES = { ROLE_ADMIN: 'Administración', ROLE_REPOSTERO: 'Repostero', ROLE_CLIENTE: 'Cliente', ROLE_USER: 'Consulta' };

function useCarga(ruta) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const cargar = useCallback(async () => { setErr(''); setD(null); try { setD(await api(ruta)); } catch (x) { setErr(x.message); } }, [ruta]);
  useEffect(() => { cargar(); }, [cargar]);
  return [d, err, cargar];
}
function Estado({ d, err, cargar, vacio, children }) {
  if (err) return <div className="vacio error">{err} <button className="btn suave" onClick={cargar}>Reintentar</button></div>;
  if (!d) return <div className="vacio">Cargando…</div>;
  return d.length === 0 ? <div className="vacio">{vacio}</div> : children;
}
const Banner = ({ icono, t, sub }) => (
  <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">{icono}</span><div className="tit"><h1>{t}</h1><p className="nota">{sub}</p></div></header>
);
function Etapas({ estado }) {
  if (estado === 'CANCELADO') return <span className="pildora CANCELADO">Cancelado</span>;
  const i = ETAPAS.findIndex(([k]) => k === estado);
  return (
    <div className="etapas" aria-label={`Etapa: ${ETAPAS[i][1]}`}>
      {ETAPAS.map(([k, l], n) => <Fragment key={k}>{n > 0 && <i />}<span className={n < i ? 'ok' : n === i ? 'aqui' : ''}>{l}</span></Fragment>)}
    </div>
  );
}

export function InicioChef({ p, ir }) {
  return (
    <section>
      <header className="hero"><Pastel className="hero-arte" /><div><h1>Hola, {p.nombre}</h1>
        <p className="nota">Tu perfil: <b>Repostero</b>. Aquí ves los pedidos de tus pasteles y en qué etapa va cada uno.</p></div></header>
      <div className="atajos">
        <button className="atajo" onClick={() => ir('chef')}><span aria-hidden="true">📋</span><b>Mis pedidos</b><small>Etapas y registro</small></button>
        <button className="atajo" onClick={() => ir('pasteles')}><span aria-hidden="true">🎂</span><b>Mis pasteles</b><small>Lo que se ha comprado</small></button>
      </div>
    </section>
  );
}

export function PedidosChef({ ui }) {
  const [filas, err, cargar] = useCarga('/api/chef/pedidos');
  const [abrir, setAbrir] = useState(false);
  const [mios, setMios] = useState([]);
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [cli, setCli] = useState(null);
  const [prod, setProd] = useState('');
  const [cant, setCant] = useState(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (abrir) api('/api/chef/productos').then(setMios).catch((x) => ui.toast(x.message, 'error')); }, [abrir]);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(() => api('/api/chef/clientes?q=' + encodeURIComponent(q.trim())).then(setRes).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [q]);
  const mover = async (id, estado) => {
    if (estado === 'CANCELADO' && !(await ui.confirm({ title: 'Cancelar pedido', peligro: 1, si: 'Sí, cancelar', text: `Se cancelará el pedido #${id}.` }))) return;
    try { ui.toast((await api(`/api/chef/pedidos/${id}/etapa`, { method: 'PATCH', body: { estado } })).mensaje); cargar(); } catch (x) { ui.toast(x.message, 'error'); }
  };
  const registrar = async (e) => {
    e.preventDefault();
    if (!cli) { ui.toast('Busca y elige al cliente.', 'error'); return; }
    setBusy(true);
    try {
      ui.toast((await api('/api/chef/pedidos', { method: 'POST', body: { clienteId: cli.id, productoId: Number(prod), cantidad: Number(cant) } })).mensaje);
      setAbrir(false); setCli(null); setQ(''); cargar();
    } catch (x) { ui.toast(x.message, 'error'); }
    setBusy(false);
  };
  return (
    <section>
      <Banner icono="📋" t="Mis pedidos" sub="Pedidos de tus pasteles y la etapa en que va cada uno." />
      <div className="acciones izq" style={{ marginTop: 0 }}><button className="btn" onClick={() => setAbrir(!abrir)}>{abrir ? 'Cerrar formulario' : 'Registrar un pedido'}</button></div>
      {abrir && (
        <form className="tarjeta formcard" onSubmit={registrar}>
          <h3>Registrar pedido</h3>
          <label className="campo">Cliente (escribe al menos 2 letras del nombre)<input value={q} onChange={(e) => { setQ(e.target.value); setCli(null); }} /></label>
          <div className="lista-sel">{res.map((c) => <button type="button" key={c.id} className={cli?.id === c.id ? 'sel' : ''} onClick={() => setCli(c)}>{c.nombre} (#{c.id})</button>)}</div>
          <label className="campo">Pastel<select value={prod} onChange={(e) => setProd(e.target.value)} required><option value="">Elige uno de tus pasteles…</option>{mios.map((m) => <option key={m.id} value={m.id}>{m.nombre} · {money(m.precio)}</option>)}</select></label>
          <label className="campo">Cantidad (1 a 1000)<input type="number" min="1" max="1000" value={cant} onChange={(e) => setCant(e.target.value)} required /></label>
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar pedido'}</button>
        </form>)}
      <Estado d={filas} err={err} cargar={cargar} vacio="Todavía no hay pedidos de tus pasteles.">
        <div className="kanban">{[['PENDIENTE', 'Por hacer'], ['PREPARANDO', 'En proceso'], ['ENTREGADO', 'Terminado']].map(([k, t]) => {
          const col = (filas || []).filter((r) => r.estado === k);
          return (
            <div className="col" key={k}><h3>{t}<span>{col.length}</span></h3>
              {col.length === 0 && <div className="vacio">Sin pedidos</div>}
              {col.map((r) => (
                <article className="orden" key={r.id}><b>#{r.id} · {r.producto}</b><span>{r.cliente} · {r.cantidad} pza · {money(r.total)}</span>
                  {k !== 'ENTREGADO' && <div className="acc">
                    {k === 'PENDIENTE' && <button className="btn mini" onClick={() => mover(r.id, 'PREPARANDO')}>Empezar</button>}
                    {k === 'PREPARANDO' && <button className="btn mini" onClick={() => mover(r.id, 'ENTREGADO')}>Terminar</button>}
                    <button className="btn mini peligro" onClick={() => mover(r.id, 'CANCELADO')}>Cancelar</button></div>}
                </article>))}
            </div>);
        })}</div>
      </Estado>
    </section>
  );
}

export function PastelesChef() {
  const [filas, err, cargar] = useCarga('/api/chef/mis-pasteles');
  return (
    <section>
      <Banner icono="🎂" t="Mis pasteles" sub="Los pasteles que preparas y cuántos se han comprado (sin contar pedidos cancelados)." />
      <Estado d={filas} err={err} cargar={cargar} vacio="Todavía no tienes pasteles asignados.">
        <div className="tabla"><table>
          <thead><tr><th>#</th><th>Pastel</th><th>Precio</th><th>Pedidos</th><th>Unidades</th></tr></thead>
          <tbody>{filas?.map((r) => <tr key={r.id}><td data-l="#">{r.id}</td><td data-l="Pastel">{r.nombre}</td><td data-l="Precio">{money(r.precio)}</td><td data-l="Pedidos">{r.pedidos}</td><td data-l="Unidades">{r.unidades}</td></tr>)}</tbody></table></div>
      </Estado>
    </section>
  );
}

export function Usuarios({ ui }) {
  const [filas, err, cargar] = useCarga('/api/admin/usuarios');
  const [reps, setReps] = useState([]);
  const [v, setV] = useState({ username: '', nombre: '', email: '', password: '', reposteroId: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/reposteros').then(setReps).catch(() => {}); }, []);
  const campo = (k, l, o = {}) => <label className="campo">{l}<input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} required {...o} /></label>;
  const crear = async (e) => {
    e.preventDefault(); setBusy(true);
    try { ui.toast((await api('/api/admin/usuarios/repostero', { method: 'POST', body: { ...v, reposteroId: Number(v.reposteroId) } })).mensaje); setV({ username: '', nombre: '', email: '', password: '', reposteroId: '' }); cargar(); }
    catch (x) { ui.toast(x.message, 'error'); }
    setBusy(false);
  };
  const activar = async (u, enabled) => { try { ui.toast((await api(`/api/admin/usuarios/${encodeURIComponent(u)}/activo`, { method: 'PATCH', body: { enabled } })).mensaje); cargar(); } catch (x) { ui.toast(x.message, 'error'); } };
  const revocar = async (u) => {
    if (!(await ui.confirm({ title: 'Cerrar sesiones', peligro: 1, si: 'Sí, cerrar sesiones', text: `Se cerrarán las sesiones de ${u} y deberá crear una contraseña nueva con “Olvidé mi contraseña” (necesita su correo).` }))) return;
    try { ui.toast((await api(`/api/admin/usuarios/${encodeURIComponent(u)}/revocar`, { method: 'POST' })).mensaje); } catch (x) { ui.toast(x.message, 'error'); }
  };
  return (
    <section>
      <Banner icono="👥" t="Usuarios" sub="Administra las cuentas. El registro público siempre crea clientes; las cuentas de repostero solo se crean aquí." />
      <form className="tarjeta formcard" onSubmit={crear}>
        <h3>Crear cuenta de repostero</h3>
        <div className="rejilla dos" style={{ margin: 0 }}>
          <div>{campo('username', 'Usuario', { minLength: 3, maxLength: 50, autoComplete: 'off' })}{campo('nombre', 'Nombre completo', { maxLength: 100 })}</div>
          <div>{campo('email', 'Correo', { type: 'email' })}{campo('password', 'Contraseña inicial (mínimo 12 caracteres)', { type: 'password', minLength: 12, autoComplete: 'new-password' })}</div>
        </div>
        <label className="campo">Repostero al que corresponde<select value={v.reposteroId} onChange={(e) => setV({ ...v, reposteroId: e.target.value })} required>
          <option value="">Elige…</option>{reps.map((r) => <option key={r.id} value={r.id}>#{r.id} {r.nombre} ({r.ciudad})</option>)}</select></label>
        <button className="btn" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <Estado d={filas} err={err} cargar={cargar} vacio="No hay usuarios.">
        <div className="tabla"><table>
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{filas?.map((u) => {
            const admin = u.roles.includes('ROLE_ADMIN');
            return (
              <tr key={u.username}><td data-l="Usuario">{u.username}</td><td data-l="Nombre">{u.nombre}</td><td data-l="Correo">{u.email || '—'}</td>
                <td data-l="Rol">{u.roles.split(',').map((r) => ROLES[r] || r).join(', ')}{u.repostero ? ` · ${u.repostero}` : ''}</td>
                <td data-l="Estado"><span className={'pildora ' + (u.enabled ? 'Activo' : 'Cancelado')}>{u.enabled ? 'Activa' : 'Desactivada'}</span></td>
                <td data-l="Acciones" className="fila-acc wrap">{!admin && <>
                  <button className="btn mini suave" onClick={() => activar(u.username, !u.enabled)}>{u.enabled ? 'Desactivar' : 'Activar'}</button>
                  <button className="btn mini peligro" onClick={() => revocar(u.username)}>Cerrar sesiones</button></>}</td></tr>);
          })}</tbody></table></div>
      </Estado>
    </section>
  );
}
