# Meeting transcription PoC

The **Meeting transcript** screen combines Nemotron 3 activity for up to eight
anonymous speaker tracks with LFM3 Audio English transcription. Continuous speech
stays in one crop across brief overlaps and is labelled as mixed speech.
Unassigned speech recovered by ASR keeps an unassigned label.

The eight-speaker limit belongs to the trained diarizer, not LFM3 or React Native.
Speaker numbers identify tracks in this session, not known people. Labels and
words can be wrong; short turns and overlapping voices remain challenging.

## Prepare the models

The diarizer is exported locally using the companion
[Nemotron 3 recipe](https://github.com/software-mansion-labs/executorch-export-recipes/tree/%40bh/meeting-transcript/exporter_models/nemotron3_diarization).
From that repository:

```sh
uv run --locked --project exporter_models/nemotron3_diarization \
  exporter export nemotron3_diarization --backend xnnpack \
  --output-dir /absolute/local/output
```

Choose **Import model** in Gallery and select
`nemotron3_diarization_xnnpack_fp32.pte` from Files. The app checks the actual
exported methods, shapes, dtypes and constants before installing it in its private
model directory. Failed picks and temporary picker copies are cleaned up.
Then explicitly load the model; the meeting task also downloads LFM3 Audio assets
if needed. Opening the screen starts no download or microphone capture.
No hosted diarization artifact is required and no model weights are in Git.
Deleting model assets resets the session and offers import/preparation again.

## Audio lifetime

`useAudioRecorder` uses AudioRecorder's mono 16 kHz PCM callback. It never enables
file output; the native recorder's file-output flags default to false. Everyone
should know the microphone/transcription is active.

The transient queue holds at most 20 seconds, with at most one additional
10-second batch active. Native/worklet copies exist during processing. Consumed
application buffers are zeroed; this is not a secure-memory-erasure guarantee
for runtime or OS copies. The bounded speaker cache contains latent embeddings
and probabilities, not a saved recording, and is never persisted.

Stop drains the last buffer. Clear, backgrounding, navigation and errors discard
queued audio and invalidate late results. Overflow visibly stops capture instead
of silently losing speech. Models are disposed after active inference completes.
LFM3 has no retained audio chat history: each crop gets a fresh ASR prompt and KV
position, with disposable media tensors.

There is no audio playback, audio export, cloud inference or summarization.
Transcripts stay in session memory; explicit **Copy transcript** writes only text
to the system clipboard. The model picker imports model assets, not recordings.

## Model provenance and contract

Diarizer: [NVIDIA Nemotron-3-Diarization](https://huggingface.co/nvidia/Nemotron-3-Diarization),
checkpoint `52a432672732425e4c19765b9fec9b5810e6f4ba`, OpenMDW 1.1 weight terms.
The FP32 XNNPACK export is 397,708,832 bytes. The recipe pins Python 3.10,
PyTorch 2.14.0, ExecuTorch 1.4.1 and Transformers 5.20.0. Its adapted preprocessing
and cache-policy code retain the upstream Apache 2.0 notices.

Methods:

| Method       | Inputs                                                        | Outputs                                                          |
| ------------ | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `preprocess` | mono float32 `[160000]`, true int64 length `[1]`              | mel `[1,1001,128]`                                               |
| `embed`      | mel `[1,8*N,128]`, `N=1..126`                                 | embeddings `[1,N,512]`                                           |
| `encode`     | embeddings `[1,T,512]`, int64 mask `[1,T]`, `T=2..800`        | probabilities `[1,8*T,8]`, masked pooled probabilities `[1,T,8]` |
| `compress`   | embeddings `[1,T,512]`, probabilities `[1,T,8]`, `T=265..800` | cache `[1,264,512]`, probabilities `[1,264,8]`                   |

A companion RNE schema preserves dynamic bounds and matching input lengths.
The encoder computes the actual sequence, without padding every call to its
maximum. Cache compression retains the original HF policy, including learned
silence embeddings, per-speaker ordering, score boosts and the 222-frame update
period. The app only sequences bounded FIFO/cache state. Feature extraction is
per buffered chunk with true-length masking and no feature normalization; this
is a supported custom buffering profile, not a claim of equivalence to every
published streaming latency profile.

ASR: `LFM3_AUDIO_2B.XNNPACK_8DA4W`, official
`software-mansion/LFM3-ExecuTorch` revision
`bd5858beef1c88eac49686af7173a8b3624a0d91`, under upstream LFM terms. The model is
1,716,453,120 bytes, SHA256
`48a4db000935fa2e6401783b6857c3e64bd6ebc9cf9f94db3e711068fc11d91f`.
Matching tokenizer/config and FSMN VAD are required. Each crop uses
`Perform ASR in English.`, greedy decoding and a 256-token limit. Both models
use the CPU path. No RNE source modifications are required.

## Validation scope

The recipe compares every loaded method with the original HF eager model,
including min/intermediate/max shapes, silence/saturated cache inputs, repeated
streaming chunks and cache overflow. All predeclared floating-point tolerances
passed on AMI IB4001 210–270 s: maximum streaming probability difference 2.3e-6.
NVIDIA's separate synthetic eight-voice sample (97.6 s) also passed, with a
maximum difference of 3.7e-5 and activity on all eight channels. This verifies
export fidelity; it is not a speaker identity or DER benchmark.

### Native real-meeting check

An unsigned Release build ran the actual CPU models on an iPhone 17 Pro simulator
(iOS 26.5, M1 Pro host). Public AMI IB4001 mixed-headset audio was fed as 10-second
PCM buffers through the production pipeline, without microphone capture.

| Excerpt           | Processing time | Approximate WER               | Output turns |
| ----------------- | --------------- | ----------------------------- | ------------ |
| 210–270 s (60 s)  | 14.415 s        | 18.1% (32 edits / 177 words)  | 26           |
| 210–390 s (180 s) | 48.772 s        | 21.7% (108 edits / 497 words) | 76           |

WER lowercases and strips punctuation, preserving number spellings and fillers;
it uses reference words ordered by start time. Overlap ordering and `15` versus
`fifteen` contribute errors. These are two overlapping excerpts from one meeting,
not a representative accuracy benchmark or a controlled comparison with another
model. The longer run exercises repeated cache compression.

The main discussion is readable. Observed errors include `hall` → `hole`, missed
short interjections, fragmented sentences at pauses and buffer boundaries, and
occasional invented words on tiny uncertain crops. There is also a brief spurious
Speaker 6 label in this four-participant meeting. Speaker identity accuracy and
DER have not been measured. Treat the output as an editable draft, not a verbatim
meeting record.

The separate native 97.6-second synthetic eight-voice input completed in 5.304 s.
This verifies native execution with eight tracks; it does not establish perfect
speaker separation. Earlier four-speaker Sortformer results belong to a removed
baseline implementation.

Temporary fixture screens and recorder adapters are excluded from the final app.
Physical microphone validation, phone performance and Android validation remain
unavailable in this simulator-only check.

The simplified meeting UI was checked in light/dark appearance. A fixture-fed
Maestro run passed start, stop, copy and clear on the actual native pipeline.
The local Files picker presented and listed the prepared model folder; automated
folder selection did not complete reliably on this simulator. Native model loading
and inference were verified by seeding the identical file into app-private storage,
so picker selection/cancellation remains a separate manual verification gap.
After the final build, injected audio JSON was removed. The app-container audit
found no audio files; Apple's `monolithic_metal.pcm` (CPCH compiler-module magic)
is a compiler cache, not recorded PCM.
