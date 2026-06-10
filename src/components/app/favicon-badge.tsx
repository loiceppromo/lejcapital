'use client';

import { useEffect, useRef } from 'react';

/**
 * Dynamically renders a badge count onto the favicon.
 * Uses a canvas to overlay a red circle with the count number
 * onto the existing favicon, then replaces the link[rel=icon] href.
 */
export function FaviconBadge({ count }: { count: number }) {
  const originalHrefRef = useRef<string | null>(null);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;

    // Store original on first mount
    if (!originalHrefRef.current) {
      originalHrefRef.current = link.href;
    }

    if (count <= 0) {
      // Restore original favicon
      if (originalHrefRef.current) {
        link.href = originalHrefRef.current;
      }
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original icon
      ctx.drawImage(img, 0, 0, size, size);

      // Draw badge circle
      const badgeSize = count > 9 ? 30 : 26;
      const cx = size - badgeSize / 2 - 2;
      const cy = badgeSize / 2 + 2;

      ctx.beginPath();
      ctx.arc(cx, cy, badgeSize / 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw count text
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${count > 9 ? 16 : 20}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count > 99 ? '99+' : String(count), cx, cy + 1);

      // Apply
      link.href = canvas.toDataURL('image/png');
    };
    img.src = originalHrefRef.current ?? link.href;

    return () => {
      // Restore original on unmount
      if (originalHrefRef.current && link) {
        link.href = originalHrefRef.current;
      }
    };
  }, [count]);

  return null; // Renders nothing — side effect only
}
