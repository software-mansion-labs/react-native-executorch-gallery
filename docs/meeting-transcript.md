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

Fluid's two-layer predictor state resets once per independent ten-second ASR chunk.
Speaker changes do not cut the ASR audio or restart its predictor.
NeMo's short-input frontend is preserved: crops under one second receive symmetric
zero padding to one second; meeting timestamps retain their original values.
Raw TDT decoding uses blank/SOS 8192 and separate token/duration argmax heads,
with bounded zero-duration runs and at most 1024 emitted tokens per crop.
FSMN VAD filters completely silent chunks before ASR. Recognized words receive
approximate start/end positions from TDT token-emission frames (80 ms stride),
with short-input padding removed. SentencePiece pieces are grouped into whole
words. Diarization labels each word by the speaker set with the most overlapping
frame duration; uncertain or missing activity produces an unassigned label and
never removes the word. These are decoder emission estimates, not forced
alignment, and speaker identity/overlap can still be wrong. No clean-mode adapter
is enabled.

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
  local 16 kHz WAV. Before display grouping, its copied transcript has 25 nonempty turns and 29/177 word
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

## Consecutive speakers and initial multilingual feasibility checks

Consecutive turns with the same identified speaker (or speaker set) are joined
in both the screen and copied transcript, including across ten-second chunks.
The first start time, final end time and any overlap warning are retained. A
speaker change starts another message. Unassigned turns remain separate because
their identity is unknown. The AMI fixture changes from 25 entries to 7 without
changing any copied words.

Before separating ASR from speaker cropping, additional fixed recordings were
selected before inference and run through the
actual recording picker, native models and Copy transcript action on the same
dedicated simulator. Results use Unicode-aware word normalization: lowercase,
accents retained, punctuation/apostrophes split into word boundaries. Numbers
remain as written and spoken fillers count. Corpus non-speech annotation symbols
are removed. WER is substitutions + deletions + insertions / reference words.

| Recording                           | Duration | Reference words | App word edits | App WER | INT8 ASR alone | FP32 ASR alone |
| ----------------------------------- | -------: | --------------: | -------------: | ------: | -------------: | -------------: |
| Polish parliamentary excerpts       |  71.66 s |             127 |             20 |  15.75% |          6.30% |          6.30% |
| German parliamentary excerpts       |  62.44 s |             132 |             16 |  12.12% |          9.09% |          9.09% |
| French parliamentary excerpts       |  57.64 s |             152 |             44 |  28.95% |         29.61% |         28.95% |
| French four-person planning meeting |    180 s |             618 |            260 |  42.07% |         33.98% |         33.17% |

The parliamentary recordings concatenate the first six test utterances in each
language from [VoxPopuli](https://huggingface.co/datasets/facebook/voxpopuli),
revision `42f01879c780b4a2e90ec0b4f616c2ece526e4f1`, with 0.4-second gaps. All
six references per language are marked gold. These are formal speech excerpts,
not continuous meetings or overlapping conversation. VoxPopuli data is CC0;
see the corpus's raw European Parliament audio notice.

The real meeting is `004c_PAPH`, seconds 0–180, from
[SUMM-RE](https://huggingface.co/datasets/linagora/SUMM-RE), revision
`47cb4ec3437ef5497b6092b8c6d1e0b5b1d86dc0` (CC BY-SA 4.0; Hunter et al.,
2024). All four synchronized individual tracks are resampled to 16 kHz and
averaged. The example subset's retained segments were verified to match the
original manually transcribed development annotations. Reference words are
ordered by their annotated start time; overlap can make linear WER ambiguous.
This mix of close microphones is not a room-microphone test.

ASR-alone columns are host diagnostics using the respective PTEs on the same
recordings in plain ten-second chunks, without diarization or VAD. They isolate
some pipeline effects but are not another simulator run or a latency benchmark.
The meeting app makes 207 deletions, 47 substitutions and 6 insertions. It also
uses seven assigned speaker IDs plus unassigned rows for four participants;
this is observed fragmentation, not a measured diarization error rate.

These small fixed checks expose missing words, occasional wrong-language output
on short crops and unstable speaker identity. The pipeline adds errors for
Polish, German and the French meeting. INT8/FP32 ASR-only differences here are
small; that does not resolve the strict encoder parity failure. French speech
accuracy needs attention even without diarization. Before treating this as
reliable meeting transcription, investigate crop boundaries, ASR context and
speaker continuity and evaluate a larger held-out conversational set. No model
training-data exclusion or corpus-wide accuracy claim is established.

Audio fixtures, reference annotations, SHA-256 manifests, copied outputs, edit
counts and Maestro captures remain local under ignored campaign/artifact paths.
No recordings or model assets are bundled into Git or publicly uploaded.

## ASR separated from speaker cropping

The current pipeline recognizes each complete ten-second chunk once. FSMN VAD
is applied to the full chunk, rather than each speaker span. Recognition is then
labeled using approximate decoder-emission word positions and the majority
speaker-set duration within each word. No word is removed because its speaker
is uncertain. This holds the original ten-second, non-overlapping windows fixed;
it does not integrate the separate overlap experiment.

Actual screen runs on the same simulator, same local WAVs and same normalization:

| Recording  | Previous app WER | Current app WER | Current word edits |
| ---------- | ---------------: | --------------: | -----------------: |
| pl         |           15.75% |           5.51% |              7/127 |
| de         |           12.12% |           9.09% |             12/132 |
| fr         |           28.95% |          28.95% |             44/152 |
| fr-meeting |           42.07% |          33.17% |            205/618 |

The French meeting changes from 260 to 205 edits: 32 substitutions, 167 deletions
and 6 insertions. This supports separating ASR segmentation from speaker labels,
although the comparison also changes VAD from per-speaker crops to full chunks.
It is not an isolated VAD ablation or evidence that all errors came from cropping.

Word recovery improves, but speaker attribution becomes more fragmented: the
French meeting has 122 displayed runs and eight assigned IDs for four actual
participants, versus 49 runs and seven IDs previously. Many short unassigned
words split known-speaker messages. Word positions are approximate emissions,
not verified word boundaries; no DER or word-level speaker accuracy is claimed.
The retained experiment improves text accuracy while exposing a separate timing/
speaker-continuity problem. It is not ready for reliable meeting minutes.

Twenty tests and the typecheck/lint/format checks pass. New regression tests
verify that uncertain/no-speaker activity never deletes recognized words, offset
handling and overlap voting. The Release app with updated JavaScript was used
for the actual recording-import/copy runs; native dependencies did not change.
In-flight cancellation, background/resume, navigation/model reload and light/dark
appearance were checked on the dedicated simulator. Physical microphone,
Android, phone performance and network-isolated checks remain unavailable.

The original 60-second AMI English app fixture was also rerun after navigation
and explicit model reload. With the original English scoring normalization it
changes from 29/177 to 28/177 edits (16.38% to 15.82% WER). There are 53 label
runs after word assignment, versus 7 after the earlier display-only grouping.
This reinforces that text accuracy and readable/stable attribution are separate
issues. These are single fixed-clip comparisons, not statistically established
language-wide improvements.
