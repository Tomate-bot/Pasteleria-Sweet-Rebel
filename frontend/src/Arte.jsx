// Ilustraciones en SVG propio (sin imágenes externas: funciona sin internet).
export function Pastel({ className }) {
  const gota = (x, c) => <path d={`M${x} 70 q6 26 12 0z`} fill={c} />;
  return (
    <svg className={className} viewBox="0 0 240 250" role="img" aria-label="Pastel de tres pisos con cereza">
      <ellipse cx="120" cy="226" rx="108" ry="14" fill="#f6d9e0" /><ellipse cx="120" cy="222" rx="96" ry="10" fill="#fff9ef" stroke="#c99a3b" strokeWidth="2" />
      <rect x="38" y="146" width="164" height="72" rx="12" fill="#5a1730" /><rect x="38" y="172" width="164" height="9" fill="#fff1f3" />
      <rect x="56" y="102" width="128" height="50" rx="12" fill="#f9c9d4" /><rect x="56" y="124" width="128" height="7" fill="#fff9ef" />
      <rect x="74" y="64" width="92" height="44" rx="12" fill="#fff9ef" stroke="#f0dfc8" />
      <path d="M72 66 h96 v6 q-4 0 -4 0 q-3 22 -10 0 q-4 0 -6 0 q-4 26 -12 0 q-5 0 -6 0 q-3 18 -10 0 q-5 0 -6 0 q-4 24 -12 0 q-4 0 -6 0 q-3 16 -10 0 q-6 0 -14 0z" fill="#c4274f" />
      {[[66,156,"#a8d5b5"],[98,160,"#f3c969"],[132,154,"#fff1f3"],[168,160,"#a8d5b5"],[82,132,"#c4274f"],[150,136,"#5a1730"],[114,134,"#f3c969"]].map(([x,y,c],i)=><rect key={i} x={x} y={y} width="12" height="4" rx="2" fill={c} transform={`rotate(${i*37} ${x} ${y})`} />)}
      <path d="M121 54 q4 -22 20 -26" stroke="#2f6b45" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="120" cy="52" r="12" fill="#c4274f" /><circle cx="115" cy="48" r="3.5" fill="#fff" opacity=".6" />
      {[[26,60],[212,86],[200,28],[34,128]].map(([x,y],i)=><path key={i} d={`M${x} ${y-9} q1 8 9 9 q-8 1 -9 9 q-1 -8 -9 -9 q8 -1 9 -9z`} fill="#c99a3b" />)}
    </svg>
  );
}
export const ICONO = { inicio: '🧁', productos: '🍰', categorias: '🍪', reposteros: '👩‍🍳', clientes: '💌', pedidos: '🛍️', privacidad: '🔒', cuenta: '🎀', compras: '💳', encuesta: '⭐' };
const EMO = [[/pastel|cake|bizcocho|naranja/i,'🎂'],[/pay|tarta|tart|queso/i,'🥧'],[/galleta|cookie/i,'🍪'],[/pan|concha|bolillo|baguette/i,'🥖'],[/dona|donut/i,'🍩'],[/cupcake|muffin/i,'🧁'],[/chocolate|brownie|cacao/i,'🍫'],[/flan|gelatina/i,'🍮'],[/helado|nieve/i,'🍨'],[/croissant|cuerno/i,'🥐'],[/fresa|frutas?/i,'🍓']];
export const emojiDe = (n = '') => (EMO.find(([r]) => r.test(n)) || [0, '🍰'])[1];
