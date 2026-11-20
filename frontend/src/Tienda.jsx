import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Pastel } from './Arte.jsx';
import { Postre } from './Postres.jsx';

const money = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

/** Inicio del cliente y del perfil de consulta: portada, colecciones y destacados. */
export function InicioCliente({ p, ir }) {
  const [prods, setProds] = useState(null);
  const [cats, setCats] = useState([]);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  useEffect(() => {
    api('/api/productos').then((l) => setProds(l.slice(0, 5))).catch(() => setProds([]));
    api('/api/categorias').then(setCats).catch(() => {});
  }, []);
  useEffect(() => {
    if (pausado || !prods || prods.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setIndice((i) => (i + 1) % prods.length), 6500);
    return () => window.clearInterval(timer);
  }, [pausado, prods]);
  const destacado = prods?.[indice] || null;
  const mover = (paso) => setIndice((i) => (prods?.length ? (i + paso + prods.length) % prods.length : 0));
  return (
    <section className="inicio-cliente">
      <div className="hero-carrusel" onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
        <div className="hero-copy">
          <span className="eyebrow">Sweet Rebel · Repostería artesanal</span>
          <p className="hero-saludo">Hola, {p.nombre}</p>
          <h1>{destacado ? destacado.nombre : 'Un antojo merece algo especial.'}</h1>
          <p className="hero-descripcion">{destacado
            ? `Una de nuestras opciones para acompañar tus mejores momentos. ${money(destacado.precio)}`
            : 'Explora el catálogo y encuentra tu próximo postre favorito.'}</p>
          <div className="hero-acciones">
            <button className="btn" onClick={() => ir('productos')}>Explorar productos</button>
            <button className="btn suave" onClick={() => ir('categorias')}>Ver colecciones</button>
          </div>
        </div>
        <div className="hero-visual">
          {destacado ? <Postre id={destacado.id} nombre={destacado.nombre} className="hero-producto" /> : <Pastel className="hero-arte" />}
          {prods?.length > 1 && <div className="hero-controles" aria-label="Productos destacados">
            <button className="carrusel-flecha" aria-label="Producto anterior" onClick={() => mover(-1)}>‹</button>
            <div className="carrusel-puntos">{prods.map((x, i) => <button key={x.id} className={i === indice ? 'activo' : ''} aria-label={`Mostrar ${x.nombre}`} aria-current={i === indice} onClick={() => setIndice(i)} />)}</div>
            <button className="carrusel-flecha" aria-label="Producto siguiente" onClick={() => mover(1)}>›</button>
          </div>}
        </div>
      </div>

      <section className="bloque-marca">
        <div><span className="eyebrow">Nuestra esencia</span><h2>Dulces momentos, con personalidad.</h2></div>
        <p>En Sweet Rebel reunimos postres para distintos antojos. Revisa cada producto, conoce su categoría y continúa con una pasarela de pago disponible.</p>
        <div className="marca-acciones">
          <button className="enlace-seccion" onClick={() => ir('productos')}>Catálogo <span aria-hidden="true">→</span></button>
          <button className="enlace-seccion" onClick={() => ir('encuesta')}>Cuéntanos tu experiencia <span aria-hidden="true">→</span></button>
        </div>
      </section>

      {cats.length > 0 && <section className="bloque-inicio">
        <div className="titulo-bloque"><div><span className="eyebrow">Encuentra tu favorito</span><h2>Nuestras colecciones</h2></div>
          <button className="btn suave mini" onClick={() => ir('categorias')}>Ver todas</button></div>
        <div className="colecciones">{cats.slice(0, 4).map((c) => <button key={c.id} className="coleccion" onClick={() => ir(`categoria:${c.id}`)}><Postre nombre={c.nombre} /><b>{c.nombre}</b><span className="nota">Ver postres <span aria-hidden="true">→</span></span></button>)}</div>
      </section>}

      {prods === null ? <div className="vacio">Cargando productos…</div> : prods.length === 0 && <div className="vacio">Todavía no hay productos disponibles. Vuelve pronto para descubrir la vitrina.</div>}
    </section>
  );
}

/** Inicio del administrador: resumen del negocio. */
export function InicioAdmin({ p, ir }) {
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/admin/resumen').then(setR).catch((x) => setErr(x.message)); }, []);
  const ped = r?.pedidos || {};
  return (
    <section>
      <header className="cabeza banner"><div className="tit"><h1>Panel de control</h1><p className="nota">Hola, {p.nombre}. Así va Sweet Rebel hoy.</p></div></header>
      {err && <div className="vacio error">{err}</div>}
      {!r && !err && <div className="vacio">Cargando resumen…</div>}
      {r && <>
        <div className="metricas">
          <article className="metrica"><span>Ventas pagadas</span><b>{money(r.ventas)}</b><small>{r.comprasPagadas} compras</small></article>
          <article className="metrica"><span>Pedidos pendientes</span><b>{ped.PENDIENTE || 0}</b><small>{ped.PREPARANDO || 0} en preparación</small></article>
          <article className="metrica"><span>Clientes activos</span><b>{r.clientes}</b><small>{r.productos} productos</small></article>
          <article className="metrica"><span>Entregados</span><b>{ped.ENTREGADO || 0}</b><small>{ped.CANCELADO || 0} cancelados</small></article>
        </div>
        <h2>Actividad reciente</h2>
        {r.recientes.length === 0 ? <div className="vacio">Aún no hay compras.</div> : (
          <div className="tabla"><table><thead><tr><th>#</th><th>Usuario</th><th>Producto</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>{r.recientes.map((c) => <tr key={c.id}><td data-l="#">{c.id}</td><td data-l="Usuario">{c.username}</td><td data-l="Producto">{c.producto}</td><td data-l="Total">{money(c.monto)}</td><td data-l="Estado"><span className={'pildora ' + c.estado}>{c.estado.toLowerCase()}</span></td></tr>)}</tbody></table></div>)}
        <div className="acciones izq"><button className="btn suave" onClick={() => ir('pedidos')}>Ver pedidos</button><button className="btn suave" onClick={() => ir('usuarios')}>Administrar usuarios</button></div>
      </>}
    </section>
  );
}
