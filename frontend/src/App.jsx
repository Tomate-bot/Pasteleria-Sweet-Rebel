import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { api, login, setToken, hasToken, setExpiredHandler } from './api.js';
import Acceso from './Acceso.jsx';
import { Postre } from './Postres.jsx';
import { InicioCliente, InicioAdmin } from './Tienda.jsx';
import { Perfil, Avatar, CodigoRecuperacion } from './Perfil.jsx';
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

function Modal({ title, children, onClose, className = '' }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="velo" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`caja ${className}`}>
        <header className="modal-cabecera"><h2>{title}</h2><button type="button" className="modal-cerrar" aria-label="Cerrar ventana" onClick={onClose}>×</button></header>
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
        <label className="campo">Usuario<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" minLength="3" maxLength="50" pattern="[A-Za-z0-9_.@-]{3,50}" required autoFocus /></label>
        <label className="campo">Contraseña<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" maxLength="100" required /></label>
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
        <label className="campo">Contraseña<input type="password" value={p} onChange={(e) => setP(e.target.value)} maxLength="100" autoComplete="current-password" autoFocus required /></label>
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
      { k: 'nombre', l: 'Nombre', req: 1, maxLength: 150 },
      { k: 'descripcion', l: 'Descripción', tipo: 'area' },
      { k: 'precio', l: 'Precio (MXN)', tipo: 'num', step: '0.01', min: '0.01', req: 1 },
      { k: 'reposteroId', l: 'Número del repostero', tipo: 'ref', ref: 'reposteros', req: 1 },
      { k: 'categoriaId', l: 'Número del tipo de postre', tipo: 'ref', ref: 'categorias', req: 1 },
    ],
    cols: [['#', (r) => r.id], ['Producto', (r) => <span className="prod"><Postre id={r.id} nombre={r.nombre} />{r.nombre}</span>], ['Precio', (r) => money(r.precio)],
      ['Repostero', (r) => r.repostero?.nombre], ['Categoría', (r) => r.categoria?.nombre]],
    aForm: (r) => ({ nombre: r.nombre, descripcion: r.descripcion || '', precio: r.precio, reposteroId: r.repostero?.id ?? '', categoriaId: r.categoria?.id ?? '' }),
  },
  categorias: {
    t: 'Tipos de postre', uno: 'tipo de postre', solo: 'Así se agrupan los productos del catálogo: tartas, galletas, pan dulce…',
    campos: [{ k: 'nombre', l: 'Nombre del tipo (por ejemplo: Tartas)', req: 1, maxLength: 80 }],
    cols: [['#', (r) => r.id], ['Tipo de postre', (r) => <span className="prod"><Postre nombre={r.nombre} />{r.nombre}</span>]],
    aForm: (r) => ({ nombre: r.nombre }),
  },
  reposteros: {
    t: 'Reposteros', uno: 'repostero', solo: 'Fichas de las personas que preparan los productos. Para permitirles iniciar sesión, crea una cuenta vinculada desde Usuarios.',
    campos: [{ k: 'nombre', l: 'Nombre', req: 1, maxLength: 100 }, { k: 'ciudad', l: 'Ciudad', req: 1, maxLength: 100 }],
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
    campos: [{ k: 'nombre', l: 'Nombre', req: 1, maxLength: 100 }, { k: 'email', l: 'Correo', tipo: 'email', req: 1, maxLength: 150 }, { k: 'telefono', l: 'Teléfono', tipo: 'tel', maxLength: 20, pattern: '(\\+?52)?[0-9\\s()\\-]{10,18}', inputMode: 'tel', title: 'Escribe 10 dígitos; puedes agregar el prefijo +52.' }],
    cols: [['#', (r) => r.id], ['Nombre', (r) => r.nombre], ['Correo', (r) => r.email], ['Teléfono', (r) => r.telefono || '—'], ['Estado', (r) => <span className={'pildora ' + estadoCli(r)}>{estadoCli(r)}</span>]],
    aForm: (r) => ({ nombre: r.nombre, email: r.email, telefono: r.telefono || '' }),
    bloqueaEditar: (r) => r.cancelado,
  },
  pedidos: {
    t: 'Pedidos', uno: 'pedido', solo: 'Lo que cada cliente encargó. El total se calcula solo.', admin: 1,
    campos: [
      { k: 'clienteId', l: 'Número del cliente', tipo: 'ref', ref: 'clientes', req: 1 },
      { k: 'productoId', l: 'Número del producto', tipo: 'ref', ref: 'productos', req: 1 },
      { k: 'cantidad', l: 'Cantidad (1 a 1000)', tipo: 'num', min: 1, max: 1000, step: 1, req: 1 },
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
  return (
    <select value={v} onChange={(e) => set(e.target.value)} required={!!f.req}>
      <option value="">{m ? 'Elige…' : 'Cargando opciones…'}</option>
      {m && [...m.values()].map((item) => <option key={item.id} value={item.id}>{NOMBRE[f.ref](item)}</option>)}
    </select>
  );
}

function FormModal({ cfg, fila, iniciales = {}, onClose, onSaved }) {
  const ui = useUI();
  const [v, setV] = useState(() => (fila ? cfg.aForm(fila) : {
    ...Object.fromEntries(cfg.campos.map((c) => [c.k, c.tipo === 'sel' ? c.op[0] : ''])),
    ...iniciales,
  }));
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
              : <input type={c.tipo === 'num' ? 'number' : c.tipo || 'text'} step={c.step} min={c.min} max={c.max} maxLength={c.maxLength}
                  pattern={c.pattern} inputMode={c.inputMode} title={c.title} value={v[c.k]}
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
function Lista({ nombre, role, onCategory, username }) {
  const cfg = { ...RES[nombre], path: nombre };
  const ui = useUI();
  const admin = role === 'admin';
  const [filas, setFilas] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [pag, setPag] = useState(0);
  const [form, setForm] = useState(null);
  const [categoriaProducto, setCategoriaProducto] = useState(null);
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
        : nombre === 'categorias'
          ? <div className="colecciones categoria-cards">{pagina.map((r) => (
            <article key={r.id} className="categoria-card">
              <Postre nombre={r.nombre} className="categoria-imagen" />
              <span className="categoria-id">Tipo #{String(r.id).padStart(3, '0')}</span>
              <button className="lnk categoria-nombre" onClick={() => onCategory?.(r)}>{r.nombre}</button>
              <span className="nota">Explora los postres de esta colección.</span>
              {admin && <div className="acciones">
                <button className="btn mini" onClick={() => setCategoriaProducto(r)}>Agregar postre</button>
                <button className="btn mini suave" onClick={() => setForm(r)}>Editar nombre</button>
                <button className="btn mini peligro" onClick={() => borrar(r)}>Eliminar</button>
              </div>}
            </article>))}</div>
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
      {compra && <Comprar producto={compra} username={username} onClose={() => setCompra(null)} />}
      {form && <FormModal cfg={cfg} fila={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); cargar(); }} />}
      {categoriaProducto && <FormModal cfg={{ ...RES.productos, path: 'productos' }} fila={null}
        iniciales={{ categoriaId: String(categoriaProducto.id) }} onClose={() => setCategoriaProducto(null)}
        onSaved={() => setCategoriaProducto(null)} />}
    </section>
  );
}

