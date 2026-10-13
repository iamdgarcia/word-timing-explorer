---
title: Word Timing Explorer
emoji: ⏱️
colorFrom: purple
colorTo: pink
sdk: static
app_file: index.html
short_description: See whisper word timestamps — barge-in signal for agents
tags: [voice-agent, whisper, transformers-js, webgpu]
---

# Word Timing Explorer

**▶ Try it live:** <https://iamdgarcia-word-timing-explorer.static.hf.space> · **Code on GitHub:** <https://github.com/iamdgarcia/word-timing-explorer>

Whisper with **word-level timestamps**, running 100% in your browser via
[transformers.js](https://huggingface.co/docs/transformers.js)
([onnx-community/whisper-base_timestamped](https://huggingface.co/onnx-community/whisper-base_timestamped),
WebGPU when available, WASM otherwise). Record from your mic or upload an audio file —
nothing leaves your machine.

**What you see:** every word as a chip with its `start–end` times (hover for exact values),
visible `⋯` pause markers between words separated by >500 ms, and live highlighting of the
current word during playback. Click any word to seek the audio there. Language: auto / English /
Spanish. One click exports the transcript as JSON:

```json
[{ "word": "This", "start": 0.0, "end": 0.21 }, ...]
```

First run downloads ~50–100 MB of weights; your browser caches them afterwards.

## Why word timing matters for voice agents

Word-level timestamps are the signal behind three things realtime voice-agent teams care about:

- **Barge-in detection** — when the user starts talking over the agent, word onset times tell you
  *where* the interruption landed and what to do with the tail of the agent's utterance.
- **Subtitle alignment** — captions that light up each word as it's spoken, with no forced-alignment post-pass.
- **Latency measurement** — last-word end time vs. response onset = end-of-turn → answer latency,
  the number every voice stack optimizes.

## Related work

- [Voice Agents Playground](https://iamdgarcia-voice-agents-playground.static.hf.space) — live Silero VAD endpointing visualizer (the *when to listen* half; this is the *what was said* half).
- [Voice Metrics Dashboard](https://iamdgarcia-voice-metrics-dashboard.static.hf.space) — KPIs for voice-agent transcripts.

---

Built by [iamdgarcia](https://huggingface.co/iamdgarcia) — realtime voice agent engineer
([iamdgarcia.com](https://iamdgarcia.com)). Apache-2.0.

📖 Full writeup: [https://iamdgarcia.medium.com/watching-your-voice-agent-think-three-instruments-you-can-open-in-a-browser-tab-f7ed16ec2a2a](https://iamdgarcia.medium.com/watching-your-voice-agent-think-three-instruments-you-can-open-in-a-browser-tab-f7ed16ec2a2a) — *Watching your voice agent think* (D. García Peña).
