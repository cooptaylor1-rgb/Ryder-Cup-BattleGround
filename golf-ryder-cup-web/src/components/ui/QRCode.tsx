/**
 * QR Code Component
 *
 * Renders a QR code entirely client-side using the `qrcode` library, so the
 * feature works offline (critical at a golf course) and doesn't leak trip
 * share URLs to a third-party image service. No external requests are made.
 *
 * The QR is generated as inline SVG for crisp scaling at any size. If
 * generation fails for any reason (unexpected input, etc.), we fall back to
 * a clear "QR unavailable" affordance rather than rendering a broken image.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className }: QRCodeProps) {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // QRCode.toString with type: 'svg' is fully synchronous for our inputs,
  // but the library still returns a Promise. Regenerate whenever the value
  // or size changes.
  useEffect(() => {
    let cancelled = false;
    setError(false);
    setSvgMarkup(null);

    if (!value) {
      setError(true);
      return;
    }

    QRCodeLib.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: size,
      color: {
        dark: '#0a0a0a',
        light: '#00000000', // transparent background — blends with the card
      },
    })
      .then((svg) => {
        if (!cancelled) setSvgMarkup(svg);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  const containerStyle = useMemo(
    () => ({
      width: size,
      height: size,
    }),
    [size],
  );

  if (error) {
    return (
      <div
        className={className}
        style={{
          ...containerStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--canvas-raised)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--rule)',
        }}
      >
        <p className="type-caption" style={{ color: 'var(--ink-tertiary)' }}>
          QR unavailable
        </p>
      </div>
    );
  }

  if (!svgMarkup) {
    // Render a same-sized placeholder to prevent layout shift on first paint.
    return (
      <div
        className={className}
        style={{
          ...containerStyle,
          background: 'var(--canvas-raised)',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label={`Generating QR code for ${value}`}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...containerStyle,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
      role="img"
      aria-label={`QR code for ${value}`}
      // The qrcode library returns a trusted, pre-rendered SVG with no
      // scripting or external references — safe to inline.
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

export default QRCode;
