import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Pastel } from './Arte.jsx';
import { Postre } from './Postres.jsx';

const money = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

/** Inicio del cliente y del perfil de consulta: portada, colecciones y destacados. */
export function InicioCliente({ p, ir }) {
  const [prods, setProds] = useState(null);
  const [cats, setCats] = useState([]);
  useEffect(() => {
    api('/api/productos').then((l) => setProds(l.slice(0, 4))).catch(() => setProds([]));
    api('/api/categorias').then((l) => setCats(l.slice(0, 4))).catch(() => {});
  }, []);
  return (
    <section>
      <div className="portada">
        <div><small>Sweet Rebel</small><h1>Repostería artesanal con carácter.</h1>
          <p className="nota">Hola, {p.nombre}. Elige tus postres favoritos y pídelos en minutos.</p>
          <button className="btn" onClick={() => ir('productos')}>Ver productos</button></div>
        <Pastel className="arte" />
      </div>
      {cats.length > 0 && <><h2>Nuestras colecciones</h2>
        <div className="colecciones">{cats.map((c) => <button key={c.id} className="coleccion" onClick={() => ir('categorias')}><Postre nombre={c.nombre} /><b>{c.nombre}</b></button>)}</div></>}
      <h2>Destacados</h2>
      {prods === null ? <div className="vacio">Cargando…</div> : prods.length === 0 ? <div className="vacio">Todavía no hay productos.</div> : (
        <div className="colecciones">{prods.map((x) => <button key={x.id} className="coleccion" onClick={() => ir('productos')}><Postre id={x.id} nombre={x.nombre} /><b>{x.nombre}</b><span className="nota">{money(x.precio)}</span></button>)}</div>)}
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
