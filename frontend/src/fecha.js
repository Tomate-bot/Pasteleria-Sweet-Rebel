export function fechaNacimientoMaxima() {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
}
