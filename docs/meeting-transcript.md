# Experimental meeting transcription

The **Meeting transcript** screen combines Nemotron 3 speaker activity with raw
Fluid Speech Pro transcription. It is a feasibility experiment, not a finished
meeting recorder. It supports microphone input and explicitly selected recordings
up to five minutes / 100 MB. Speaker tracks are anonymous, with a trained limit
of eight. Overlap, short turns and speaker attribution can be wrong.

## Prepare and import the models

No unpublished weights are downloaded automatically or bundled in the app.
Export the diarizer using the companion
[Nemotron recipe](https://github.com/software-mansion-labs/executorch-export-recipes/tree/%40bh/meeting-transcript/exporter_models/nemotron3_diarization).
Export Fluid using [export-recipes PR #14](https://github.com/software-mansion-labs/executorch-export-recipes/pull/14):

```sh
uv run --locked --project exporter_models/nemotron3_diarization \
  exporter export nemotron3_diarization --backend xnnpack \
  --output-dir /absolute/nemotron-output

uv run --locked --project exporter_models/fluid_speech_pro python \
  exporter_models/fluid_speech_pro/quantize.py --output-dir /absolute/fluid-output
```

The recipes currently live on separate export branches; use their respective
branches/directories. Fetch `tokenizer.json` from
[the pinned Fluid source](https://huggingface.co/FluidVoice-Labs/fluid-speech-pro/tree/46027a3bffc5817ce8f9b29add0a062610134a90).
Use the full `.nemo` recipe; the publisher's Transformers weights omit an inserted
block. Keep all source attribution/license notices with locally prepared assets.

Choose **Import models** in Gallery and select these seven files from Files.
They can be selected together or in several picks:

- `nemotron3_diarization_xnnpack_fp32.pte`
- `fluid_speech_pro_preprocess_xnnpack_fp32.pte`
- `fluid_speech_pro_subsample_xnnpack_fp32.pte`
- `fluid_speech_pro_encoder_xnnpack_int8dyn.pte`
- `fluid_speech_pro_predictor_xnnpack_fp32.pte`
- `fluid_speech_pro_joint_xnnpack_fp32.pte`
- `tokenizer.json`

Each imported component is opened by the shipping native runtime and its actual
method shapes/dtypes/dynamic constraints are validated before installation. The
tokenizer must have 8192 pieces plus the blank token at 8192. Picker cancellation,
invalid files and temporary picker copies are handled locally. The model storage
control includes all imported files and the downloaded FSMN VAD asset.

Then choose **Load model**, or **Download model** if the small VAD asset is not
cached. Only that explicit action prepares models and resolves
the small published VAD asset. Opening the screen starts no model download,
inference or recording. No RNE source modifications are required.

## Try a meeting

After loading, choose **Start transcription** for microphone input on a physical
device, or **Choose recording** for a local audio file. Simulators use recording
import as their primary action because their microphone engine is not a reliable
capture target. Recordings are decoded to 16 kHz mono and
processed in sequential ten-second chunks through the same diarization and ASR
pipeline. The source file is never changed. The app's temporary picker copy is
removed after completion, cancellation or error. The working PCM copy stays
in memory and is cleared after processing; decoding is not a streaming
file reader, hence the file/duration bounds.

Live PCM callbacks feed a bounded in-memory queue. Stop drains the last buffer.
Clear/cancel, backgrounding, navigation and errors discard queued audio and
invalidate late results. Overflow visibly stops capture. In-flight native calls
finish before model disposal; cancellation invalidates their results immediately.
Speaker cache embeddings/probabilities survive only within one session.

Fluid's two-layer predictor state resets for every independent speaker crop.
NeMo's short-input frontend is preserved: crops under one second receive symmetric
zero padding to one second; meeting timestamps retain their original values.
Raw TDT decoding uses blank/SOS 8192 and separate token/duration argmax heads,
with bounded zero-duration runs and at most 1024 emitted tokens per crop.
FSMN VAD filters silence before ASR. No clean-mode adapter is enabled.

There is no audio export, cloud inference or summarization. Transcripts stay in
session memory; **Copy transcript** explicitly writes text to the system clipboard.
Buffer clearing is best effort, not a guarantee of secure erasure of runtime/OS
copies. Let everyone know before capturing a conversation.

## Provenance and limitations

- Diarizer: NVIDIA Nemotron-3-Diarization, revision
  `52a432672732425e4c19765b9fec9b5810e6f4ba`, OpenMDW 1.1 weight terms.
  The 397,708,832-byte FP32 export preserves the original HF cache-compression
  policy. Encoder/cache limits and learned silence embeddings are not replaced
  with an app heuristic.
- Fluid: FluidVoice-Labs/fluid-speech-pro, revision
  `46027a3bffc5817ce8f9b29add0a062610134a90`, CC BY 4.0. Mixed precision:
  dynamic INT8 encoder linears, FP32 elsewhere, five PTEs totaling 974,770,088
  bytes. Source NeMo code retains its Apache 2.0 notice in the export recipe.
- Runtime: RNE source `4b7d6fd6fea10f9b3422121d6e439ccf88df93b2`,
  ExecuTorch 1.4.1, XNNPACK CPU. Dynamic companion schemas are required for
  Fluid's encoder and eight shared-weight subsampling methods.

Fluid's original FP32 export passed 103 source/component/boundary checks. The
experimental INT8 pipeline retained 16.38% / 18.91% WER on overlapping 60/180s
excerpts from one AMI meeting, compared with historical LFM3's 18.08% / 21.73%.
Only previously retained crops were scored. This is narrow evidence, not a general
accuracy or diarization claim. Host/simulator timings are not phone benchmarks.

**The INT8 encoder still exceeds the strict converted-graph numeric budget.**
PT2E global vs XNNPACK per-token activation scaling explains a one-linear
reproducer, but a rowwise reference does not resolve all full-encoder drift.
The recipe retains the failed checks without relaxing tolerances. This screen
intentionally uses that candidate to explore feasibility; it is not presented as
production-validated. See the export recipe's `NOTES.md` for commands, hashes,
numeric errors, matched quality results and detailed model contracts.

Physical microphone capture and phone memory/thermal performance require a real
device. Simulator validation uses fixed local recordings and the real native
models; no inference mocks or microphone-performance claims are involved.

## Integration checks (2026-11-16)

Validated on an M1 Pro / 16 GiB Mac with a dedicated iPhone 17 Pro simulator,
iOS 26.5, using an actual native Release build:

- `npm run check`: 17 tests, TypeScript, ESLint and formatting pass.
- `npm run native:ios`: Release build passes, including the native document picker.
- Thirteen fixed audio clips match host quantized token IDs exactly. The full
  pipeline passes reset, in-flight cancellation and disposal checks.
- The actual screen processes AMI IB4001 audio from 210–270 seconds, copied as a
  local 16 kHz WAV. Its copied transcript has 25 nonempty turns and 29/177 word
  edits (16.38% WER), matching the prior matched-crop score. The pipeline probe
  takes about 6.4 seconds, excluding loading/decoding, with uncontrolled desktop
  conditions and no claim about phone latency.
- Opening without loading, model deletion/cancellation, missing-file counts,
  seven-file native import, invalid-file rejection, picker cancellation, VAD
  download, recording selection, text copying, interruption and light/dark
  layout were exercised with Maestro. Temporary picker files were removed.

AMI audio and manual annotations are from the
[AMI corpus](https://groups.inf.ed.ac.uk/ami/AMICorpusMirror/amicorpus/IB4001/audio/)
(CC BY 4.0). Fixtures, model weights, build outputs and captures remain local.

A native microphone attempt on this simulator aborted in Apple's `AURemoteIO`
RPC path. The meeting screen therefore offers recording import on simulators;
microphone capture remains a physical-device path. Physical capture, Android,
phone memory/thermal behavior and network-isolated execution were not verified.
The simulator shares its host network; no per-device network isolation was
configured. These results establish a running local prototype, not production
readiness or broad transcription accuracy.
