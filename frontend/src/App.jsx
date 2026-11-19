import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { api, login, setToken, hasToken, setExpiredHandler } from './api.js';
import Acceso from './Acceso.jsx';
import { Postre } from './Postres.jsx';
import { InicioCliente, InicioAdmin } from './Tienda.jsx';
import { Perfil, Avatar } from './Perfil.jsx';
import { PedidosChef, PastelesChef, InicioChef, Usuarios } from './Equipo.jsx';
import { Pastel, ICONO, emojiDe } from './Arte.jsx';

/* ───────── Avisos y confirmaciones ───────── */
const UI = createContext(null);
const useUI = () => useContext(UI);

function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [ask, setAsk] = useState(null);
  const toast = useCallback((text, tipo = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'error' ? 7000 : 4000);
  }, []);
  const confirm = useCallback((o) => new Promise((res) => setAsk({ ...o, res })), []);
  const close = (v) => { ask.res(v); setAsk(null); };
  return (
    <UI.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={'toast ' + t.tipo}>{t.text}</div>)}
      </div>
      {ask && <Confirm o={ask} onClose={close} />}
    </UI.Provider>
  );
}

function Confirm({ o, onClose }) {
  const [txt, setTxt] = useState('');
  const ok = !o.palabra || txt.trim().toUpperCase() === o.palabra;
  return (
    <Modal title={o.title} onClose={() => onClose(false)}>
      <p>{o.text}</p>
      {o.palabra && (
        <label className="campo">Para confirmar, escribe <b>{o.palabra}</b>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} autoFocus />
        </label>
      )}
      <div className="acciones">
        <button className="btn suave" onClick={() => onClose(false)}>No, volver</button>
        <button className={'btn ' + (o.peligro ? 'peligro' : '')} disabled={!ok} onClick={() => onClose(true)}>{o.si || 'Sí, continuar'}</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="velo" role="dialog" aria-modal="true" aria-label={title}>
      <div className="caja">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ───────── Entrada y sesión ───────── */
function Login({ onIn }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [vista, setVista] = useState('login');
  const enviar = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(u.trim(), p); await onIn(); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <main className="entrada">
      <section className="vitrina" aria-hidden="true">
        <Pastel className="vitrina-arte" />
        <h2>Repostería artesanal<br />con carácter</h2>
        <p>🍓 🥐 🍪 🍩 🧁</p>
        <Instalar />
      </section>
      {vista !== 'login' ? <Acceso vista={vista} ir={setVista} /> : <form className="ticket" onSubmit={enviar}>
        <div className="logo" aria-hidden="true">🧁</div>
        <h1>Bienvenido a Sweet Rebel</h1>
        <p className="sub">Entra para ver el catálogo y los pedidos.</p>
        <label className="campo">Usuario<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required autoFocus /></label>
        <label className="campo">Contraseña<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn grande" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <div className="enlaces">
          <button type="button" className="lnk" onClick={() => setVista('registro')}>Crear cuenta nueva</button>
          <button type="button" className="lnk" onClick={() => setVista('recuperar')}>¿Olvidaste tu usuario o contraseña?</button>
          <p className="nota" style={{ textAlign: 'center', marginTop: '.6rem' }}>¿Eres repostero? Tu cuenta la crea la administración de Sweet Rebel: entra con el usuario y la contraseña que te dieron.</p>
        </div>
      </form>}
    </main>
  );
}

function ReLogin({ user, onDone, onExit }) {
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ir = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await login(user, p); onDone(); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title="Tu sesión terminó">
      <form onSubmit={ir}>
        <p>Por seguridad la sesión dura una hora. Escribe tu contraseña para seguir: <b>no perderás lo que estabas haciendo</b>.</p>
        <p className="nota">Usuario: <b>{user}</b></p>
        <label className="campo">Contraseña<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoFocus required /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="acciones">
          <button type="button" className="btn suave" onClick={onExit}>Salir</button>
          <button className="btn" disabled={busy}>{busy ? 'Reconectando…' : 'Continuar'}</button>
        </div>
      </form>
    </Modal>
  );
}

const rolDe = (roles) => (roles.includes('ROLE_ADMIN') ? 'admin' : roles.includes('ROLE_REPOSTERO') ? 'repostero' : roles.includes('ROLE_USER') ? 'consulta' : 'cliente');
const ETIQUETA = { admin: 'Administración', consulta: 'Solo consulta', cliente: 'Cliente', repostero: 'Repostero' };

/* ───────── Datos de apoyo (nombres junto a los números) ───────── */
const memo = {};
const NOMBRE = {
  reposteros: (r) => `${r.nombre} (${r.ciudad})`,
  categorias: (c) => c.nombre,
  clientes: (c) => c.nombre,
  productos: (p) => `${p.nombre} · ${money(p.precio)}`,
};
const money = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
function useLookup(ref) {
  const [m, setM] = useState(memo[ref] || null);
  useEffect(() => {
    if (!ref || memo[ref]) return;
    api('/api/' + ref).then((l) => { memo[ref] = new Map(l.map((x) => [x.id, x])); setM(memo[ref]); }).catch(() => {});
  }, [ref]);
  return m;
}