function CategoriaDetalle({ id, role, username, volver }) {
  const [categoria, setCategoria] = useState(null);
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState('');
  const [compra, setCompra] = useState(null);
  useEffect(() => {
    let activo = true;
    Promise.all([api(`/api/categorias/${id}`), api('/api/productos')])
      .then(([c, p]) => {
        if (!activo) return;
        setCategoria(c);
        setProductos(p.filter((x) => Number(x.categoria?.id) === Number(id)));
      })
      .catch((x) => { if (activo) setError(x.message); });
    return () => { activo = false; };
  }, [id]);
  return (
    <section>
      <header className="cabeza banner">
        <button className="btn suave" onClick={volver}>Volver</button>
        <div className="tit"><h1>{categoria?.nombre || 'Cargando categoría…'}</h1><p className="nota">Postres disponibles en esta categoría.</p></div>
      </header>
      {error && <div className="vacio error">{error}</div>}
      {!productos && !error && <div className="vacio">Cargando postres…</div>}
      {productos?.length === 0 && <div className="vacio">Todavía no hay postres en esta categoría.</div>}
      {productos?.length > 0 && <div className="colecciones">
        {productos.map((p) => <article className="coleccion" key={p.id}>
          <Postre id={p.id} nombre={p.nombre} /><b>{p.nombre}</b>
          <span className="nota">{money(p.precio)}</span>
          {p.descripcion && <p>{p.descripcion}</p>}
          {(role === 'cliente' || role === 'admin') && <button className="btn mini" onClick={() => setCompra(p)}>Comprar</button>}
        </article>)}
      </div>}
      {compra && <Comprar producto={compra} username={username} onClose={() => setCompra(null)} />}
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
            <label className="campo" key={k}>{l}<input type={k === 'email' ? 'email' : k === 'telefono' ? 'tel' : 'text'} value={edit[k] ?? ''}
              maxLength={k === 'nombre' ? 100 : k === 'email' ? 150 : 20}
              pattern={k === 'telefono' ? '(\\+?52)?[0-9\\s()\\-]{10,18}' : undefined}
              inputMode={k === 'telefono' ? 'tel' : undefined}
              onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} required={k !== 'telefono'} /></label>))}
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

function CuentaPerfil({ p, salir, recargar, ui }) {
  const [seccion, setSeccion] = useState('datos');
  return (
    <section className="ajustes-cuenta">
      <header className="cabeza banner">
        <div className="tit"><h1>Cuenta y perfil</h1><p className="nota">Administra tus datos personales y la seguridad de acceso desde un solo lugar.</p></div>
      </header>
      <div className="tabs-cuenta" role="tablist" aria-label="Configuración de cuenta">
        <button role="tab" aria-selected={seccion === 'datos'} className={seccion === 'datos' ? 'on' : ''} onClick={() => setSeccion('datos')}>Datos personales</button>
        <button role="tab" aria-selected={seccion === 'acceso'} className={seccion === 'acceso' ? 'on' : ''} onClick={() => setSeccion('acceso')}>Acceso y seguridad</button>
      </div>
      {seccion === 'datos' ? <Perfil ui={ui} /> : <Cuenta p={p} salir={salir} recargar={recargar} />}
    </section>
  );
}

