/**
 * Simple QR Code Component
 *
 * Generates a QR code as an SVG using a hosted API service.
 * Falls back to displaying the code as text if image fails to load.
 */
'use client';

import { useState } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className }: QRCodeProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
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

  return (
    <div className={className} style={{ textAlign: 'center' }}>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=8&format=svg`}
        alt={`QR code for ${value}`}
        width={size}
        height={size}
        style={{ borderRadius: 'var(--radius-md)' }}
        onError={() => setError(true)}
      />
    </div>
  );
}

export default QRCode;
