import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

const $ = (id) => document.getElementById(id);
const state = { pipe: null, words: [], device: 'wasm' };

// ---------- model loading ----------
function showProgress(on) { $('progress-wrap').hidden = !on; }

function onProgress(info) {
  if (info.status === 'progress' && info.total) {
    $('progress-text').textContent = `Downloading ${info.file} ${info.progress.toFixed(0)}%`;
    $('progress-fill').style.width = `${info.progress}%`;
  } else if (info.status === 'progress_total') {
    $('progress-text').textContent = `Total ${Number(info.progress).toFixed(0)}%`;
    $('progress-fill').style.width = `${Number(info.progress)}%`;
  } else if (info.status === 'done') {
    $('progress-fill').style.width = '100%';
  }
}

$('btn-load').addEventListener('click', async () => {
  const btn = $('btn-load');
  btn.disabled = true;
  btn.textContent = 'Loading…';
  showProgress(true);
  try {
    state.device = navigator.gpu ? 'webgpu' : 'wasm';
    state.pipe = await pipeline('automatic-speech-recognition',
      'onnx-community/whisper-base_timestamped',
      { device: state.device, dtype: 'q8', progress_callback: onProgress });
    $('device-badge').textContent = state.device.toUpperCase();
    $('device-badge').classList.add('ok');
    showProgress(false);
    $('input').hidden = false;
    $('status').hidden = true;
  } catch (err) {
    // WebGPU init can fail on paper-supported hardware — fall back to WASM once.
    if (state.device === 'webgpu') {
      $('status').hidden = false;
      $('status-text').textContent = 'WebGPU failed, retrying with WASM…';
      try {
        state.device = 'wasm';
        state.pipe = await pipeline('automatic-speech-recognition',
          'onnx-community/whisper-base_timestamped',
          { device: 'wasm', dtype: 'q8', progress_callback: onProgress });
        $('device-badge').textContent = 'WASM';
        showProgress(false);
        $('input').hidden = false;
        $('status').hidden = true;
      } catch (err2) { loadError(err2); }
    } else { loadError(err); }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Load model';
    if (state.pipe) btn.hidden = true;
  }
});

function loadError(err) {
  showProgress(false);
  $('status').hidden = false;
  $('status-text').textContent = `Model load failed: ${err.message}`;
}

// ---------- audio input ----------
let blobUrl = null;

function setAudio(blob, name) {
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = URL.createObjectURL(blob);
  const p = $('player');
  p.src = blobUrl;
  p.hidden = false;
  $('audio-name').textContent = name;
  $('btn-transcribe').disabled = false;
  resetChips();
}

$('btn-record').addEventListener('click', () => recorder.toggle());
$('file').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) setAudio(f, f.name);
});

const recorder = {
  mr: null, chunks: [],
  async toggle() {
    if (this.mr) { this.mr.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.mr = new MediaRecorder(stream);
      this.mr.ondataavailable = (e) => this.chunks.push(e.data);
      this.mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setAudio(new Blob(this.chunks, { type: this.mr.mimeType }), 'microphone recording');
        this.mr = null;
        $('btn-record').textContent = '🎤 Record';
        $('btn-record').classList.remove('rec');
      };
      this.mr.start();
      $('btn-record').textContent = '⏹ Stop';
      $('btn-record').classList.add('rec');
    } catch {
      $('status').hidden = false;
      $('status-text').textContent = 'Microphone permission denied.';
    }
  },
};

// ---------- transcription ----------
$('btn-transcribe').addEventListener('click', async () => {
  if (!state.pipe || !blobUrl) return;
  const lang = $('lang').value;
  const btn = $('btn-transcribe');
  btn.disabled = true;
  $('status').hidden = false;
  $('status-text').textContent = 'Transcribing… (runs locally, may take a few seconds)';
  const t0 = performance.now();
  try {
    const audio = await (await fetch(blobUrl)).arrayBuffer();
    const options = { return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5 };
    if (lang !== 'auto') options.language = lang;
    const out = await state.pipe(audio, options);
    const ms = (performance.now() - t0).toFixed(0);
    render(out, ms);
    $('status').hidden = true;
  } catch (err) {
    $('status-text').textContent = `Transcription failed: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

function resetChips() { $('chips').innerHTML = ''; $('result').hidden = true; state.words = []; }

function render(out, ms) {
  const chunks = out.chunks || [];
  const chips = $('chips');
  chips.innerHTML = '';
  state.words = [];
  let prevEnd = null;
  for (const c of chunks) {
    if (prevEnd !== null && c.timestamp[0] - prevEnd > 0.5) {
      const pause = document.createElement('span');
      pause.className = 'chip pause';
      pause.textContent = `⋯ ${(c.timestamp[0] - prevEnd).toFixed(2)}s`;
      pause.title = `Pause ${prevEnd.toFixed(2)}s → ${c.timestamp[0].toFixed(2)}s`;
      chips.appendChild(pause);
    }
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = c.text;
    chip.title = `${c.timestamp[0].toFixed(2)}s – ${c.timestamp[1]?.toFixed(2) ?? '?'}s — click to seek`;
    if (c.timestamp[1] !== null && c.timestamp[1] !== undefined) {
      chip.addEventListener('click', () => { $('player').currentTime = c.timestamp[0]; $('player').play(); });
      chip.dataset.start = c.timestamp[0];
      chip.dataset.end = c.timestamp[1];
    }
    chips.appendChild(chip);
    state.words.push({ word: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] });
    prevEnd = c.timestamp[1] ?? c.timestamp[0];
  }
  $('result').hidden = false;
  $('status-text').textContent = `${chunks.length} words in ${ms} ms (${state.device.toUpperCase()})`;
}

// ---------- playback highlighting ----------
$('player').addEventListener('timeupdate', () => {
  const t = $('player').currentTime;
  let active = null;
  for (const el of $('chips').querySelectorAll('.chip[data-start]')) {
    const on = t >= +el.dataset.start && t < +el.dataset.end + 0.05;
    el.classList.toggle('active', on);
    if (on) active = el;
  }
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
});

// ---------- export ----------
$('btn-export').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(state.words, null, 2));
    const b = $('btn-export');
    b.textContent = '✓ Copied';
    setTimeout(() => { b.textContent = '⧉ Copy JSON'; }, 1500);
  } catch {
    // clipboard API can be denied — fall back to a visible textarea selection
    const ta = document.createElement('textarea');
    ta.value = JSON.stringify(state.words, null, 2);
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
});
