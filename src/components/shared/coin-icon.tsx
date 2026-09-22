import { cn } from "@/lib/utils";

interface CoinGlyphProps {
  symbol: string;
  color: string;
  size: number;
}

/** Original, lightweight coin glyphs (no third-party brand assets). */
function CoinGlyph({ symbol, color, size }: CoinGlyphProps) {
  const fs = Math.round(size * 0.46);
  switch (symbol) {
    case "BTC":
      return <span style={{ color, fontSize: fs }} className="font-bold leading-none">₿</span>;
    case "ETH":
      return (
        <svg width={size * 0.5} height={size * 0.6} viewBox="0 0 16 20" aria-hidden>
          <path d="M8 0L16 10.2 8 14.6 0 10.2 8 0Z" fill={color} fillOpacity="0.95" />
          <path d="M8 16.2L16 11.8 8 20 0 11.8 8 16.2Z" fill={color} fillOpacity="0.6" />
        </svg>
      );
    case "USDT":
      return <span style={{ color, fontSize: fs }} className="font-bold leading-none">₮</span>;
    case "SOL":
      return (
        <svg width={size * 0.52} height={size * 0.42} viewBox="0 0 18 14" aria-hidden>
          <rect x="1" y="0" width="16" height="2.6" rx="1.3" fill={color} transform="skewX(-14)" />
          <rect x="3" y="5.7" width="16" height="2.6" rx="1.3" fill={color} opacity="0.75" transform="skewX(-14)" />
          <rect x="1" y="11.4" width="16" height="2.6" rx="1.3" fill={color} transform="skewX(-14)" />
        </svg>
      );
    default:
      return (
        <span style={{ color, fontSize: fs }} className="font-semibold leading-none">
          {symbol.charAt(0)}
        </span>
      );
  }
}

export function CoinIcon({
  symbol,
  color,
  size = 36,
  className,
}: {
  symbol: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}1f`,
        // @ts-expect-error CSS custom property
        "--tw-ring-color": `${color}38`,
      }}
    >
      <CoinGlyph symbol={symbol} color={color} size={size} />
    </span>
  );
}
