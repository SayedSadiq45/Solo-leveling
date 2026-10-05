import { useEffect, useRef } from 'react';

/**
 * Full-screen thunder. Every `interval` a burst fires: a short flash plus a
 * few bolts grown by midpoint displacement from the top edge down past the
 * bottom, re-jittered a few times while they live so they crackle.
 *
 * One canvas, one rAF, paused when the tab is hidden. Disabled outright under
 * prefers-reduced-motion — a repeating full-screen flash is exactly the kind
 * of thing that setting exists for.
 */
const LIFE = 0.42;          // seconds a burst lasts
const CRACKLE = 0.05;       // seconds between re-jitters

function boltPath(x0, y0, x1, y1, depth, spread) {
  let pts = [[x0, y0], [x1, y1]];
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const nx = -(by - ay);
      const ny = bx - ax;
      const len = Math.hypot(nx, ny) || 1;
      const off = (Math.random() - 0.5) * spread;
      next.push([mx + (nx / len) * off, my + (ny / len) * off], [bx, by]);
    }
    pts = next;
    spread *= 0.55;
  }
  return pts;
}

export default function Thunder({
  interval = 500,
  color = '#cfeaff',
  glow = '#38a0ff',
  flash = 0.16
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let w = 0;
    let h = 0;
    let raf = null;
    let t = -1;                 // >= 0 while a burst plays
    let bolts = [];
    let crackleAt = 0;
    let nextAt = 0;
    let last = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function grow() {
      const count = 1 + Math.floor(Math.random() * 3);
      bolts = Array.from({ length: count }, () => {
        const x0 = w * (0.08 + Math.random() * 0.84);
        return {
          x0,
          // wander sideways on the way down, and always run past the bottom
          x1: x0 + (Math.random() - 0.5) * w * 0.5,
          width: 1.2 + Math.random() * 2.4,
          bright: 0.6 + Math.random() * 0.4,
          pts: null
        };
      });
      jitter();
    }

    function jitter() {
      for (const b of bolts) {
        b.pts = boltPath(b.x0, -h * 0.05, b.x1, h * 1.05, 6, w * 0.16);
      }
    }

    function render(now) {
      ctx.clearRect(0, 0, w, h);
      if (t < 0) return;

      const k = t / LIFE;
      // quick attack, long-ish decay
      const fade = k < 0.1 ? k / 0.1 : Math.pow(1 - (k - 0.1) / 0.9, 1.7);
      const flicker = 0.7 + 0.3 * Math.sin(now * 0.06);
      const a = fade * flicker;

      // sky flash
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `rgba(150,205,255,${flash * a})`);
      g.addColorStop(0.55, `rgba(90,160,255,${flash * a * 0.45})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const b of bolts) {
        ctx.beginPath();
        ctx.moveTo(b.pts[0][0], b.pts[0][1]);
        for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1]);

        ctx.shadowColor = glow;
        ctx.shadowBlur = 22;
        ctx.strokeStyle = glow;
        ctx.globalAlpha = a * b.bright * 0.55;
        ctx.lineWidth = b.width * 3.2;
        ctx.stroke();

        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.globalAlpha = a * b.bright;
        ctx.lineWidth = b.width;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (now >= nextAt) {
        t = 0;
        grow();
        crackleAt = 0;
        // vary a little so it does not read as a metronome
        nextAt = now + interval * (0.82 + Math.random() * 0.36);
      }

      if (t >= 0) {
        t += dt;
        crackleAt += dt;
        if (crackleAt >= CRACKLE) {
          crackleAt = 0;
          jitter();
        }
        if (t > LIFE) t = -1;
      }

      render(now);
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf) {
        last = performance.now();
        nextAt = last;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    last = performance.now();
    nextAt = last;
    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [interval, color, glow, flash]);

  return <canvas ref={canvasRef} className="thunder" aria-hidden="true" />;
}
