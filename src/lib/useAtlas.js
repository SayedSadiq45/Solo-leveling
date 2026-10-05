import { useEffect, useRef, useState } from 'react';

/**
 * Loads a sequence of individual frames (see scripts/pack_frames.py).
 *
 * Every frame is its own file at native resolution — no sprite sheet, which
 * at this size no browser would decode in one image. All of them start
 * loading at once and the canvas draws whatever has arrived, so the section
 * is usable long before the last frame lands.
 *
 * Small screens and low-DPR displays get the half-size set.
 */
export function useAtlas(name) {
  const framesRef = useRef([]);
  const loadedRef = useRef(0);
  const [state, setState] = useState({ meta: null, ready: false });

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL;
    const half =
      window.innerWidth < 900 || (window.devicePixelRatio || 1) < 1.5;
    const dir = half ? `${name}-half` : name;

    fetch(`${base}frames/${name}.json`)
      .then(r => r.json())
      .then(meta => {
        if (cancelled) return;

        const frames = new Array(meta.count);
        loadedRef.current = 0;
        const count = () => { loadedRef.current += 1; };
        for (let i = 0; i < meta.count; i++) {
          const img = new Image();
          img.decoding = 'async';
          // the opening frames decide how soon the section can be shown
          if (i < 4) img.fetchPriority = 'high';
          img.addEventListener('load', count, { once: true });
          img.addEventListener('error', count, { once: true });
          img.src = `${base}frames/${dir}/${String(i).padStart(3, '0')}.webp`;
          frames[i] = img;
        }
        framesRef.current = frames;

        const first = frames[0];
        const show = () => !cancelled && setState({ meta, ready: true });
        if (first.complete && first.naturalWidth) show();
        else first.onload = show;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      framesRef.current = [];
      loadedRef.current = 0;
    };
  }, [name]);

  return { framesRef, loadedRef, meta: state.meta, ready: state.ready };
}

/** The frame at `index`, or the nearest one that has actually decoded. */
export function nearestLoaded(frames, index) {
  const ok = im => im && im.complete && im.naturalWidth > 0;
  if (ok(frames[index])) return frames[index];
  for (let d = 1; d < frames.length; d++) {
    if (ok(frames[index - d])) return frames[index - d];
    if (ok(frames[index + d])) return frames[index + d];
  }
  return null;
}