/* ───────── Listas con CRUD ───────── */
const estadoCli = (c) => (c.cancelado ? 'Cancelado' : c.oposicion ? 'Se opone' : 'Activo');
const RES = {
  productos: {
    t: 'Productos', uno: 'producto', solo: 'Pasteles y postres a la venta.',
    campos: [
      { k: 'nombre', l: 'Nombre', req: 1 },
      { k: 'descripcion', l: 'Descripción', tipo: 'area' },
      { k: 'precio', l: 'Precio (MXN)', tipo: 'num', step: '0.01', req: 1 },
      { k: 'reposteroId', l: 'Número del repostero', tipo: 'ref', ref: 'reposteros', req: 1 },
      { k: 'categoriaId', l: 'Número del tipo de postre', tipo: 'ref', ref: 'categorias', req: 1 },
    ],
    cols: [['#', (r) => r.id], ['Producto', (r) => <span className="prod"><Postre id={r.id} nombre={r.nombre} />{r.nombre}</span>], ['Precio', (r) => money(r.precio)],
      ['Repostero', (r) => r.repostero?.nombre], ['Categoría', (r) => r.categoria?.nombre]],
    aForm: (r) => ({ nombre: r.nombre, descripcion: r.descripcion || '', precio: r.precio, reposteroId: r.repostero?.id ?? '', categoriaId: r.categoria?.id ?? '' }),
  },
  categorias: {
    t: 'Tipos de postre', uno: 'tipo de postre', solo: 'Así se agrupan los productos del catálogo: tartas, galletas, pan dulce…',
    campos: [{ k: 'nombre', l: 'Nombre del tipo (por ejemplo: Tartas)', req: 1 }],
    cols: [['#', (r) => r.id], ['Tipo de postre', (r) => <span className="prod"><Postre nombre={r.nombre} />{r.nombre}</span>]],
    aForm: (r) => ({ nombre: r.nombre }),
  },
  reposteros: {
    t: 'Reposteros', uno: 'repostero', solo: 'Las personas que preparan los productos.',
    campos: [{ k: 'nombre', l: 'Nombre', req: 1 }, { k: 'ciudad', l: 'Ciudad', req: 1 }],
    cols: [['#', (r) => r.id], ['Nombre', (r) => r.nombre], ['Ciudad', (r) => r.ciudad]],
    aForm: (r) => ({ nombre: r.nombre, ciudad: r.ciudad }),
    extra: {
      l: 'Oposición',
      hacer: async (r, ui) => {
        const si = await ui.confirm({ title: 'Registrar oposición', peligro: 1, si: 'Registrar oposición',
          text: `${r.nombre} dejará de aparecer en el catálogo y sus datos se ocultarán. Desde esta pantalla no se puede deshacer.` });
        if (!si) return false;
        const x = await api(`/api/reposteros/${r.id}/oposicion`, { method: 'PATCH' });
        ui.toast(x.mensaje); return true;
      },
    },
  },
  clientes: {
    t: 'Clientes', uno: 'cliente', solo: 'Personas que hacen pedidos.', admin: 1,
    campos: [{ k: 'nombre', l: 'Nombre', req: 1 }, { k: 'email', l: 'Correo', tipo: 'email', req: 1 }, { k: 'telefono', l: 'Teléfono' }],
    cols: [['#', (r) => r.id], ['Nombre', (r) => r.nombre], ['Correo', (r) => r.email], ['Teléfono', (r) => r.telefono || '—'], ['Estado', (r) => <span className={'pildora ' + estadoCli(r)}>{estadoCli(r)}</span>]],
    aForm: (r) => ({ nombre: r.nombre, email: r.email, telefono: r.telefono || '' }),
    bloqueaEditar: (r) => r.cancelado,
  },
  pedidos: {
    t: 'Pedidos', uno: 'pedido', solo: 'Lo que cada cliente encargó. El total se calcula solo.', admin: 1,
    campos: [
      { k: 'clienteId', l: 'Número del cliente', tipo: 'ref', ref: 'clientes', req: 1 },
      { k: 'productoId', l: 'Número del producto', tipo: 'ref', ref: 'productos', req: 1 },
      { k: 'cantidad', l: 'Cantidad (1 a 1000)', tipo: 'num', min: 1, max: 1000, req: 1 },
      { k: 'estado', l: 'Estado', tipo: 'sel', op: ['PENDIENTE', 'PREPARANDO', 'ENTREGADO', 'CANCELADO'], req: 1 },
    ],
    cols: [['#', (r) => r.id], ['Cliente', (r) => r.cliente?.nombre], ['Producto', (r) => r.producto?.nombre], ['Cant.', (r) => r.cantidad],
      ['Total', (r) => money(r.total)], ['Estado', (r) => <span className={'pildora ' + r.estado}>{r.estado.toLowerCase()}</span>],
      ['Fecha', (r) => new Date(r.fechaPedido).toLocaleDateString('es-MX')]],
    aForm: (r) => ({ clienteId: r.cliente?.id, productoId: r.producto?.id, cantidad: r.cantidad, estado: r.estado }),
  },
};

function RefInput({ f, v, set }) {
  const m = useLookup(f.ref);
  const it = m && v !== '' ? m.get(Number(v)) : null;
  return (
    <>
      <input type="number" min="1" value={v} onChange={(e) => set(e.target.value)} required={!!f.req} />
      <small className={it ? 'ok' : 'nota'}>{v === '' ? 'Escribe el número que aparece en la lista.' : it ? '→ ' + NOMBRE[f.ref](it) : m ? 'Ese número no existe.' : 'Buscando…'}</small>
    </>
  );
}

