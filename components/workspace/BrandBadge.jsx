export function BrandBadge({ name, color = '#007AFF', size = 20 }) {
  const initials = String(name || '?').trim().slice(0, 2).toUpperCase();
  return (
    <span className="grid place-items-center rounded-md font-extrabold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.42 }}>
      {initials}
    </span>
  );
}
