import { useRef } from 'react';
import FrameCanvas from './components/FrameCanvas';
import RevealStage from './components/RevealStage';
import GlyphRain from './components/GlyphRain';
import SplashCursor from './components/SplashCursor';
import Thunder from './components/Thunder';
import { useInView, useScrollProgress, useSampled } from './lib/useInView';

const GLYPHS = '影君主覚醒軍団俺だけレベルアップな件死者陰兵アリスシャドウ0123';

/* ── 01 ────────────────────────────────────────────── 覚醒 / AWAKEN
   A tall section with a sticky stage: scrolling scrubs the 80-frame
   sequence from closed eyes to the full monarch glow.                */
function AwakenSection() {
  const [sectionRef, progress] = useScrollProgress();
  const phase = useSampled(progress);

  return (
    <section ref={sectionRef} className="awaken" id="awaken">
      <div className="awaken-sticky">
        <GlyphRain
          glyphs={GLYPHS}
          color="#1b2a44"
          headColor="#5aa8e8"
          opacity={0.3}
          speed={34}
          density={0.6}
          fontSize={16}
        />
        <FrameCanvas name="awaken" progressRef={progress} ease={0.14} focusY={0.42} />

        <div className="awaken-ui">
          <p className="kicker">
            <span className="jp">俺だけレベルアップな件</span>
            <span className="rule" />
            Solo Leveling
          </p>

          <h1 className="awaken-title" style={{ '--p': phase }}>
            <span className="jp-huge" aria-hidden="true">覚醒</span>
            <span className="latin">AWAKEN</span>
          </h1>

          <p className="awaken-sub">
            E-rank hunter. Weakest of all mankind.
            <br />
            <em>Keep scrolling — he is about to open his eyes.</em>
          </p>

          <div className="scroll-cue" data-done={phase > 0.9 ? 'true' : 'false'}>
            <span className="jp">下へ</span>
            <span className="cue-line" />
          </div>
        </div>

        <div className="awaken-meter" aria-hidden="true">
          <span style={{ transform: `scaleY(${phase})` }} />
        </div>
      </div>
    </section>
  );
}

/* ── 02 ──────────────────────────────── 影の君主 / SHADOW MONARCH
   Scrubbed by scroll, like the first section: the dragon uncoils from the
   left and sweeps around Jin-Woo across all 43 frames.                 */
function MonarchSection() {
  const [sectionRef, progress] = useScrollProgress();
  const [inViewRef, inView] = useInView(0.3);
  const phase = useSampled(progress);

  return (
    <section className="monarch" id="monarch" ref={sectionRef}>
      <div className="monarch-sticky" ref={inViewRef}>
        <FrameCanvas name="monarch" progressRef={progress} ease={0.16} />

        <GlyphRain
          glyphs={GLYPHS}
          color="#2f4d7a"
          headColor="#7fd8ff"
          opacity={0.42}
          speed={64}
        />

        {/* the fluid cursor lives only while this section holds the screen */}
        {inView && <SplashCursor active={inView} zIndex={4} DENSITY_DISSIPATION={4.2} />}

        <div className="monarch-ui">
          <p className="kicker light">
            <span className="rule" />
            <span className="jp">影の君主</span>
          </p>
          <h2 className="monarch-title">
            <span className="latin">SHADOW</span>
            <span className="latin outline">MONARCH</span>
          </h2>
          <p className="monarch-sub">
            <span className="jp">影よ、我に従え。</span>
            <br />
            Keep scrolling — the dragon answers.
          </p>
        </div>

        <div className="monarch-meter" aria-hidden="true">
          <span style={{ transform: `scaleY(${phase})` }} />
        </div>
      </div>
    </section>
  );
}

/* ── 03 ─────────────────────────────────────── 二面 / THE TWO FACES */
function RevealSection() {
  return (
    <section className="reveal" id="reveal">
    

      <RevealStage
        bottom={`${import.meta.env.BASE_URL}img/monarch-human.webp`}
        top={`${import.meta.env.BASE_URL}img/monarch-awakened.webp`}
      />
  <div className="reveal-head">
        <p className="kicker light">
          <span className="rule" />
          <span className="jp">二つの顔</span>
        </p>
        <h2 className="reveal-title">
          <span className="latin">ARISE</span>
          <span className="jp-mid">起きろ</span>
        </h2>
        <p className="reveal-sub">
          Sweep the portrait. What the world sees, and what waits underneath.
        </p>
      </div>
      <footer className="foot">
        <span className="jp">俺だけレベルアップな件</span>
        <span className="foot-rule" />
        <span>SOLO LEVELING — fan tribute</span>
      </footer>
    </section>
  );
}

export default function App() {
  return (
    <main>
      {/* storm over the whole page, above every section */}
      <Thunder interval={500} />

      <aside className="creator-aura" aria-label="Creator links">
        <div className="creator-aura-mark" aria-hidden="true">
          <span>AURA</span>
        </div>
        <div className="creator-aura-copy">
          <span className="creator-label">CREATOR</span>
          <strong>SAYED SADIQ</strong>
          <div className="creator-links">
            <a href="https://www.linkedin.com/in/sayed-sadiq45/" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <span aria-hidden="true">/</span>
            <a href="https://github.com/SayedSadiq45" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </aside>

      <AwakenSection />
      <MonarchSection />
      <RevealSection />
    </main>
  );
}