function Cuenta({ p, salir, recargar }) {
  const ui = useUI();
  const [n, setN] = useState({ nombre: p.nombre, passwordActual: '' });
  const [pw, setPw] = useState({ passwordActual: '', passwordNueva: '' });
  const [us, setUs] = useState({ usernameNuevo: '', passwordActual: '' });
  const [err, setErr] = useState({});
  const run = (clave, fn) => async (e) => {
    e.preventDefault(); setErr({});
    try { await fn(); } catch (x) { setErr({ [clave]: x.message }); }
  };
  return (
    <section>
      <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">{ICONO.cuenta}</span><div className="tit"><h2>Acceso y seguridad</h2><p className="nota">Usuario actual: <b>{p.username}</b>. Confirma tu contraseña actual para proteger cada cambio.</p></div></header>
      <div className="rejilla cuenta-acceso">
        <form className="tarjeta" onSubmit={run('n', async () => { await api('/api/auth/perfil', { method: 'PUT', body: n }); ui.toast('Listo: tu nombre se actualizó.'); setN({ ...n, passwordActual: '' }); recargar(); })}>
          <h3>Nombre visible</h3><p className="nota">Es el nombre que aparece en tu saludo. No cambia tu usuario ni los datos de entrega.</p>
          <label className="campo">Nombre visible<input value={n.nombre} maxLength="100" onChange={(e) => setN({ ...n, nombre: e.target.value })} required /></label>
          <label className="campo">Contraseña actual<input type="password" value={n.passwordActual} onChange={(e) => setN({ ...n, passwordActual: e.target.value })} required autoComplete="current-password" /></label>
          {err.n && <p className="error" role="alert">{err.n}</p>}<button className="btn">Guardar nombre</button>
        </form>
        <form className="tarjeta" onSubmit={run('p', async () => { await api('/api/auth/cambiar-password', { method: 'PUT', body: pw }); ui.toast('Contraseña cambiada. Entra de nuevo con la nueva.'); salir(); })}>
          <h3>Cambiar contraseña</h3>
          <label className="campo">Contraseña actual<input type="password" value={pw.passwordActual} onChange={(e) => setPw({ ...pw, passwordActual: e.target.value })} required /></label>
          <label className="campo">Contraseña nueva (12 a 72 caracteres)<input type="password" minLength="12" maxLength="72" value={pw.passwordNueva} onChange={(e) => setPw({ ...pw, passwordNueva: e.target.value })} required /></label>
          {err.p && <p className="error" role="alert">{err.p}</p>}<button className="btn">Cambiar contraseña</button>
        </form>
        <form className="tarjeta" onSubmit={run('u', async () => { await api('/api/auth/cambiar-usuario', { method: 'PUT', body: us }); ui.toast('Usuario cambiado. Entra de nuevo con el nuevo.'); salir(); })}>
          <h3>Usuario de inicio</h3><p className="nota">Este es el identificador que escribes para iniciar sesión.</p>
          <label className="campo">Nuevo usuario<input value={us.usernameNuevo} onChange={(e) => setUs({ ...us, usernameNuevo: e.target.value })} minLength="3" maxLength="50" pattern="[A-Za-z0-9_.@-]{3,50}" title="Usa de 3 a 50 letras, números, punto, guion, guion bajo o arroba." required /></label>
          <label className="campo">Contraseña actual<input type="password" value={us.passwordActual} onChange={(e) => setUs({ ...us, passwordActual: e.target.value })} required /></label>
          {err.u && <p className="error" role="alert">{err.u}</p>}<button className="btn">Cambiar usuario</button>
        </form>
      </div>
      <CodigoRecuperacion ui={ui} />
    </section>
  );
}

