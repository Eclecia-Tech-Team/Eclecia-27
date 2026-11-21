"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * The festival pass, drawn on the device. Never sent to a third-party QR
 * service: the payload is the holder's signed id, and the gate may be offline.
 */
export function PassQr({ payload, className = "" }: { payload: string; className?: string }) {
  const [svg, setSvg] = useState<{ for: string; markup: string } | null>(null);

  useEffect(() => {
    let live = true;
    QRCode.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#000000", light: "#ffffff" } })
      .then((markup) => live && setSvg({ for: payload, markup }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [payload]);

  if (svg?.for !== payload) return <div className={className} aria-busy="true" />;
  return <div role="img" aria-label="Festival pass QR" className={`[&>svg]:h-full [&>svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: svg.markup }} />;
}