function FormModal({ cfg, fila, onClose, onSaved }) {
  const ui = useUI();
  const [v, setV] = useState(() => (fila ? cfg.aForm(fila) : Object.fromEntries(cfg.campos.map((c) => [c.k, c.tipo === 'sel' ? c.op[0] : '']))));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const guardar = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const body = {};
    cfg.campos.forEach((c) => { body[c.k] = ['num', 'ref'].includes(c.tipo) ? Number(v[c.k]) : v[c.k]; });
    try {
      await api(`/api/${cfg.path}${fila ? '/' + fila.id : ''}`, { method: fila ? 'PUT' : 'POST', body });
      ui.toast(fila ? `Listo: se guardaron los cambios del ${cfg.uno}.` : `Listo: se agregó el ${cfg.uno}.`);
      onSaved();
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title={fila ? `Editar ${cfg.uno}` : `Agregar ${cfg.uno}`} onClose={onClose}>
      <form onSubmit={guardar}>
        {cfg.campos.map((c) => (
          <label className="campo" key={c.k}>{c.l}
            {c.tipo === 'area' ? <textarea rows="3" maxLength="300" value={v[c.k]} onChange={(e) => setV({ ...v, [c.k]: e.target.value })} />
              : c.tipo === 'sel' ? <select value={v[c.k]} onChange={(e) => setV({ ...v, [c.k]: e.target.value })}>{c.op.map((o) => <option key={o}>{o}</option>)}</select>
              : c.tipo === 'ref' ? <RefInput f={c} v={v[c.k]} set={(x) => setV({ ...v, [c.k]: x })} />
              : <input type={c.tipo === 'num' ? 'number' : c.tipo || 'text'} step={c.step} min={c.min} max={c.max} value={v[c.k]}
                  onChange={(e) => setV({ ...v, [c.k]: e.target.value })} required={!!c.req} />}
          </label>
        ))}
        {err && <p className="error" role="alert">{err}</p>}
        <div className="acciones">
          <button type="button" className="btn suave" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

const POR_PAGINA = 12;
function Lista({ nombre, role }) {
  const cfg = { ...RES[nombre], path: nombre };
  const ui = useUI();
  const admin = role === 'admin';
  const [filas, setFilas] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [pag, setPag] = useState(0);
  const [form, setForm] = useState(null);
  const [compra, setCompra] = useState(null);
  const puedeComprar = nombre === 'productos' && (role === 'admin' || role === 'cliente');
  const cargar = useCallback(async () => {
    setErr(''); setFilas(null);
    try { setFilas(await api('/api/' + nombre)); delete memo[nombre]; } catch (x) { setErr(x.message); }
  }, [nombre]);
  useEffect(() => { cargar(); setPag(0); setQ(''); }, [cargar]);
  const textos = useMemo(() => (filas || []).map((r) => JSON.stringify(r).toLowerCase()), [filas]);
  const vis = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? (filas || []).filter((_, i) => textos[i].includes(k)) : filas || [];
  }, [filas, textos, q]);
  const paginas = Math.max(1, Math.ceil(vis.length / POR_PAGINA));
  const pagina = vis.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);

  const borrar = async (r) => {
    const si = await ui.confirm({ title: `Eliminar ${cfg.uno}`, peligro: 1, si: 'Sí, eliminar', text: `Se borrará el ${cfg.uno} #${r.id}. Esto no se puede deshacer.` });
    if (!si) return;
    try { await api(`/api/${nombre}/${r.id}`, { method: 'DELETE' }); ui.toast(`Listo: se eliminó el ${cfg.uno} #${r.id}.`); cargar(); }
    catch (x) { ui.toast(x.message, 'error'); }
  };
  const extra = async (r) => { try { if (await cfg.extra.hacer(r, ui)) cargar(); } catch (x) { ui.toast(x.message, 'error'); } };

  return (
    <section className={'vista-' + nombre}>
      <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">{ICONO[nombre]}</span>
        <div className="tit"><h1>{cfg.t}</h1><p className="nota">{cfg.solo} {admin ? 'Puedes agregar, ver, corregir y eliminar.' : 'Solo puedes verlos: tu usuario no puede cambiar nada.'}</p></div>
        {admin && <button className="btn" onClick={() => setForm({})}>Agregar {cfg.uno}</button>}
      </header>
      <div className="barra">
        <input type="search" placeholder={`Buscar en ${cfg.t.toLowerCase()}…`} value={q} onChange={(e) => { setQ(e.target.value); setPag(0); }} aria-label="Buscar" />
        {filas && <span className="nota">{vis.length.toLocaleString('es-MX')} resultados</span>}
      </div>
      {err && <div className="vacio error">{err} <button className="btn suave" onClick={cargar}>Reintentar</button></div>}
      {!err && !filas && <div className="vacio">Horneando la lista…</div>}
      {filas && (vis.length === 0
        ? <div className="vacio">{q ? 'Nada coincide con tu búsqueda.' : `Todavía no hay ${cfg.t.toLowerCase()}.` }</div>
        : <div className="tabla"><table>
          <thead><tr>{cfg.cols.map(([h]) => <th key={h}>{h}</th>)}{admin && <th>Acciones</th>}{puedeComprar && <th>Comprar</th>}</tr></thead>
          <tbody>{pagina.map((r) => (
            <tr key={r.id}>
              {cfg.cols.map(([h, f]) => <td key={h} data-l={h}>{f(r)}</td>)}
              {admin && <td data-l="Acciones" className="fila-acc">
                <button className="btn mini suave" disabled={cfg.bloqueaEditar?.(r)} onClick={() => setForm(r)}>Editar</button>
                {cfg.extra && <button className="btn mini suave" onClick={() => extra(r)}>{cfg.extra.l}</button>}
                <button className="btn mini peligro" onClick={() => borrar(r)}>Eliminar</button>
              </td>}
              {puedeComprar && <td data-l="Comprar"><button className="btn mini" onClick={() => setCompra(r)}>Comprar</button></td>}
            </tr>))}</tbody></table></div>)}
      {filas && vis.length > POR_PAGINA && (
        <nav className="pag" aria-label="Páginas">
          <button className="btn suave" disabled={pag === 0} onClick={() => setPag(pag - 1)}>Anterior</button>
          <span>Página {pag + 1} de {paginas}</span>
          <button className="btn suave" disabled={pag + 1 >= paginas} onClick={() => setPag(pag + 1)}>Siguiente</button>
        </nav>)}
      {compra && <Comprar producto={compra} onClose={() => setCompra(null)} />}
      {form && <FormModal cfg={cfg} fila={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); cargar(); }} />}
    </section>
  );
}

