interface StarsProps {
  value: number;
  /** Alto de cada estrella en px. */
  size?: number;
  className?: string;
}

const Star = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M10 1.5l2.47 5.32 5.53.62-4.1 3.9 1.09 5.66L10 14.3l-4.99 2.7 1.09-5.66-4.1-3.9 5.53-.62L10 1.5z" />
  </svg>
);

/**
 * Puntuación de 0 a 5. Se pintan dos capas idénticas y la superior se recorta al
 * porcentaje exacto, de modo que 4.3 se ve como 4.3 y no como 4.
 */
export function Stars({ value, size = 12, className = "" }: StarsProps) {
  const clamped = Math.min(5, Math.max(0, value));
  const percent = (clamped / 5) * 100;

  return (
    <span
      className={`relative inline-flex ${className}`}
      role="img"
      aria-label={`${clamped} de 5 estrellas`}
    >
      <span className="flex gap-0.5 text-line" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={size} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-0.5 overflow-hidden text-yellow-600"
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="shrink-0">
            <Star size={size} />
          </span>
        ))}
      </span>
    </span>
  );
}
