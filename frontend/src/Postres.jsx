import { useState } from 'react';

/* Ilustraciones propias (sin internet). Si existe una foto real en /public/productos/<id>.jpg, se usa en su lugar. */
const T = (p) => <>{p}</>;
const DIBUJOS = {
  torta: T(<><ellipse cx="60" cy="106" rx="46" ry="6" fill="#e6dccd" /><rect x="22" y="72" width="76" height="30" rx="6" fill="#5b3a29" /><rect x="22" y="60" width="76" height="14" rx="4" fill="#f3e6d3" /><rect x="30" y="40" width="60" height="22" rx="6" fill="#8a5a3b" /><path d="M30 44 q8 14 15 0 q8 18 15 0 q8 14 15 0 q6 10 15 0 v-6 h-60z" fill="#fffaf1" /><circle cx="60" cy="32" r="7" fill="#b3402f" /><path d="M60 25 q3-8 9-9" stroke="#4d6a49" strokeWidth="2.5" fill="none" /></>),
  cupcake: T(<><path d="M32 68 h56 l-8 36 h-40z" fill="#b88a4a" /><path d="M42 68 v36 M54 68 v36 M66 68 v36 M78 68 v36" stroke="#9a7138" strokeWidth="2" /><path d="M28 68 q-4-18 14-20 q2-18 18-18 q16 0 18 18 q18 2 14 20z" fill="#f1d9cc" /><circle cx="60" cy="24" r="6" fill="#b3402f" /></>),
  dona: T(<><circle cx="60" cy="62" r="46" fill="#d9a766" /><circle cx="60" cy="58" r="40" fill="#7a4e33" /><circle cx="60" cy="58" r="13" fill="#f6f1ea" />{[[34,40,20],[80,36,-30],[88,66,60],[50,84,10],[30,66,-50],[70,86,40]].map(([x, y, r], i) => <rect key={i} x={x} y={y} width="9" height="3.5" rx="1.7" fill={['#fffaf1', '#e9c46a', '#b3402f'][i % 3]} transform={`rotate(${r} ${x} ${y})`} />)}</>),
  galleta: T(<><circle cx="60" cy="62" r="44" fill="#d9a766" /><circle cx="60" cy="62" r="40" fill="none" stroke="#b88a4a" strokeWidth="3" strokeDasharray="3 6" />{[[44,48],[72,46],[58,66],[80,72],[40,76],[64,88]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5 + (i % 2)} fill="#4a2f20" />)}</>),
  croissant: T(<><path d="M12 80 Q18 36 60 32 Q102 36 108 80 Q94 70 84 76 Q74 56 60 56 Q46 56 36 76 Q26 70 12 80z" fill="#d9a766" /><path d="M44 42 q4 14 -2 28 M60 36 v22 M76 42 q-4 14 2 28" stroke="#b07a3a" strokeWidth="3" fill="none" strokeLinecap="round" /></>),
  pay: T(<><ellipse cx="60" cy="100" rx="46" ry="7" fill="#e6dccd" /><path d="M14 68 h92 l-10 30 h-72z" fill="#d9a766" /><ellipse cx="60" cy="68" rx="46" ry="14" fill="#f3e6d3" /><ellipse cx="60" cy="66" rx="38" ry="10" fill="#e9c46a" /><path d="M34 60 l52 12 M50 56 l36 14 M34 70 l40-14 M60 56 l-22 14" stroke="#b88a4a" strokeWidth="2.5" /></>),
  pan: T(<><ellipse cx="60" cy="102" rx="48" ry="7" fill="#e6dccd" /><path d="M14 84 q0-40 46-40 q46 0 46 40 q0 14-46 14 q-46 0-46-14z" fill="#c98c4f" /><path d="M38 58 l10 20 M58 54 l8 24 M78 58 l8 20" stroke="#f3e6d3" strokeWidth="5" strokeLinecap="round" /></>),
};
const TIPOS = [[/pay|tarta|tart|queso/i, 'pay'], [/galleta|cookie/i, 'galleta'], [/pan|concha|bolillo|baguette/i, 'pan'], [/dona|donut/i, 'dona'], [/cupcake|muffin/i, 'cupcake'], [/croissant|cuerno/i, 'croissant']];

export function Postre({ id, nombre, className = '' }) {
  const [foto, setFoto] = useState(!!id);
  const tipo = (TIPOS.find(([r]) => r.test(nombre || '')) || [0, 'torta'])[1];
  return (
    <span className={'postre ' + className} aria-hidden="true">
      {foto ? <img src={`/productos/${id}.jpg`} alt="" loading="lazy" onError={() => setFoto(false)} /> : <svg viewBox="0 0 120 120">{DIBUJOS[tipo]}</svg>}
    </span>
  );
}
