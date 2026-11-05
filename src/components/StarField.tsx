/** Deterministic constellation background — subtle, no client JS. */
export default function StarField() {
  const stars = Array.from({ length: 70 }, (_, i) => {
    const x = ((i * 137.508) % 100).toFixed(2);
    const y = ((i * 61.803) % 100).toFixed(2);
    const r = 0.5 + ((i * 7) % 10) / 12;
    const delay = ((i * 13) % 40) / 10;
    return { x, y, r, delay };
  });
  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r / 10} fill="#D9B59D" className="star" style={{ animationDelay: `${s.delay}s` }} />
      ))}
    </svg>
  );
}
