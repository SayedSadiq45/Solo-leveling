import { useEffect, useRef } from 'react';
import { useAtlas, nearestLoaded } from '../lib/useAtlas';

/**
 * Draws an atlas sequence, cover-fitted to its box.
 *
 * `progressRef` is a ref holding a 0..1 target. The canvas eases toward it on
 * its own rAF loop, so scroll and pointer handlers stay cheap.
 *
 * When the metadata carries `dragonX` — where the subject sits in each frame —
 * progress is mapped onto that *position* rather than onto the frame index.
 * The frames are unevenly spaced, so indexing directly would stall the dragon
 * at one end and then race it across.
 */
export default function FrameCanvas({
  name,
  progressRef,
  ease = 0.12,
  focusY = 0.5,
  fit = 'cover',
  zoom = 1,
  onReady,
  className = ''
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const { framesRef, loadedRef, meta, ready } = useAtlas(name);

  useEffect(() => {
    if (!ready) return;
    onReady?.();

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const pos = meta.dragonX || null;
    const last = meta.count - 1;

    let raf = null;
    let w = 0;
    let h = 0;
    let shown = progressRef.current ?? 0;
    let drawnAt = -1;
    let settle = 0;          // 0 while moving, ramps to 1 once at rest

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      drawnAt = -1;
    }

    /** progress -> fractional frame index */
    function indexAt(p) {
      if (!pos) return p * last;

      // Bend progress so the middle of the box is the middle of the travel,
      // even though the tracked positions are not centred on it.
      const lo = pos[0];
      const hi = pos[last];
      const target = p < 0.5
        ? lo + (0.5 - lo) * (p / 0.5)
        : 0.5 + (hi - 0.5) * ((p - 0.5) / 0.5);

      if (target <= pos[0]) return 0;
      if (target >= pos[last]) return last;
      for (let i = 0; i < last; i++) {
        if (target <= pos[i + 1]) {
          const span = pos[i + 1] - pos[i];
          return i + (span > 1e-6 ? (target - pos[i]) / span : 0);
        }
      }
      return last;
    }

    function place(sw, sh) {
      // A 16:9 frame cannot fill a portrait box without losing the subject, so
      // narrow boxes always fit to width. `fit="contain"` asks for that on any
      // shape — used where the full width of the frame carries the content.
      const portrait = w / h < (sw / sh) * 0.62;
      const whole = fit === 'contain' || portrait;
      const scale = whole
        ? Math.min(w / sw, h / sh)
        : Math.max(w / sw, h / sh);
      const dw = sw * scale * zoom;
      const dh = sh * scale * zoom;
      return [(w - dw) / 2, whole ? (h - dh) / 2 : (h - dh) * focusY, dw, dh];
    }

    function blit(index, alpha) {
      // frames stream in, so fall back to the closest one that has decoded
      const im = nearestLoaded(framesRef.current, index);
      if (!im) return;
      const [dx, dy, dw, dh] = place(im.naturalWidth, im.naturalHeight);
      ctx.globalAlpha = alpha;
      ctx.drawImage(im, dx, dy, dw, dh);
    }

    function draw(fi) {
      let a = Math.floor(fi);
      let b = Math.min(last, a + 1);
      const t = fi - a;

      // Dissolve between neighbours so a short sequence does not read as
      // stepping. Smoothstep keeps the pass through 50/50 brief, which is
      // where a blend is most visible as two overlapping subjects.
      const k = t * t * (3 - 2 * t);

      ctx.clearRect(0, 0, w, h);
      blit(a, 1);
      if (b !== a && k > 0.001) blit(b, k);
      ctx.globalAlpha = 1;
    }

    function frame() {
      const target = progressRef.current ?? 0;
      const moving = Math.abs(target - shown) > 0.0006;
      shown += (target - shown) * ease;
      if (!moving) shown = target;

      // While moving, neighbouring frames dissolve into each other so the
      // sweep reads as motion. Once it stops, resolve to the nearest single
      // frame — resting on a 50/50 blend would just look like a double image.
      settle = moving ? 0 : Math.min(1, settle + 0.06);
      let fi = indexAt(shown);
      if (settle > 0) {
        const e = settle * settle * (3 - 2 * settle);
        fi += (Math.round(fi) - fi) * e;
      }

      // While frames are still arriving, repaint every tick so a stand-in gets
      // replaced the moment its real frame decodes.
      const streaming = loadedRef.current < meta.count;
      if (Math.abs(fi - drawnAt) > 0.003 || streaming) {
        drawnAt = fi;
        draw(fi);
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    if (reduced) {
      draw(indexAt(progressRef.current ?? 0));
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf && !reduced) {
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready, framesRef, loadedRef, meta, progressRef, ease, focusY, fit, zoom, onReady]);

  return (
    <div ref={wrapRef} className={`frame-canvas ${ready ? 'is-ready' : ''} ${className}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
