type Props = {
  className?: string;
  title?: string;
};

/**
 * Raasta mark: the actual designed logo — a gateway arch containing a
 * location pin (with a filled destination dot) and a way-forward arrow that
 * completes the "R". Rendered as a raster image (public/logo-mark.png),
 * transparent background, deep forest green line art.
 */
export function RaastaMark({ className = "size-8", title = "Raasta AI" }: Props) {
  return <img src="/logo-mark.png" alt={title} className={`${className} object-contain`} />;
}

export function RaastaWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <RaastaMark className="size-9" />
      <span className="leading-none">
        <span className="block text-[17px] font-extrabold tracking-tight text-ink">
          RAASTA <span className="text-primary">AI</span>
        </span>
        {!compact && (
          <span className="mt-1 block text-[11px] font-medium text-muted">
            Your way forward
          </span>
        )}
      </span>
    </span>
  );
}