/* ───────── Derechos ARCO ───────── */
const ARCO = [
  ['Acceso', 'Saber qué datos tuyos guarda Sweet Rebel.'],
  ['Rectificación', 'Corregir tus datos si están mal o cambiaron.'],
  ['Cancelación', 'Pedir que tus datos se borren. Aquí se vuelven anónimos; los pedidos se conservan sin tu nombre.'],
  ['Oposición', 'Pedir que no se usen tus datos: se detiene la creación de pedidos nuevos a tu nombre.'],
];
function MisDatos({ onCambio }) {
  const ui = useUI();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const cargar = useCallback(async () => {
    setErr(null);
    try { setD(await api('/api/arco/mis-datos')); } catch (x) { setErr(x); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  if (err) return err.status === 404
    ? <div className="vacio">Esta cuenta todavía no está vinculada a un registro de cliente, por eso no hay datos personales que consultar o modificar aquí.</div>
    : <div className="vacio error">{err.message} <button className="btn suave" onClick={cargar}>Reintentar</button></div>;
  if (!d) return <div className="vacio">Buscando tus datos…</div>;
  const accion = async (fn) => { setBusy(true); try { await fn(); await cargar(); onCambio?.(); } catch (x) { ui.toast(x.message, 'error'); } setBusy(false); };
  const rectificar = (e) => { e.preventDefault(); accion(async () => { await api('/api/arco/rectificacion', { method: 'PUT', body: edit }); ui.toast('Listo: tus datos fueron corregidos.'); setEdit(null); }); };
  const oponer = async () => {
    if (!(await ui.confirm({ title: 'Registrar oposición', peligro: 1, si: 'Registrar oposición', text: 'Ya no se podrán crear pedidos nuevos a tu nombre. Esta acción no se puede deshacer desde aquí.' }))) return;
    accion(async () => ui.toast((await api('/api/arco/oposicion', { method: 'PATCH' })).mensaje));
  };
  const cancelar = async () => {
    if (!(await ui.confirm({ title: 'Cancelar mis datos', peligro: 1, palabra: 'CANCELAR', si: 'Cancelar mis datos', text: 'Tu nombre, correo y teléfono se reemplazarán por datos anónimos y no podrás modificarlos. Es definitivo.' }))) return;
    accion(async () => ui.toast((await api('/api/arco/cancelacion', { method: 'DELETE' })).mensaje));
  };
  return (
    <div className="ficha">
      <dl>
        <dt>Nombre</dt><dd>{d.nombre}</dd><dt>Correo</dt><dd>{d.email}</dd><dt>Teléfono</dt><dd>{d.telefono || '—'}</dd>
        <dt>Estado</dt><dd><span className={'pildora ' + estadoCli(d)}>{estadoCli(d)}</span></dd>
      </dl>
      {d.cancelado ? <p className="nota">Estos datos ya fueron cancelados: no se pueden modificar.</p> : edit ? (
        <form onSubmit={rectificar}>
          {[['nombre', 'Nombre'], ['email', 'Correo'], ['telefono', 'Teléfono']].map(([k, l]) => (
            <label className="campo" key={k}>{l}<input value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} required={k !== 'telefono'} /></label>))}
          <div className="acciones"><button type="button" className="btn suave" onClick={() => setEdit(null)}>Cancelar</button><button className="btn" disabled={busy}>Guardar corrección</button></div>
        </form>
      ) : (
        <div className="acciones izq">
          <button className="btn suave" onClick={() => setEdit({ nombre: d.nombre, email: d.email, telefono: d.telefono || '' })}>Corregir mis datos</button>
          <button className="btn suave" disabled={busy || d.oposicion} onClick={oponer}>{d.oposicion ? 'Oposición ya registrada' : 'Oponerme al uso'}</button>
          <button className="btn peligro" disabled={busy} onClick={cancelar}>Cancelar mis datos</button>
        </div>)}
    </div>
  );
}

function Privacidad({ role, ir }) {
  return (
    <section>
      <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">{ICONO.privacidad}</span><div className="tit"><h1>Privacidad y derechos ARCO</h1>
        <p className="nota">La ley te da cuatro derechos sobre tus datos personales. Sus iniciales forman la palabra ARCO.</p></div></header>
      <div className="rejilla">
        {ARCO.map(([t, d]) => <article className="tarjeta" key={t}><h3>{t}</h3><p>{d}</p></article>)}
      </div>
      <p className="nota"><a href="/aviso-privacidad.html" target="_blank" rel="noreferrer">Leer el aviso de privacidad completo</a></p>
      {role === 'consulta' && <div className="vacio">Tu usuario es de solo consulta, por eso aquí no se pueden usar los derechos ARCO. Si necesitas ejercerlos, pide ayuda a quien administra la pastelería.</div>}
      {role !== 'consulta' && <><h2>Mis datos personales</h2><MisDatos /></>}
      {role === 'admin' && (
        <>
          <h2>Atender solicitudes de otras personas</h2>
          <p className="nota">Cada derecho se atiende desde las listas de Sweet Rebel:</p>
          <div className="rejilla">
            <article className="tarjeta"><h3>Acceso</h3><p>Busca a la persona en Clientes y consulta sus datos.</p><button className="btn suave" onClick={() => ir('clientes')}>Ir a Clientes</button></article>
            <article className="tarjeta"><h3>Rectificación</h3><p>En Clientes, usa “Editar” para corregir sus datos.</p><button className="btn suave" onClick={() => ir('clientes')}>Ir a Clientes</button></article>
            <article className="tarjeta"><h3>Oposición</h3><p>Disponible para reposteros: dejan de aparecer en el catálogo.</p><button className="btn suave" onClick={() => ir('reposteros')}>Ir a Reposteros</button></article>
            <article className="tarjeta"><h3>Cancelación</h3><p>Se elimina un cliente solo si no tiene pedidos; si los tiene, la persona debe cancelar sus propios datos desde su cuenta.</p></article>
          </div>
        </>)}
    </section>
  );
}

/* ───────── Inicio y cuenta ───────── */
function Inicio({ p, role, ir }) {
  return (
    <section>
      <header className="hero"><Pastel className="hero-arte" /><div><h1>Hola, {p.nombre}</h1><p className="nota">Tu perfil: <b>{ETIQUETA[role]}</b>. {role === 'admin' ? 'Puedes agregar, ver, corregir y eliminar todo.' : role === 'cliente' ? 'Puedes ver el catálogo y hacer tus compras.' : 'Puedes consultar el catálogo sin cambiar nada.'}</p></div></header>
      <div className="atajos">{[['productos','Productos','Lo que hay en la vitrina'],['categorias','Tipos de postre','Cómo se agrupan los productos'],...(role !== 'cliente' ? [['reposteros','Reposteros','Quién los prepara']] : []),...(role === 'admin' ? [['clientes','Clientes','Quién compra'],['pedidos','Pedidos','Lo que se encargó']] : []),...(role === 'admin' ? [['privacidad','Privacidad','Derechos ARCO']] : [['encuesta','Encuesta','Cuéntanos tu opinión']])].map(([k,l,d]) => <button key={k} className="atajo" onClick={() => ir(k)}><span aria-hidden="true">{ICONO[k]}</span><b>{l}</b><small>{d}</small></button>)}</div>
      {role === 'admin' && <div className="rejilla dos">
        <article className="tarjeta">
          <h3>🔖 ¿Qué es un CRUD?</h3>
          <p>Es el cuaderno de recetas de cualquier sistema: las cuatro cosas que se hacen con una lista de datos.</p>
          <ul className="crud">
            <li><b>Crear</b> agregar algo nuevo, como un pastel al catálogo.</li>
            <li><b>Leer</b> ver lo que ya existe.</li>
            <li><b>Actualizar</b> corregir un dato, como un precio.</li>
            <li><b>Eliminar</b> quitar algo que ya no se usa.</li>
          </ul>
          <p className="nota">{role === 'admin' ? 'Con tu perfil puedes hacer las cuatro.' : 'Con tu perfil solo puedes “Leer”.'}</p>
        </article>
        <article className="tarjeta">
          <h3>🔐 ¿Qué son los derechos ARCO?</h3>
          <p>Son los cuatro derechos que tiene cualquier persona sobre sus datos personales (nombre, correo, teléfono):</p>
          <ul className="crud">{ARCO.map(([t, d]) => <li key={t}><b>{t}</b> {d.split('.')[0].toLowerCase()}.</li>)}</ul>
          <button className="btn suave" onClick={() => ir('privacidad')}>Ver más</button>
        </article>
      </div>}
    </section>
  );
}

function Cuenta({ p, salir, recargar }) {
  const ui = useUI();
  const [n, setN] = useState(p.nombre);
  const [pw, setPw] = useState({ passwordActual: '', passwordNueva: '' });
  const [us, setUs] = useState({ usernameNuevo: '', passwordActual: '' });
  const [err, setErr] = useState({});
  const run = (clave, fn) => async (e) => {
    e.preventDefault(); setErr({});
    try { await fn(); } catch (x) { setErr({ [clave]: x.message }); }
  };
  return (
    <section>
      <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">{ICONO.cuenta}</span><div className="tit"><h1>Mi cuenta</h1><p className="nota">Usuario actual: <b>{p.username}</b></p></div></header>
      <div className="rejilla dos">
        <form className="tarjeta" onSubmit={run('n', async () => { await api('/api/auth/perfil', { method: 'PUT', body: { nombre: n } }); ui.toast('Listo: tu nombre se actualizó.'); recargar(); })}>
          <h3>Mi nombre</h3>
          <label className="campo">Nombre que se muestra<input value={n} maxLength="100" onChange={(e) => setN(e.target.value)} required /></label>
          {err.n && <p className="error" role="alert">{err.n}</p>}<button className="btn">Guardar nombre</button>
        </form>
        <form className="tarjeta" onSubmit={run('p', async () => { await api('/api/auth/cambiar-password', { method: 'PUT', body: pw }); ui.toast('Contraseña cambiada. Entra de nuevo con la nueva.'); salir(); })}>
          <h3>Cambiar contraseña</h3>
          <label className="campo">Contraseña actual<input type="password" value={pw.passwordActual} onChange={(e) => setPw({ ...pw, passwordActual: e.target.value })} required /></label>
          <label className="campo">Contraseña nueva (mínimo 12 caracteres)<input type="password" minLength="12" value={pw.passwordNueva} onChange={(e) => setPw({ ...pw, passwordNueva: e.target.value })} required /></label>
          {err.p && <p className="error" role="alert">{err.p}</p>}<button className="btn">Cambiar contraseña</button>
        </form>
        <form className="tarjeta" onSubmit={run('u', async () => { await api('/api/auth/cambiar-usuario', { method: 'PUT', body: us }); ui.toast('Usuario cambiado. Entra de nuevo con el nuevo.'); salir(); })}>
          <h3>Cambiar nombre de usuario</h3>
          <label className="campo">Usuario nuevo<input value={us.usernameNuevo} onChange={(e) => setUs({ ...us, usernameNuevo: e.target.value })} required /></label>
          <label className="campo">Contraseña actual<input type="password" value={us.passwordActual} onChange={(e) => setUs({ ...us, passwordActual: e.target.value })} required /></label>
          {err.u && <p className="error" role="alert">{err.u}</p>}<button className="btn">Cambiar usuario</button>
        </form>
      </div>
    </section>
  );
}

/* ───────── Estructura ───────── */
function Panel({ p, salir, recargar }) {
  const role = rolDe(p.roles);
  const [pag, setPag] = useState('inicio');
  const [expira, setExpira] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const resolver = useRef(null);
  const ui = useUI();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('pago') && q.get('tx')) {
      window.history.replaceState({}, '', window.location.pathname);
      if (q.get('pago') === 'ok') api(`/api/compras/${q.get('tx')}/capturar`, { method: 'POST', body: {} }).then((r) => { ui.toast(r.mensaje); setPag('compras'); }).catch((x) => ui.toast(x.message, 'error'));
      else ui.toast('Cancelaste el pago. No se hizo ningún cobro.', 'error');
    }
  }, []);
  useEffect(() => {
    setExpiredHandler(() => new Promise((ok, no) => { resolver.current = { ok, no }; setExpira(true); }));
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { setExpiredHandler(null); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const menu = role === 'repostero' ? [['inicio', 'Inicio'], ['chef', 'Mis pedidos'], ['pasteles', 'Mis pasteles'], ['encuesta', role === 'admin' ? 'Opiniones' : 'Encuesta'], ['cuenta', 'Mi cuenta']] : [['inicio', 'Inicio'], ['productos', 'Productos'], ['categorias', 'Tipos de postre'], ...(role !== 'cliente' ? [['reposteros', 'Reposteros']] : []),
    ...(role === 'admin' ? [['clientes', 'Clientes'], ['pedidos', 'Pedidos']] : []), ...(role === 'admin' || role === 'cliente' ? [['compras', 'Mis compras']] : []), ...(role === 'admin' ? [['usuarios', 'Usuarios'], ['privacidad', 'Privacidad']] : []), ['encuesta', role === 'admin' ? 'Opiniones' : 'Encuesta'], ['cuenta', 'Mi cuenta']];
  return (
    <div className="app" data-rol={role}>
      <header className="tope">
        <div className="toldo" aria-hidden="true" />
        <div className="fila-tope">
          <div className="marca"><span className="sello" aria-hidden="true">🧁</span><span>Sweet Rebel<small>Repostería artesanal</small></span></div>
          <Instalar />
          <Avatar />
          <span className="rol">{ETIQUETA[role]}</span>
          <button className="btn suave mini" onClick={salir}>Salir</button>
        </div>
      </header>
      <nav className="menu" aria-label="Secciones">
        {menu.map(([k, l]) => <button key={k} className={pag === k ? 'on' : ''} aria-current={pag === k} onClick={() => setPag(k)}><span aria-hidden="true">{ICONO[k]}</span>{l}</button>)}
      </nav>
      {offline && <div className="aviso" role="alert">Sin internet. Cuando vuelva la conexión, podrás reintentar lo que estabas haciendo.</div>}
      <main className="contenido">
        {pag === 'inicio' && (role === 'repostero' ? <InicioChef p={p} ir={setPag} /> : (role === 'admin' ? <InicioAdmin p={p} ir={setPag} /> : <InicioCliente p={p} ir={setPag} />))}
        {RES[pag] && <Lista key={pag} nombre={pag} role={role} />}
        {pag === 'compras' && <Compras role={role} />}
        {pag === 'encuesta' && <Encuesta role={role} />}
        {pag === 'chef' && role === 'repostero' && <PedidosChef ui={ui} />}
        {pag === 'pasteles' && role === 'repostero' && <PastelesChef />}
        {pag === 'usuarios' && role === 'admin' && <Usuarios ui={ui} />}
        {pag === 'privacidad' && role === 'admin' && <Privacidad role={role} ir={setPag} />}
        {pag === 'cuenta' && <><Cuenta p={p} salir={salir} recargar={recargar} /><Perfil ui={ui} /></>}
      </main>
      <footer className="pie">Proyecto escolar: no se realizan cobros reales · Tus datos se tratan según el <a href="/aviso-privacidad.html" target="_blank" rel="noreferrer">aviso de privacidad</a></footer>
      {expira && <ReLogin user={p.username} onDone={() => { setExpira(null); resolver.current.ok(); }} onExit={() => { resolver.current.no(new Error('Sesión cerrada')); salir(); }} />}
    </div>
  );
}

export default function App() {
  const [p, setP] = useState(null);
  const [listo, setListo] = useState(!hasToken());
  const cargar = useCallback(async () => { setP(await api('/api/auth/perfil')); }, []);
  useEffect(() => { if (hasToken()) cargar().catch(() => setToken('')).finally(() => setListo(true)); }, [cargar]);
  const salir = () => { window.caches?.delete('api-catalogo'); setToken(''); Object.keys(memo).forEach((k) => delete memo[k]); setP(null); };
  if (!listo) return <div className="vacio">Abriendo Sweet Rebel…</div>;
  return <UIProvider>{p ? <Panel p={p} salir={salir} recargar={cargar} /> : <Login onIn={cargar} />}</UIProvider>;
}


/* ───────── Compras y pagos (PayPal) ───────── */
const ESTADO_COMPRA = { PENDIENTE: 'Pendiente', PAGADA: 'Pagada', FALLIDA: 'Fallida', REEMBOLSADA: 'Reembolsada' };

const METODOS = [['PAYPAL', 'PayPal', '🅿️'], ['STRIPE', 'Tarjeta (Stripe)', '💳'], ['MERCADOPAGO', 'Mercado Pago', '🤝'], ['OXXO', 'Efectivo en OXXO', '🏪']];

/* PAGOS SIMULADOS. Aquí NO se cobra nada ni se envían datos de tarjeta.
   Integración real: PayPal ya está en el backend (PayPalService, PAYPAL_MODE=sandbox|live);
   Stripe (Payment Intents), Mercado Pago (Checkout Pro) y OXXO (referencia vía pasarela) se conectarían
   en ComprasController.crear/capturar, sustituyendo el bloque "SIM-". */
function Comprar({ producto, onClose }) {
  const ui = useUI();
  const [cant, setCant] = useState(1);
  const [metodo, setMetodo] = useState('PAYPAL');
  const [tx, setTx] = useState(null);
  const [rechazo, setRechazo] = useState(false);
  const [mp, setMp] = useState('cuenta');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const iniciar = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await api('/api/compras', { method: 'POST', body: { productoId: producto.id, cantidad: Number(cant), metodo } });
      if (r.aprobarUrl) { window.location.href = r.aprobarUrl; return; }   // PayPal sandbox/live
      setTx(r);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const pagar = async (e) => {
    e?.preventDefault(); setBusy(true); setErr('');
    try { const r = await api(`/api/compras/${tx.transaccionId}/capturar`, { method: 'POST', body: { simularRechazo: rechazo } }); ui.toast(r.mensaje); onClose(); }
    catch (x) { setErr(x.message); setTx(null); }
    setBusy(false);
  };
  const nombreMetodo = METODOS.find((m) => m[0] === metodo)[1];
  return (
    <Modal title={`Comprar: ${producto.nombre}`} onClose={onClose}>
      {!tx ? (
        <form onSubmit={iniciar}>
          <p>Precio por pieza: <b>{money(producto.precio)}</b></p>
          <label className="campo">Cantidad (1 a 1000)<input type="number" min="1" max="1000" value={cant} onChange={(e) => setCant(e.target.value)} required /></label>
          <p>Total: <b>{money(Number(producto.precio) * (Number(cant) || 0))}</b></p>
          <div className="metodos" role="radiogroup" aria-label="Método de pago">
            {METODOS.map(([k, l, ic]) => <label key={k} className={metodo === k ? 'sel' : ''}><input type="radio" name="metodo" checked={metodo === k} onChange={() => setMetodo(k)} /><span aria-hidden="true">{ic}</span>{l}</label>)}
          </div>
          {err && <p className="error" role="alert">{err}</p>}
          <div className="acciones"><button type="button" className="btn suave" onClick={onClose}>Cancelar</button><button className="btn" disabled={busy}>{busy ? 'Preparando…' : 'Continuar'}</button></div>
        </form>
      ) : (
        <form onSubmit={pagar}>
          <h3>{nombreMetodo} · {money(tx.monto)}</h3>
          {metodo === 'PAYPAL' && <p>Pagarás con tu saldo o tarjeta vinculada a PayPal.</p>}
          {metodo === 'STRIPE' && <>
            <label className="campo">Nombre en la tarjeta<input placeholder="Como aparece en la tarjeta" autoComplete="off" required /></label>
            <label className="campo">Número de tarjeta<input inputMode="numeric" placeholder="0000 0000 0000 0000" autoComplete="off" maxLength="19" required /></label>
            <div className="dos-col"><label className="campo">Vence<input placeholder="MM/AA" maxLength="5" required /></label><label className="campo">CVC<input inputMode="numeric" placeholder="123" maxLength="4" required /></label></div></>}
          {metodo === 'MERCADOPAGO' && <div className="metodos">{[['cuenta', 'Dinero en cuenta'], ['tarjeta', 'Tarjeta guardada'], ['msi', '3 meses sin intereses']].map(([k, l]) => <label key={k} className={mp === k ? 'sel' : ''}><input type="radio" name="mp" checked={mp === k} onChange={() => setMp(k)} />{l}</label>)}</div>}
          {metodo === 'OXXO' && <div className="ficha-oxxo"><p className="nota">Referencia de pago (de práctica)</p><div className="ref">{('9' + String(tx.transaccionId).padStart(13, '0')).replace(/(.{4})/g, '$1 ').trim()}</div>
            <p>Monto: <b>{money(tx.monto)}</b> · Vigencia: 72 horas</p><p className="nota">Presenta esta referencia en cualquier tienda OXXO. Cuando pagues, confirma aquí.</p></div>}
          {err && <p className="error" role="alert">{err}</p>}
          <div className="acciones"><button type="button" className="btn suave" onClick={onClose}>Pagar después</button><button className="btn" disabled={busy}>{busy ? 'Procesando…' : metodo === 'OXXO' ? 'Ya pagué en OXXO' : `Pagar ${money(tx.monto)}`}</button></div>
        </form>)}
    </Modal>
  );
}

function Compras({ role }) {
  const ui = useUI();
  const admin = role === 'admin';
  const [filas, setFilas] = useState(null);
  const [err, setErr] = useState('');
  const cargar = useCallback(async () => {
    setErr(''); setFilas(null);
    try { setFilas(await api(admin ? '/api/compras' : '/api/compras/mias')); } catch (x) { setErr(x.message); }
  }, [admin]);
  useEffect(() => { cargar(); }, [cargar]);
  const reembolsar = async (c) => {
    if (!(await ui.confirm({ title: 'Reembolsar compra', peligro: 1, si: 'Sí, reembolsar', text: `Se devolverá ${money(c.monto)} de la compra #${c.id}.` }))) return;
    try { ui.toast((await api(`/api/compras/${c.id}/reembolsar`, { method: 'POST' })).mensaje); cargar(); } catch (x) { ui.toast(x.message, 'error'); }
  };
  return (
    <section>
      <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">{ICONO.compras}</span>
        <div className="tit"><h1>{admin ? 'Compras de todos' : 'Mis compras'}</h1><p className="nota">Historial de pagos. Estados: pendiente, pagada, fallida o reembolsada. Para comprar, ve a Productos y pulsa “Comprar”.</p></div></header>
      {err && <div className="vacio error">{err} <button className="btn suave" onClick={cargar}>Reintentar</button></div>}
      {!err && !filas && <div className="vacio">Cargando compras…</div>}
      {filas && (filas.length === 0 ? <div className="vacio">Todavía no hay compras.</div> : (
        <div className="tabla"><table>
          <thead><tr><th>#</th>{admin && <th>Usuario</th>}<th>Producto</th><th>Cant.</th><th>Método</th><th>Total</th><th>Estado</th><th>Fecha</th>{admin && <th>Acciones</th>}</tr></thead>
          <tbody>{filas.map((c) => (
            <tr key={c.id}><td data-l="#">{c.id}</td>{admin && <td data-l="Usuario">{c.username}</td>}<td data-l="Producto">{c.producto}</td><td data-l="Cant.">{c.cantidad}</td>
              <td data-l="Método">{METODOS.find((m) => m[0] === c.metodo)?.[1] || c.metodo}</td><td data-l="Total">{money(c.monto)}</td><td data-l="Estado"><span className={'pildora ' + c.estado}>{ESTADO_COMPRA[c.estado]}</span></td>
              <td data-l="Fecha">{new Date(c.creada).toLocaleString('es-MX')}</td>
              {admin && <td data-l="Acciones">{c.estado === 'PAGADA' && <button className="btn mini peligro" onClick={() => reembolsar(c)}>Reembolsar</button>}</td>}</tr>))}</tbody></table></div>))}
    </section>
  );
}

/* ───────── Instalación: PWA con diálogo nativo y APK de Android como respaldo ───────── */
function Instalar() {
  const [ev, setEv] = useState(null);
  const [apk, setApk] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  const android = /android/i.test(ua);
  useEffect(() => {
    const promptDisponible = (e) => { e.preventDefault(); setEv(e); };
    window.addEventListener('beforeinstallprompt', promptDisponible);
    if (android) {
      fetch('/sweet-rebel.apk', { method: 'HEAD' })
        .then((r) => setApk(r.ok && !(r.headers.get('content-type') || '').includes('html')))
        .catch(() => setApk(false));
    }
    return () => window.removeEventListener('beforeinstallprompt', promptDisponible);
  }, [android]);
  if (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone) return null;

  const descargarApk = () => {
    const enlace = document.createElement('a');
    enlace.href = '/sweet-rebel.apk';
    enlace.download = 'sweet-rebel.apk';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  };
  const clic = async () => {
    if (ev) {
      ev.prompt();
      await ev.userChoice;
      setEv(null);
    } else if (android && apk) {
      descargarApk();
      setAyuda(true);
    } else {
      setAyuda(true);
    }
  };
  return (
    <>
      <button className="btn suave mini" onClick={clic}>
        {android && apk && !ev ? '📲 Descargar app' : '📲 Instalar app'}
      </button>
      {ayuda && (
        <Modal title="Instalar Sweet Rebel" onClose={() => setAyuda(false)}>
          {android && apk ? (
            <>
              <p>La descarga del APK comenzó.</p>
              <ol>
                <li>Abre <b>sweet-rebel.apk</b> desde las notificaciones o Descargas.</li>
                <li>Permite “Instalar aplicaciones desconocidas” para tu navegador si Android lo solicita.</li>
                <li>Pulsa <b>Instalar</b> y después <b>Abrir</b>.</li>
              </ol>
              <p className="nota">Este APK es una compilación escolar de depuración, no una aplicación publicada en Play Store.</p>
            </>
          ) : ios ? (
            <>
              <p>En iPhone o iPad usa Safari:</p>
              <ol>
                <li>Pulsa <b>Compartir</b>.</li>
                <li>Elige <b>Añadir a pantalla de inicio</b>.</li>
                <li>Confirma con <b>Añadir</b>.</li>
              </ol>
              <p className="nota">iPhone no permite instalar APK ni que una página instale una aplicación por sí sola.</p>
            </>
          ) : (
            <>
              <p>Usa el botón <b>Instalar</b> que ofrece Chrome o Edge:</p>
              <ol>
                <li>Haz clic en el icono de instalación junto a la dirección.</li>
                <li>Confirma <b>Instalar</b> o <b>Abrir como aplicación</b>.</li>
              </ol>
            </>
          )}
          <div className="acciones"><button className="btn" onClick={() => setAyuda(false)}>Entendido</button></div>
        </Modal>)}
    </>
  );
}

/* ───────── Encuesta de satisfacción ───────── */
function Estrellas({ valor, set, etiqueta }) {
  return (
    <div className="estrellas" role="radiogroup" aria-label={etiqueta}>
      {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} role="radio" aria-checked={valor === n} aria-label={`${n} de 5`} className={n <= valor ? 'on' : ''} onClick={() => set(n)}>★</button>)}
    </div>
  );
}
function Encuesta({ role }) {
  const ui = useUI();
  const [g, setG] = useState(0);
  const [f, setF] = useState(0);
  const [c, setC] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const cargarRes = useCallback(() => { if (role === 'admin') api('/api/encuesta/resumen').then(setRes).catch(() => {}); }, [role]);
  useEffect(() => {
    api('/api/encuesta/mia').then((m) => { if (m.general) { setG(m.general); setF(m.facilidad); setC(m.comentario || ''); } }).catch(() => {});
    cargarRes();
  }, [cargarRes]);
  const enviar = async (e) => {
    e.preventDefault();
    if (!g || !f) { ui.toast('Califica las dos preguntas con estrellas.', 'error'); return; }
    setBusy(true);
    try { ui.toast((await api('/api/encuesta', { method: 'POST', body: { general: g, facilidad: f, comentario: c } })).mensaje); cargarRes(); }
    catch (x) { ui.toast(x.message, 'error'); }
    setBusy(false);
  };
  return (
    <section>
      <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">{ICONO.encuesta}</span>
        <div className="tit"><h1>{role === 'admin' ? 'Opiniones de los usuarios' : 'Encuesta de satisfacción'}</h1><p className="nota">{role === 'admin' ? 'Resultados de la encuesta que responden los clientes y reposteros.' : 'Tu opinión nos ayuda a mejorar. Son dos preguntas y un comentario opcional; puedes cambiar tu respuesta cuando quieras.'}</p></div></header>
      {role !== 'admin' && <form className="tarjeta" onSubmit={enviar}>
        <h3>¿Qué tan satisfecho estás con la aplicación?</h3><Estrellas valor={g} set={setG} etiqueta="Satisfacción general" />
        <h3>¿Qué tan fácil fue usarla?</h3><Estrellas valor={f} set={setF} etiqueta="Facilidad de uso" />
        <label className="campo">¿Qué mejorarías? (opcional)<textarea rows="3" maxLength="500" value={c} onChange={(e) => setC(e.target.value)} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar mi opinión'}</button>
      </form>}
      {role === 'admin' && res && (
        <>
          <h2>Resultados</h2>
          <div className="rejilla">
            <article className="tarjeta"><h3>Respuestas</h3><div className="ref">{res.total}</div></article>
            <article className="tarjeta"><h3>Satisfacción</h3><div className="ref">{res.general ?? '—'} ★</div></article>
            <article className="tarjeta"><h3>Facilidad de uso</h3><div className="ref">{res.facilidad ?? '—'} ★</div></article>
          </div>
          {res.comentarios.map((x, i) => <div className="vacio" key={i} style={{ textAlign: 'left' }}><b>{x.username}</b> · {x.general}★ / {x.facilidad}★<br />{x.comentario}</div>)}
        </>)}
    </section>
  );
}