/* ───────── Estructura ───────── */
function Panel({ p, salir, recargar }) {
  const role = rolDe(p.roles);
  const [pag, setPag] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has('detalleCompra')) return `detalleCompra:${q.get('detalleCompra')}`;
    if (q.has('detalleLocal')) return `detalleLocal:${q.get('detalleLocal')}`;
    return 'inicio';
  });
  const [expira, setExpira] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const resolver = useRef(null);
  const ui = useUI();
  useEffect(() => {
    const procesarRetornoPago = () => {
      const q = new URLSearchParams(window.location.search);
      if (q.has('detalleCompra') || q.has('detalleLocal')) window.history.replaceState({}, '', window.location.pathname);
      const pago = q.get('pago'), tx = q.get('tx');
      if (!pago || !tx) return;
      window.history.replaceState({}, '', window.location.pathname);
      const volverACompras = () => setPag('compras');
      if (pago === 'ok') {
        api(`/api/compras/${tx}/capturar`, { method: 'POST', body: {} })
          .then((r) => { ui.toast(r.mensaje); volverACompras(); })
          .catch((x) => { ui.toast(x.message, 'error'); volverACompras(); });
      } else if (pago === 'mercadopago') {
        const paymentId = q.get('payment_id') || q.get('collection_id');
        if (!paymentId) { ui.toast('Mercado Pago no devolvió el identificador de pago; revisa Mis compras.', 'error'); volverACompras(); return; }
        api(`/api/compras/${tx}/mercadopago/confirmar?paymentId=${encodeURIComponent(paymentId)}`, { method: 'POST' })
          .then((r) => { ui.toast(r.mensaje); volverACompras(); })
          .catch((x) => { ui.toast(x.message, 'error'); volverACompras(); });
      } else if (pago === 'stripe') {
        const sessionId = q.get('session_id');
        if (!sessionId) { ui.toast('Stripe no devolvió la sesión de pago. Revisa Mis compras antes de intentarlo otra vez.', 'error'); volverACompras(); return; }
        api(`/api/compras/${tx}/stripe/confirmar?sessionId=${encodeURIComponent(sessionId)}`, { method: 'POST' })
          .then((r) => { ui.toast(r.mensaje); volverACompras(); })
          .catch((x) => { ui.toast(x.message, 'error'); volverACompras(); });
      } else if (pago === 'pendiente') {
        ui.toast('El pago sigue pendiente en la pasarela. Revisa Mis compras; no vuelvas a pagar si ya completaste el proceso.');
        volverACompras();
      } else if (pago === 'cancelado') {
        ui.toast('Regresaste sin completar el pago. La compra sigue pendiente y puedes retomarla desde Mis compras.');
        volverACompras();
      } else {
        ui.toast('El pago no fue aprobado. La compra no está pagada; revisa Mis compras para reintentarlo.', 'error');
        volverACompras();
      }
    };
    procesarRetornoPago();
    const alMostrar = (evento) => { if (evento.persisted) procesarRetornoPago(); };
    window.addEventListener('pageshow', alMostrar);
    return () => window.removeEventListener('pageshow', alMostrar);
  }, []);
  useEffect(() => {
    setExpiredHandler(() => new Promise((ok, no) => { resolver.current = { ok, no }; setExpira(true); }));
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { setExpiredHandler(null); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const menu = role === 'repostero' ? [['inicio', 'Inicio'], ['chef', 'Mis pedidos'], ['pasteles', 'Mis pasteles'], ['encuesta', role === 'admin' ? 'Opiniones' : 'Encuesta'], ['cuenta', 'Mi cuenta']] : [['inicio', 'Inicio'], ['productos', 'Productos'], ['categorias', 'Tipos de postre'], ...(role !== 'cliente' ? [['reposteros', 'Reposteros']] : []),
    ...(role === 'admin' ? [['clientes', 'Clientes'], ['pedidos', 'Pedidos'], ['pagos', 'Pasarelas']] : []), ...(role === 'admin' || role === 'cliente' ? [['compras', 'Mis compras']] : []), ...(role === 'admin' ? [['usuarios', 'Usuarios'], ['privacidad', 'Privacidad']] : []), ['encuesta', role === 'admin' ? 'Opiniones' : 'Encuesta'], ['cuenta', 'Mi cuenta']];
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
        {menu.map(([k, l]) => <button key={k} className={pag === k ? 'on' : ''} aria-current={pag === k} onClick={() => setPag(k)}><span aria-hidden="true">{k === 'pagos' ? '💳' : ICONO[k]}</span>{l}</button>)}
      </nav>
      {offline && <div className="aviso" role="alert">Sin conexión. Las compras que guardes quedarán pendientes en este dispositivo; ningún pago se confirma hasta completar el proceso en línea.</div>}
      <main className="contenido">
        {pag === 'inicio' && (role === 'repostero' ? <InicioChef p={p} ir={setPag} /> : (role === 'admin' ? <InicioAdmin p={p} ir={setPag} /> : <InicioCliente p={p} ir={setPag} />))}
        {RES[pag] && <Lista key={pag} nombre={pag} role={role} username={p.username} onCategory={(c) => setPag(`categoria:${c.id}`)} />}
        {pag.startsWith('categoria:') && <CategoriaDetalle id={pag.slice('categoria:'.length)} role={role} username={p.username} volver={() => setPag('inicio')} />}
        {pag === 'compras' && <Compras role={role} username={p.username} />}
        {pag === 'pagos' && role === 'admin' && <ConfiguracionPasarelas />}
        {pag.startsWith('detalleCompra:') && <DetalleCompra id={pag.slice('detalleCompra:'.length)} username={p.username} volver={() => setPag('compras')} />}
        {pag.startsWith('detalleLocal:') && <DetalleCompra id={pag.slice('detalleLocal:'.length)} username={p.username} local volver={() => setPag('compras')} />}
        {pag === 'encuesta' && <Encuesta role={role} />}
        {pag === 'chef' && role === 'repostero' && <PedidosChef ui={ui} />}
        {pag === 'pasteles' && role === 'repostero' && <PastelesChef />}
        {pag === 'usuarios' && role === 'admin' && <Usuarios ui={ui} />}
        {pag === 'privacidad' && role === 'admin' && <Privacidad role={role} ir={setPag} />}
        {pag === 'cuenta' && <CuentaPerfil p={p} salir={salir} recargar={recargar} ui={ui} />}
      </main>
      <footer className="pie">Sweet Rebel · Pagos disponibles procesados por su pasarela · <a href="/aviso-privacidad.html" target="_blank" rel="noreferrer">Aviso de privacidad</a></footer>
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


/* ───────── Compras y pagos ───────── */
const ESTADO_COMPRA = { INCOMPLETA: 'Pendiente de conexión · en este dispositivo', PENDIENTE: 'Pendiente', PAGADA: 'Pagada', FALLIDA: 'Fallida', REEMBOLSADA: 'Reembolsada' };
const folioCompra = (id, local) => {
  if (id != null && /^\d+$/.test(String(id))) return `Folio de compra #${id}`;
  return local ? 'Borrador guardado en este dispositivo' : 'Compra registrada';
};

const METODOS = [['PAYPAL', 'PayPal', 'P'], ['STRIPE', 'Tarjeta', 'CARD'], ['MERCADOPAGO', 'Mercado Pago', 'MP'], ['OXXO', 'OXXO', 'O']];
const CLAVE_COMPRAS_LOCAL = 'sweetrebel:compras:';
const nuevaReferenciaCompra = () => globalThis.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
function comprasLocales(username) {
  try {
    const data = JSON.parse(localStorage.getItem(CLAVE_COMPRAS_LOCAL + username) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function guardarComprasLocales(username, filas) {
  try {
    localStorage.setItem(CLAVE_COMPRAS_LOCAL + username, JSON.stringify(filas));
    return true;
  } catch {
    return false;
  }
}
function Comprar({ producto, username, onClose }) {
  const [cant, setCant] = useState(1);
  const [metodo, setMetodo] = useState('PAYPAL');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [redirectando, setRedirectando] = useState(false);
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState('');
  const [servidorNoDisponible, setServidorNoDisponible] = useState(false);
  const [conectado, setConectado] = useState(navigator.onLine);
  const clientReference = useRef(nuevaReferenciaCompra());
  const esperandoPasarela = useRef(false);
  useEffect(() => {
    const alRegresar = () => {
      if (!esperandoPasarela.current) return;
      esperandoPasarela.current = false;
      setBusy(false);
      setRedirectando(false);
      setErr('Regresaste de la pasarela. Revisa el estado en Mis compras antes de intentar otro pago.');
    };
    const alMostrar = (evento) => { if (evento.persisted) alRegresar(); };
    const alCambiarVisibilidad = () => { if (document.visibilityState === 'visible') alRegresar(); };
    window.addEventListener('pageshow', alMostrar);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      window.removeEventListener('pageshow', alMostrar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, []);
  const cambiarMetodo = (siguiente) => {
    if (siguiente !== metodo) clientReference.current = nuevaReferenciaCompra();
    setMetodo(siguiente);
    setErr('');
  };
  const cambiarCantidad = (siguiente) => {
    if (siguiente !== String(cant)) clientReference.current = nuevaReferenciaCompra();
    setCant(siguiente);
    setErr('');
  };
  const cargarConfig = useCallback(async () => {
    try {
      const r = await api('/api/compras/config');
      setConfig(r);
      setConfigError('');
      setServidorNoDisponible(false);
      const disponible = METODOS.find(([codigo]) => r[codigo.toLowerCase()]?.disponible && !r[codigo.toLowerCase()]?.simulado);
      setMetodo((actual) => r[actual.toLowerCase()]?.disponible && !r[actual.toLowerCase()]?.simulado ? actual : disponible?.[0] || '');
    } catch (x) {
      setConfigError(x.message);
      setServidorNoDisponible(x.status === 0 || x.status >= 500);
    }
  }, []);
  useEffect(() => {
    const alDesconectar = () => setConectado(false);
    const alConectar = () => { setConectado(true); cargarConfig(); };
    window.addEventListener('offline', alDesconectar);
    window.addEventListener('online', alConectar);
    cargarConfig();
    return () => {
      window.removeEventListener('offline', alDesconectar);
      window.removeEventListener('online', alConectar);
    };
  }, [cargarConfig]);
  const configuracionMetodo = metodo ? config?.[metodo.toLowerCase()] : null;
  const metodoListo = !!(configuracionMetodo?.disponible && !configuracionMetodo.simulado);
  const modoPendienteLocal = !conectado || servidorNoDisponible;
  const metodosListos = METODOS.filter(([codigo]) => config?.[codigo.toLowerCase()]?.disponible && !config[codigo.toLowerCase()]?.simulado);
  const guardarPendienteLocal = (server = {}) => {
    const actual = comprasLocales(username).filter((x) => x.clientReference !== clientReference.current);
    actual.unshift({
      id: clientReference.current,
      clientReference: clientReference.current,
      serverTransactionId: server.transaccionId || null,
      checkoutUrl: server.aprobarUrl || null,
      username,
      productoId: producto.id,
      producto: producto.nombre,
      precio: Number(producto.precio),
      cantidad: Number(cant),
      metodo,
      monto: Number(server.monto ?? Number(producto.precio) * Number(cant)),
      estado: server.transaccionId ? 'PENDIENTE' : 'INCOMPLETA',
      creada: new Date().toISOString(),
    });
    return guardarComprasLocales(username, actual);
  };
  const iniciar = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    if (modoPendienteLocal) {
      const guardada = guardarPendienteLocal();
      setErr(guardada
        ? 'No hay conexión con el servidor. Guardamos la compra como pendiente en este dispositivo; no se inició ni confirmó ningún pago. Revisa la conexión y vuelve a Mis compras para reintentarlo.'
        : 'No hay conexión con el servidor y no se pudo guardar la compra localmente. No se inició ni confirmó ningún pago.');
      setBusy(false);
      return;
    }
    if (!metodoListo) {
      setErr('Este método todavía no está habilitado para recibir pagos. No se inició ningún cobro.');
      setBusy(false);
      return;
    }
    try {
      const r = await api('/api/compras', { method: 'POST', body: { productoId: producto.id, cantidad: Number(cant), metodo, clientReference: clientReference.current } });
      const localGuardada = guardarPendienteLocal(r);
      if (r.aprobarUrl) {
        esperandoPasarela.current = true;
        setRedirectando(true);
        window.location.assign(r.aprobarUrl);
        return;
      }
      setErr(localGuardada
        ? 'La pasarela no devolvió un enlace de pago. No se completó ningún cobro; revisa Mis compras o contacta a la pastelería antes de volver a intentarlo.'
        : 'La pasarela no devolvió un enlace de pago y no pudimos guardar el registro en este dispositivo. No se completó ningún cobro.');
    } catch (x) {
      if (x.status === 0) {
        const guardada = guardarPendienteLocal();
        setErr(guardada
          ? 'No pudimos comunicarnos con el servidor. Guardamos esta compra como pendiente de conexión en este dispositivo. El pago no está confirmado; revisa tu conexión y Mis compras antes de reintentar.'
          : 'No pudimos comunicarnos con el servidor y no se pudo guardar la compra en este dispositivo. El pago no está confirmado; revisa tu conexión y Mis compras antes de volver a intentarlo.');
      } else if (x.status >= 500) {
        const guardada = guardarPendienteLocal();
        setErr(guardada
          ? 'El servidor no respondió. Guardamos esta compra como pendiente de conexión en este dispositivo. El pago no está confirmado: revisa tu conexión y Mis compras antes de reintentar.'
          : 'El servidor no respondió y no pudimos guardar la compra en este dispositivo. El pago no está confirmado; revisa tu conexión y Mis compras antes de volver a intentarlo.');
      } else setErr(x.message);
    }
    setBusy(false);
  };
  return (
    <Modal title="Finalizar compra" onClose={onClose} className="modal-pago">
      <form onSubmit={iniciar}>
        {modoPendienteLocal && <p className="aviso-pago" role="status">No se puede contactar con el servidor. Puedes guardar esta compra para reintentarla después; no se realizará ningún cobro ahora.</p>}
        <div className="resumen-compra"><Postre id={producto.id} nombre={producto.nombre} /><div><b>{producto.nombre}</b><span>{money(producto.precio)} por pieza</span></div></div>
        <label className="campo">Cantidad<input type="number" min="1" max="1000" step="1" value={cant} onChange={(e) => cambiarCantidad(e.target.value)} required /></label>
        <div className="total-compra"><span>Total a pagar</span><strong>{money(Number(producto.precio) * (Number(cant) || 0))}</strong></div>
        <fieldset className="metodos"><legend>Elige una forma de pago</legend>
          {METODOS.map(([codigo, etiqueta, marca]) => {
            const estado = config?.[codigo.toLowerCase()];
            const listo = !!(estado?.disponible && !estado.simulado);
            const bloqueado = !listo && !modoPendienteLocal;
            const descripcion = modoPendienteLocal ? 'Se validará cuando vuelva la conexión'
              : !estado ? 'Comprobando disponibilidad…'
                : listo ? 'Pago seguro disponible'
                  : estado.simulado ? 'Desactivado en modo simulado' : 'No configurado en el servidor';
            return <label key={codigo} className={`${metodo === codigo ? 'sel' : ''} ${bloqueado ? 'deshabilitado' : ''}`}>
              <input type="radio" name="metodo" value={codigo} checked={metodo === codigo} onChange={() => cambiarMetodo(codigo)} disabled={bloqueado} />
              <span className={`marca-pago marca-${codigo.toLowerCase()}`} aria-hidden="true">{marca}</span>
              <span className="metodo-info"><b>{etiqueta}</b><small>{descripcion}</small></span>
              {bloqueado && <span className="metodo-proximamente">{estado?.simulado ? 'Modo simulado' : 'No disponible'}</span>}
            </label>;
          })}
        </fieldset>
        {configError && <p className="error" role="alert">No pudimos consultar los métodos de pago: {configError}</p>}
        {config && metodosListos.length === 0 && <p className="aviso-pago" role="status">Los pagos aún no están habilitados. No se realizará ningún cobro. La persona responsable del servidor debe conectar una pasarela; las claves no se configuran desde esta pantalla.</p>}
        <p className="nota">La autorización del pago ocurre en el sitio seguro de la pasarela. Sweet Rebel no solicita ni almacena los datos de tu tarjeta.</p>
        {redirectando && <p className="aviso-pago" role="status">Conectando con {METODOS.find(([codigo]) => codigo === metodo)?.[1] || 'la pasarela'}… No cierres esta página. Al regresar te mostraremos el estado de la compra.</p>}
        {err && <p className="error" role="alert">{err}</p>}
        <div className="acciones"><button type="button" className="btn suave" onClick={onClose}>Volver</button>
          <button className="btn" disabled={busy || (!metodoListo && !modoPendienteLocal)}>{busy ? (redirectando ? `Abriendo ${METODOS.find(([codigo]) => codigo === metodo)?.[1] || 'pasarela'}…` : 'Preparando pago…') : modoPendienteLocal ? 'Guardar compra pendiente' : 'Ir a pagar'}</button></div>
      </form>
    </Modal>
  );
}

function ConfiguracionPasarelas() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/compras/config').then(setConfig).catch((x) => setError(x.message)); }, []);
  const metodos = [
    { key: 'paypal', nombre: 'PayPal', ayuda: 'El cliente autoriza el pago en PayPal. Sweet Rebel confirma la captura con el servidor antes de registrar la compra como pagada.' },
    { key: 'mercadopago', nombre: 'Mercado Pago', ayuda: 'Checkout Pro redirige al cliente a Mercado Pago. El servidor verifica el resultado; si queda pendiente, no se marca como pagado.' },
    { key: 'stripe', nombre: 'Tarjeta (Stripe)', ayuda: 'El cliente ingresa sus datos en el Checkout seguro de Stripe. Sweet Rebel no almacena datos de tarjeta y confirma el resultado con Stripe.' },
    { key: 'oxxo', nombre: 'OXXO', ayuda: 'Stripe genera un vale para pagar en tienda. La compra permanece pendiente hasta que Stripe notifica el pago; la confirmación puede tardar.' },
  ];
  return (
    <section className="pasarelas-admin">
      <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">💳</span>
        <div className="tit"><h1>Pasarelas de pago</h1><p className="nota">Estado actual y cómo funciona la confirmación de cada método.</p></div></header>
      {error && <div className="vacio error">{error}</div>}
      {!config && !error && <div className="vacio">Consultando la configuración del servidor…</div>}
      {config && <div className="rejilla pasarelas-lista">
        {metodos.map((m) => {
          const estado = config[m.key];
          const disponible = !!(estado?.disponible && !estado?.simulado);
          const etiquetaEstado = disponible ? 'Activa' : estado?.simulado ? 'Modo simulado' : 'No configurada';
          return <article className="tarjeta pasarela-admin" key={m.key}>
            <div className="pasarela-admin-titulo"><h2>{m.nombre}</h2><span className={'estado-pasarela ' + (disponible ? 'activa' : 'inactiva')}>{etiquetaEstado}</span></div>
            <p>{m.ayuda}</p>
          </article>;
        })}
      </div>}
    </section>
  );
}

function Compras({ role, username }) {
  const ui = useUI();
  const admin = role === 'admin';
  const [filas, setFilas] = useState(null);
  const [locales, setLocales] = useState(() => comprasLocales(username));
  const [err, setErr] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [config, setConfig] = useState(null);
  const cargarConfig = useCallback(() => api('/api/compras/config').then(setConfig).catch(() => setConfig({})), []);
  useEffect(() => {
    cargarConfig();
    window.addEventListener('online', cargarConfig);
    return () => window.removeEventListener('online', cargarConfig);
  }, [cargarConfig]);
  const cargar = useCallback(async () => {
    setErr('');
    try {
      const resultado = await api(admin ? '/api/compras' : '/api/compras/mias');
      setFilas(resultado);
      const estadosRemotos = new Map(resultado.map((x) => [String(x.id), x.estado]));
      const restantes = comprasLocales(username).filter((x) => {
        if (!x.serverTransactionId) return true;
        const estado = estadosRemotos.get(String(x.serverTransactionId));
        return estado == null || estado === 'PENDIENTE';
      });
      guardarComprasLocales(username, restantes);
      setLocales(restantes);
    } catch (x) {
      setErr(x.message);
      setFilas(null);
      setLocales(comprasLocales(username));
    }
  }, [admin, username]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const alVolver = () => { if (navigator.onLine) cargar(); };
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [cargar]);
  const reembolsar = async (c) => {
    if (!(await ui.confirm({ title: 'Reembolsar compra', peligro: 1, si: 'Sí, reembolsar', text: `Se devolverá ${money(c.monto)} de la compra #${c.id}.` }))) return;
    try { ui.toast((await api(`/api/compras/${c.id}/reembolsar`, { method: 'POST' })).mensaje); cargar(); } catch (x) { ui.toast(x.message, 'error'); }
  };
  const actualizarLocal = (id, patch) => {
    const actualizados = comprasLocales(username).map((x) => x.id === id ? { ...x, ...patch } : x);
    guardarComprasLocales(username, actualizados);
    setLocales(actualizados);
  };
  const continuarRemota = async (compra) => {
    try {
      const r = await api(`/api/compras/${encodeURIComponent(compra.id)}/continuar`, { method: 'POST' });
      if (!r.aprobarUrl) {
        ui.toast('El servidor no devolvió un enlace de pago. La compra sigue pendiente y no se marcó como pagada.', 'error');
        return;
      }
      window.location.assign(r.aprobarUrl);
    } catch (x) {
      ui.toast(x.message, 'error');
    }
  };
  const reanudar = async (borrador) => {
    try {
      if (borrador.checkoutUrl) { window.location.href = borrador.checkoutUrl; return; }
      const estado = config?.[borrador.metodo.toLowerCase()];
      if (!estado?.disponible || estado.simulado) {
        const proveedor = METODOS.find(([codigo]) => codigo === borrador.metodo)?.[1] || borrador.metodo;
        const ayuda = admin ? 'Revisa Administración > Pasarelas.' : 'Contacta a la persona responsable del servidor.';
        ui.toast(`${proveedor} no está habilitado en el servidor. No se inició ningún cobro. ${ayuda}`, 'error');
        return;
      }
      const r = await api('/api/compras', { method: 'POST', body: {
        productoId: borrador.productoId, cantidad: borrador.cantidad, metodo: borrador.metodo,
        clientReference: borrador.clientReference,
      } });
      actualizarLocal(borrador.id, { serverTransactionId: r.transaccionId, checkoutUrl: r.aprobarUrl || null, monto: Number(r.monto), estado: 'PENDIENTE' });
      if (r.aprobarUrl) { window.location.assign(r.aprobarUrl); return; }
      ui.toast('La pasarela no proporcionó un enlace de pago. La compra sigue sin confirmarse y no debes repetir el pago; contacta a la administración.', 'error');
    } catch (x) {
      if (x.status === 0 || x.status >= 500) ui.toast('No pudimos comunicarnos con el servidor. La compra sigue pendiente y no se marcó como pagada; revisa tu conexión e inténtalo más tarde.', 'error');
      else ui.toast(x.message, 'error');
    }
  };
  const idsLocales = new Set(locales.filter((x) => x.serverTransactionId).map((x) => String(x.serverTransactionId)));
  const filasVisibles = (filas || []).filter((x) => !idsLocales.has(String(x.id)));
  const pendientesRemotos = filasVisibles.filter((x) => x.estado === 'PENDIENTE');
  const borradorSeleccionado = detalle?.local ? locales.find((x) => x.id === detalle.id) : null;
  const puedeContinuarBorrador = !!(borradorSeleccionado && (borradorSeleccionado.checkoutUrl
    || (config?.[borradorSeleccionado.metodo?.toLowerCase()]?.disponible && !config?.[borradorSeleccionado.metodo?.toLowerCase()]?.simulado)));
  return (
    <>
    <section>
      <header className="cabeza banner"><span className="icono-sec" aria-hidden="true">{ICONO.compras}</span>
        <div className="tit"><h1>{admin ? 'Compras de todos' : 'Mis compras'}</h1><p className="nota">Consulta el estado y los detalles. Solo se abre la pasarela cuando tú eliges reanudar el pago.</p></div></header>
      {err && <div className="vacio error">{err} <button className="btn suave" onClick={cargar}>Reintentar</button></div>}
      {!err && !filas && <div className="vacio">Cargando compras…</div>}
      {locales.length > 0 && <section>
        <h2>Compras guardadas en este dispositivo</h2>
        <p className="nota">Estas compras están pendientes de conexión o de completar el pago. No se cobra nada en segundo plano; vuelve a intentarlo cuando el servidor y tu conexión estén disponibles.</p>
        <div className="colecciones">{locales.map((b) => <article className="coleccion" key={b.id}>
          <Postre id={b.productoId} nombre={b.producto} />
          <b>{b.producto}</b>
          <span>{money(b.monto || Number(b.precio) * Number(b.cantidad))} · {b.cantidad} pza.</span>
          <span className="pildora">{ESTADO_COMPRA[b.estado] || b.estado}</span>
          <span className="nota">{new Date(b.creada).toLocaleString('es-MX')}</span>
          <div className="acciones">
            <button className="btn mini suave" onClick={() => setDetalle({ id: b.id, local: true })}>Ver detalle</button>
            <button className="btn mini" onClick={() => reanudar(b)} disabled={!b.checkoutUrl && !config?.[b.metodo?.toLowerCase()]?.disponible}>
              {b.checkoutUrl ? 'Abrir pasarela' : config ? (config[b.metodo?.toLowerCase()]?.disponible ? 'Reintentar compra' : 'Pasarela no activa') : 'Verificando…'}
            </button>
          </div>
          {config && !b.checkoutUrl && !config[b.metodo?.toLowerCase()]?.disponible && <small className="nota ayuda-pasarela">No se inició un cobro. La persona responsable del servidor debe habilitar este método.</small>}
        </article>)}</div>
      </section>}
      {filas && pendientesRemotos.length > 0 && <section className="pendientes-remotos">
        <h2>Pagos pendientes para continuar ({pendientesRemotos.length})</h2>
        <p className="nota">Cada tarjeta corresponde a una compra pendiente de la tabla. Abre el detalle o continúa para volver a la sesión segura de pago.</p>
        <div className="colecciones">{pendientesRemotos.map((c) => <article className="coleccion compra-pendiente" key={c.id}>
          <Postre id={c.productoId} nombre={c.producto} />
          <b>{c.producto}</b>
          <span>{folioCompra(c.id, false)} · {c.cantidad} pza. · {METODOS.find((m) => m[0] === c.metodo)?.[1] || c.metodo}</span>
          <strong>{money(c.monto)}</strong>
          <span className="pildora PENDIENTE">Pendiente</span>
          <div className="acciones">
            <button className="btn mini suave" onClick={() => setDetalle({ id: c.id, local: false })}>Ver detalle</button>
            <button className="btn mini" onClick={() => continuarRemota(c)}>Continuar compra</button>
          </div>
        </article>)}</div>
      </section>}
      {filas && filasVisibles.length === 0 && locales.length === 0 && <div className="vacio">Todavía no hay compras.</div>}
      {filas && filasVisibles.length > 0 && (
        <div className="tabla"><table>
          <thead><tr><th>Folio</th>{admin && <th>Usuario</th>}<th>Producto</th><th>Cant.</th><th>Método</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Detalles</th>{admin && <th>Acciones</th>}</tr></thead>
          <tbody>{filasVisibles.map((c) => (
            <tr key={c.id}><td data-l="Folio">{folioCompra(c.id, false)}</td>{admin && <td data-l="Usuario">{c.username}</td>}<td data-l="Producto">{c.producto}</td><td data-l="Cant.">{c.cantidad}</td>
              <td data-l="Método">{METODOS.find((m) => m[0] === c.metodo)?.[1] || c.metodo}</td><td data-l="Total">{money(c.monto)}</td><td data-l="Estado"><span className={'pildora ' + c.estado}>{ESTADO_COMPRA[c.estado]}</span></td>
              <td data-l="Fecha">{new Date(c.creada).toLocaleString('es-MX')}</td><td data-l="Detalles"><button className="btn mini suave" onClick={() => setDetalle({ id: c.id, local: false })}>Ver detalle</button></td>
              {admin && <td data-l="Acciones">{c.estado === 'PAGADA' && <button className="btn mini peligro" onClick={() => reembolsar(c)}>Reembolsar</button>}</td>}</tr>))}</tbody></table></div>)}
    </section>
    {detalle && <Modal title="Detalle de la compra" onClose={() => setDetalle(null)} className="modal-detalle">
      <DetalleCompra id={detalle.id} local={detalle.local} username={username}
        onContinuar={detalle.local ? reanudar : continuarRemota}
        continuarDisponible={!detalle.local || puedeContinuarBorrador} />
    </Modal>}
    </>
  );
}

function DetalleCompra({ id, local, username, volver, onContinuar, continuarDisponible = true }) {
  const [compra, setCompra] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let activo = true;
    if (local) {
      const encontrada = comprasLocales(username).find((x) => x.id === id);
      if (encontrada) setCompra(encontrada);
      else setError('No encontramos este borrador de compra en el dispositivo.');
      return () => { activo = false; };
    }
    api(`/api/compras/${encodeURIComponent(id)}`)
      .then((r) => { if (activo) setCompra(r); })
      .catch((x) => { if (activo) setError(x.message); });
    return () => { activo = false; };
  }, [id, local, username]);
  const fecha = (v) => v ? new Date(v).toLocaleString('es-MX') : '—';
  return (
    <div className="detalle-compra">
      {volver && <header className="detalle-cabecera"><div><h2>Compra {compra?.id ? `#${compra.id}` : ''}</h2><p className="nota">Resumen y estado actualizado.</p></div></header>}
      {error && <div className="vacio error">{error}</div>}
      {!compra && !error && <div className="vacio">Cargando detalle…</div>}
      {compra && <>
        <div className="detalle-resumen">
          <Postre id={compra.productoId} nombre={compra.producto} />
          <div><b>{compra.producto}</b><span>{folioCompra(local ? (compra.serverTransactionId ?? compra.id) : compra.id, local)} · {compra.cantidad} pieza(s)</span><strong>{money(compra.monto || Number(compra.precio) * Number(compra.cantidad))}</strong></div>
          <span className={'pildora ' + compra.estado}>{ESTADO_COMPRA[compra.estado] || compra.estado}</span>
        </div>
        <dl>
          <dt>Método de pago</dt><dd>{METODOS.find((m) => m[0] === compra.metodo)?.[1] || compra.metodo}</dd>
          <dt>Creada</dt><dd>{fecha(compra.creada)}</dd>
          <dt>Última actualización</dt><dd>{fecha(compra.actualizada)}</dd>
          {compra.pedidoId && <><dt>Pedido asociado</dt><dd>#{compra.pedidoId}</dd></>}
          {local && <><dt>Guardada en</dt><dd>Este dispositivo</dd></>}
        </dl>
        {local && <p className="nota">Este registro local no confirma un cobro. El pago solo se actualiza cuando la pasarela y el servidor confirman el resultado.</p>}
        {onContinuar && (compra.estado === 'PENDIENTE' || compra.estado === 'INCOMPLETA') && (
          <div className="acciones acciones-detalle">
            <button className="btn" disabled={!continuarDisponible} onClick={() => onContinuar(compra)}>
              {continuarDisponible ? (compra.checkoutUrl ? 'Abrir pasarela' : 'Continuar compra') : 'Pasarela no activa'}
            </button>
          </div>
        )}
      </>}
      {volver && <div className="acciones"><button className="btn suave" onClick={volver}>Volver a Mis compras</button></div>}
    </div>
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
      <button className="btn suave mini instalar-app" onClick={clic}>
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
        <label className="campo">¿Qué mejorarías? (opcional)<textarea rows="3" maxLength="500" value={c}
          onChange={(e) => { if (/^[\p{L}\p{M}\p{N}\s.,!?¡¿:;'"()/-]*$/u.test(e.target.value)) setC(e.target.value); }} />
          <small className="nota">Usa letras, números y puntuación común; no se admiten etiquetas ni símbolos especiales.</small>
          <small className="nota" aria-live="polite">{c.length}/500 caracteres</small></label>
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
