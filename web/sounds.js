/* AZLAN WORLD CHAT — sound effects + voice effects.
   All sounds are generated with the Web Audio API (no audio files needed).
   Voice effects (normal / deep / robot / echo) are applied at playback
   time to recorded voice messages. Original work. */
(function () {
  let ctx = null;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, vol) {
    const a = ac(); const o = a.createOscillator(); const g = a.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const v = (vol || 0.15) * (window.AWC_SPEAKER_VOL == null ? 1 : window.AWC_SPEAKER_VOL);
    g.gain.setValueAtTime(v, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + start + dur);
    o.connect(g); g.connect(a.destination);
    o.start(a.currentTime + start); o.stop(a.currentTime + start + dur);
  }
  const SFX = {
    // short chime when a gift is sent
    gift() { tone(880, 0, 0.18, 'sine'); tone(1318, 0.09, 0.25, 'sine'); tone(1760, 0.18, 0.35, 'triangle'); },
    // big-gift fanfare
    giftBig() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.18)); },
    join() { tone(523, 0, 0.12, 'sine'); tone(784, 0.08, 0.2, 'sine'); },
    micOn() { tone(1200, 0, 0.08, 'square', 0.06); },
    micOff() { tone(500, 0, 0.1, 'square', 0.06); },
    notify() { tone(988, 0, 0.12, 'sine'); tone(988, 0.14, 0.12, 'sine'); },
    lucky() { [400, 600, 800, 1000, 1200, 1600].forEach((f, i) => tone(f, i * 0.06, 0.12, 'sine', 0.12)); },
    levelUp() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.35, 'triangle', 0.18)); },
    coin() { tone(1568, 0, 0.1, 'sine'); tone(2093, 0.07, 0.2, 'sine'); },
    error() { tone(220, 0, 0.2, 'sawtooth', 0.08); },
    // --- per-gift sounds (3-second gift animations) ---
    roar() { // lion roar: low growl + noise
      const a = ac(); const dur = 2.4;
      const o = a.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(75, a.currentTime);
      o.frequency.linearRampToValueAtTime(55, a.currentTime + dur);
      const lfo = a.createOscillator(); lfo.frequency.value = 11;
      const lg = a.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
      const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, a.currentTime + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.connect(f); f.connect(g); g.connect(a.destination);
      o.start(); lfo.start(); o.stop(a.currentTime + dur); lfo.stop(a.currentTime + dur);
      noiseBurst(a, 0, dur, 300, 0.25);
    },
    whoosh() { // rocket / flying: filtered noise sweep
      const a = ac(); const dur = 1.4;
      const src = noiseSrc(a); const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(300, a.currentTime);
      f.frequency.exponentialRampToValueAtTime(2400, a.currentTime + dur);
      const g = a.createGain();
      g.gain.setValueAtTime(0.001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, a.currentTime + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      src.connect(f); f.connect(g); g.connect(a.destination);
      src.start(); src.stop(a.currentTime + dur);
    },
    engine() { // car: rising engine rev
      const a = ac(); const o = a.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(220, a.currentTime + 1.2);
      o.frequency.exponentialRampToValueAtTime(90, a.currentTime + 2.2);
      const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = a.createGain();
      g.gain.setValueAtTime(0.12, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 2.3);
      o.connect(f); f.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + 2.3);
    },
    pop() { tone(600, 0, 0.12, 'sine', 0.25); tone(180, 0.08, 0.15, 'sine', 0.2); },
    spray() { const a = ac(); noiseBurst(a, 0, 0.7, 6000, 0.12, 'highpass'); },
    magic() { [392, 523, 659, 784, 1046, 1318].forEach((fr, i) => tone(fr, i * 0.08, 0.3, 'sine', 0.12)); },
    thunder() { const a = ac(); noiseBurst(a, 0, 2.2, 180, 0.4, 'lowpass'); tone(55, 0, 1.8, 'sine', 0.3); },
    sparkle() { [1568, 1760, 2093, 2637].forEach((fr, i) => tone(fr, i * 0.07, 0.25, 'triangle', 0.1)); },
    steam() { const a = ac(); noiseBurst(a, 0, 1.0, 1200, 0.08, 'bandpass'); tone(880, 0.1, 0.3, 'sine', 0.08); }
  };
  function noiseSrc(a) {
    const len = a.sampleRate * 2;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf; return src;
  }
  function noiseBurst(a, start, dur, freq, vol, type) {
    const src = noiseSrc(a);
    const f = a.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq;
    const g = a.createGain();
    g.gain.setValueAtTime(vol || 0.2, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + start + dur);
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(a.currentTime + start); src.stop(a.currentTime + start + dur);
  }
  // Play a gift's own sound by key (roar, whoosh, engine, pop, spray, magic, thunder, sparkle, steam, chime, fanfare)
  SFX.giftSound = function (key) {
    if (window.SFX_MUTED) return;
    try {
      if (key === 'roar') SFX.roar();
      else if (key === 'whoosh') SFX.whoosh();
      else if (key === 'engine') SFX.engine();
      else if (key === 'pop') SFX.pop();
      else if (key === 'spray') SFX.spray();
      else if (key === 'magic') SFX.magic();
      else if (key === 'thunder') SFX.thunder();
      else if (key === 'sparkle') SFX.sparkle();
      else if (key === 'steam') SFX.steam();
      else if (key === 'fanfare') SFX.giftBig();
      else SFX.gift();
    } catch (e) { /* audio not available */ }
  };
  window.SFX = SFX;

  /* Voice effects for playback of a voice-message URL.
     - normal: play as recorded
     - deep: slow playback (0.7x) + lowpass
     - robot: square-wave-ish ring modulation via waveshaper
     - echo: delay feedback loop */
  window.playVoiceWithEffect = function (url, effect) {
    const a = ac();
    fetch(url).then(r => r.arrayBuffer()).then(buf => a.decodeAudioData(buf)).then(audioBuf => {
      const src = a.createBufferSource(); src.buffer = audioBuf;
      let node = src;
      if (effect === 'deep') {
        src.playbackRate.value = 0.7;
        const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
        src.connect(lp); node = lp;
      } else if (effect === 'robot') {
        const shaper = a.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) curve[i] = Math.sign(i - 128) * 0.6;
        shaper.curve = curve;
        const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
        src.connect(shaper); shaper.connect(lp); node = lp;
      } else if (effect === 'echo') {
        const delay = a.createDelay(1); delay.delayTime.value = 0.28;
        const fb = a.createGain(); fb.gain.value = 0.45;
        src.connect(delay); delay.connect(fb); fb.connect(delay);
        const mix = a.createGain(); mix.gain.value = 0.6;
        delay.connect(mix); src.connect(a.destination); node = mix;
      }
      const vg = a.createGain();
      vg.gain.value = window.AWC_SPEAKER_VOL == null ? 1 : window.AWC_SPEAKER_VOL;
      node.connect(vg); vg.connect(a.destination);
      src.start();
    }).catch(() => { const el = new Audio(url); el.volume = (window.AWC_SPEAKER_VOL == null ? 1 : window.AWC_SPEAKER_VOL); el.play(); });
  };

  /* Simple voice recorder (MediaRecorder) — returns a Blob. */
  window.recordVoiceNote = function (onDone, onError) {
    return window.recordVoiceNoteEx({}, onDone, onError);
  };
  /* Recorder with real voice-settings constraints + mic-volume gain.
     opts: { echoCancellation, noiseSuppression ('standard'|'none'),
     autoGain, deviceId, micVolume (0-100, 50 = unity gain) }.
     Audio only — getUserMedia({ audio: ... }), never video. */
  window.recordVoiceNoteEx = function (opts, onDone, onError) {
    opts = opts || {};
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError && onError('Microphone is not available in this browser.');
      return null;
    }
    const cons = { audio: {
      echoCancellation: opts.echoCancellation !== false,
      noiseSuppression: opts.noiseSuppression === 'standard',
      autoGainControl: opts.autoGain !== false,
      ...(opts.deviceId && opts.deviceId !== 'default' ? { deviceId: { exact: opts.deviceId } } : {})
    } };
    let rec = null, stream = null, actx = null;
    navigator.mediaDevices.getUserMedia(cons).then(s => {
      stream = s;
      let srcStream = s;
      const vol = (opts.micVolume == null ? 50 : opts.micVolume) / 50;
      if (vol !== 1) {
        try {
          actx = new (window.AudioContext || window.webkitAudioContext)();
          const src = actx.createMediaStreamSource(s);
          const g = actx.createGain(); g.gain.value = vol;
          const dest = actx.createMediaStreamDestination();
          src.connect(g); g.connect(dest);
          srcStream = dest.stream;
        } catch (e) { srcStream = s; }
      }
      rec = new MediaRecorder(srcStream);
      const chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (actx) actx.close().catch(() => {});
        onDone(new Blob(chunks, { type: 'audio/webm' }));
      };
      rec.start();
    }).catch(() => onError && onError('Microphone permission denied.'));
    return { stop() { if (rec && rec.state !== 'inactive') rec.stop(); } };
  };
})();
