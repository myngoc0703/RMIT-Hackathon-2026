"use client";

import { useEffect, useRef, useState } from "react";
import type { Artwork } from "@/lib/gallery";
import { embed } from "@/lib/watermark";

type Mark = { code: number; label: string };

// Draws an artwork onto a canvas: there is no <img> or file URL to save, right-click and drag are
// blocked, and when `mark` is given the copy carries this viewer's visible and invisible watermark.
// `src` overrides the image to draw (used to show an unlocked original with the collector's mark).
export default function ArtCanvas({ art, width, mark, className, src }: { art: Artwork; width: number; mark?: Mark; className?: string; src?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [px, setPx] = useState(0);

  // Marked copies are drawn at the screen's real pixel size, so a screenshot keeps the hidden mark 1:1.
  useEffect(() => {
    const c = ref.current;
    if (!c || !mark) return;
    const ro = new ResizeObserver(() => setPx(Math.round(c.clientWidth * (window.devicePixelRatio || 1))));
    ro.observe(c);
    return () => ro.disconnect();
  }, [mark]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const w = mark && px ? px : Math.round(width);
    const h = Math.round(w * art.ratio);
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: !!mark });
    if (!ctx) return;
    let cancelled = false;

    const draw = (picture?: HTMLImageElement) => {
      if (cancelled) return;
      ctx.fillStyle = art.bg;
      ctx.fillRect(0, 0, w, h);
      if (picture) ctx.drawImage(picture, 0, 0, w, h);
      for (const s of picture ? [] : art.shapes) {
        ctx.fillStyle = s.c;
        if (s.k === "circle") {
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r * Math.min(w, h) * 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate((s.x + s.w / 2) * w, (s.y + s.h / 2) * h);
          ctx.rotate(((s.rot ?? 0) * Math.PI) / 180);
          ctx.beginPath();
          ctx.roundRect(-(s.w * w) / 2, -(s.h * h) / 2, s.w * w, s.h * h, (s.r ?? 0) * w);
          ctx.fill();
          ctx.restore();
        }
      }

      if (mark) {
        // Visible mark: faint, diagonal, tiled, so a crop or phone photo still names the viewer.
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "#ffffff";
        ctx.font = `${Math.max(11, Math.round(w / 55))}px system-ui, sans-serif`;
        ctx.rotate(-Math.PI / 8);
        const text = `W2W · ${mark.label} · ${new Date().toLocaleDateString()}`;
        const step = ctx.measureText(text).width + 60;
        for (let y = -h; y < h * 2; y += Math.max(70, w / 9)) {
          for (let x = -w; x < w * 2; x += step) ctx.fillText(text, x, y);
        }
        ctx.restore();
        // Invisible mark: the viewer code hidden in the pixels themselves.
        const img = ctx.getImageData(0, 0, w, h);
        embed(img, mark.code);
        ctx.putImageData(img, 0, 0);
      }
    };

    const source = src ?? art.image;
    if (source) {
      const picture = new Image();
      picture.onload = () => draw(picture);
      picture.src = source;
    } else draw();
    return () => {
      cancelled = true;
    };
  }, [art, width, mark, px, src]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: "100%", height: "auto", display: "block", borderRadius: 6, userSelect: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      aria-label={`${art.title}, protected artwork`}
      role="img"
    />
  );
}
