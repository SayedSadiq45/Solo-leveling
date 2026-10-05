import { useEffect, useRef, useState } from 'react';

/**
 * Two stacked images; the pointer carries a soft trailing lens that reveals
 * the `top` image through the `bottom` one. Falls back to a slow drifting
 * lens when the pointer never arrives (touch, reduced motion).
 */
export default function RevealStage({
  bottom,
  top,
  overlay = 'rgba(6,8,16,0.55)',
  trailLength = 16
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const off = document.createElement('canvas');
    const offc = off.getContext('2d');

    let w = 0, h = 0, dpr = 1, radius = 160;
    let raf = null;
    let touched = false;
    const pointer = { x: -9999, y: -9999 };
    const smooth = { x: -9999, y: -9999 };
    let trail = [];

    const imgs = {};
    let loaded = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      for (const c of [canvas, off]) {
        c.width = Math.floor(w * dpr);
        c.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offc.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.max(120, Math.min(w, h) * 0.26);
    }

    /** cover-fit: the stage is full-bleed, so the image fills it edge to edge */
    function cover(img) {
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      return [(w - dw) / 2, (h - dh) / 2, dw, dh];
    }

    function draw() {
      // The lens belongs to the pointer: it rests where it was left rather
      // than wandering the frame by itself.
      if (smooth.x < -1000 && touched) { smooth.x = pointer.x; smooth.y = pointer.y; }
      smooth.x += (pointer.x - smooth.x) * 0.13;
      smooth.y += (pointer.y - smooth.y) * 0.13;

      if (touched) {
        trail.unshift({ x: smooth.x, y: smooth.y });
        if (trail.length > trailLength) trail.length = trailLength;
      }

      ctx.clearRect(0, 0, w, h);
      const cb = cover(imgs.bottom);
      // Grade the base down. The two portraits are near-identical across the
      // suit, so without this the lens looks like it is doing nothing there.
      ctx.filter = 'grayscale(1) brightness(0.62) contrast(1.05)';
      ctx.drawImage(imgs.bottom, cb[0], cb[1], cb[2], cb[3]);
      ctx.filter = 'none';
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, w, h);

      // build the lens mask, then paint the top image only inside it
      offc.clearRect(0, 0, w, h);
      offc.globalCompositeOperation = 'source-over';
      for (let i = 0; i < trail.length; i++) {
        const k = 1 - i / trail.length;
        const r = radius * (0.28 + 0.72 * k);
        const a = Math.pow(k, 1.5);
        // a soft-edged disc, so the reveal feathers out instead of cutting
        const g = offc.createRadialGradient(
          trail[i].x, trail[i].y, 0,
          trail[i].x, trail[i].y, r
        );
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.82, `rgba(0,0,0,${a})`);   // solid core
        g.addColorStop(1, 'rgba(0,0,0,0)');         // thin feathered rim
        offc.beginPath();
        offc.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
        offc.fillStyle = g;
        offc.fill();
      }
      offc.globalCompositeOperation = 'source-in';
      const ct = cover(imgs.top);
      offc.drawImage(imgs.top, ct[0], ct[1], ct[2], ct[3]);
      offc.globalCompositeOperation = 'source-over';
      ctx.drawImage(off, 0, 0, w, h);

      // cyan bloom and rim on the head of the trail
      const head = trail[0];
      if (head) {
        ctx.beginPath();
        ctx.arc(head.x, head.y, radius * 0.98, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(159,228,255,0.28)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, radius * 1.5);
        g.addColorStop(0, 'rgba(190,235,255,0.22)');
        g.addColorStop(0.45, 'rgba(56,160,255,0.14)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(head.x, head.y, radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    function onMove(e) {
      const r = wrap.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      const x = p.clientX - r.left;
      const y = p.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;
      pointer.x = x;
      pointer.y = y;
      touched = true;
    }

    function start() {
      resize();
      setReady(true);
      if (reduced) { draw(); cancelAnimationFrame(raf); raf = null; return; }
      raf = requestAnimationFrame(draw);
    }

    for (const [key, src] of [['bottom', bottom], ['top', top]]) {
      const im = new Image();
      im.onload = () => { if (++loaded === 2) start(); };
      im.src = src;
      imgs[key] = im;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, [bottom, top, overlay, trailLength]);

  return (
    <div ref={wrapRef} className={`reveal-stage ${ready ? 'is-ready' : ''}`}>
      <canvas ref={canvasRef} aria-label="Sung Jin-Woo, revealed" role="img" />
    </div>
  );
}
