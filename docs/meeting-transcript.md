# Meeting transcription PoC

Two task screens use a custom TypeScript Sortformer pipeline through the existing
React Native ExecuTorch low-level `Model` / `Tensor` API:

- **Speaker diarization:** anonymous speaker activity, including overlap.
- **Meeting transcript:** the same activity plus LFM3 Audio transcription
  of each continuous turn. Brief overlaps stay in that crop and are labelled as mixed
  speech. If both tracks remain active throughout, both speaker labels are shown.

Models load only after the user requests them. There is no cloud inference or
summarization. Up to four speaker tracks are available; numbers identify tracks
within a session, not real identities. All participants should know transcription
is active. Speaker labels and words may be wrong, especially for short turns,
noise, overlap and changes near a batch boundary.

## Audio lifetime

`useAudioRecorder` uses AudioRecorder's PCM callback. It never enables file output.
The Audio API's native recorder defaults `fileOutputEnabled_` and
`fileOutputConfigured_` to false. No meeting recording is written to storage.

Capture produces mono 16 kHz float PCM. A bounded queue holds at most 20 seconds,
with at most one additional 10-second inference batch active. Temporary native and
worklet copies exist during processing. Consumed application buffers are zeroed;
this is not a secure-memory-erasure guarantee for OS/runtime-owned copies.
The speaker cache contains bounded latent embeddings (188 cache + 124 FIFO frames),
not recordings. It resets between sessions and is never persisted.

Stop processes the remaining buffered audio. Clear, background, navigation and
errors discard queued audio and invalidate in-flight results. Native models are
released after active inference finishes. Overflow stops capture visibly instead
of silently dropping words. No audio playback, upload or audio export exists.
Only explicit **Copy transcript** writes session text to the system clipboard.
Transcripts otherwise remain in session memory and disappear when leaving the task.

## Model provenance and contract

Diarizer: [younghan-meta/Sortformer-ExecuTorch-XNNPACK](https://huggingface.co/younghan-meta/Sortformer-ExecuTorch-XNNPACK),
revision `4a157759fdc2128fe686073e8eecd391df445fad`. The community export
repository declares Apache-2.0; the underlying
[NVIDIA `diar_streaming_sortformer_4spk-v2` weights](https://huggingface.co/nvidia/diar_streaming_sortformer_4spk-v2)
are CC-BY-4.0. This PoC consumes the published export without changing its weights.
`sortformer.pte`: 492,384,528 bytes, SHA256
`e763fae031bc8675252f2d8de0e84ff71992db4eb04257e4a50b43c9b31a77c1`.

The cache selection follows the algorithm in the
[upstream ExecuTorch Sortformer runner](https://github.com/pytorch/executorch/tree/a2cd31227a32985ce8421954f72ff9c67d00b781/examples/models/sortformer).
See [BSD attribution](sortformer-NOTICE.txt). Its top-confidence cache compression is a simplification of NeMo's streaming cache
policy. This app does not claim full NeMo streaming equivalence or measured DER.

The export has three methods: `preprocessor`, `pre_encode`, `encode`.
Its metadata reports maximum tensor shapes without the RNE companion dynamic
schema. The pipeline validates these fixed input shapes and pads to them, while
passing true lengths for masking. Audio is padded to 1,920,000 samples, mel features
to `[1,4000,128]`, and cache/FIFO/chunk embeddings to `[1,1000,512]`.
Outputs are `[1,128,12001]`, `[1,500,512]` and `[1,1000,4]` respectively.
Speaker activity uses a 0.5 threshold at 80 ms/frame. For transcription, adjacent
spans sharing a continuously active track become one crop; overlapping voices
remain explicitly flagged. This avoids cutting a sentence at every brief overlap. Speech recovered by ASR below the diarization
threshold appears as Unassigned speaker. Turns shorter than 320 ms are skipped. Per-batch normalization and
independent turn crops can affect quality; sentences may split between batches.

LFM3 Audio uses the pinned library registry's `LFM3_AUDIO_2B.XNNPACK_8DA4W`,
with assets pinned to official `software-mansion/LFM3-ExecuTorch` revision
`bd5858beef1c88eac49686af7173a8b3624a0d91`. Its model is 1,716,453,120 bytes,
SHA256 `48a4db000935fa2e6401783b6857c3e64bd6ebc9cf9f94db3e711068fc11d91f`,
under the upstream LFM license. The matching tokenizer/config and FSMN VAD are
required. Each crop uses `Perform ASR in English.`, greedy decoding and a 256-token
limit. It uses the public LLM runner and chat preprocessor without retaining a chat
history. Media tensors are cleared after each call and the KV position is reset.
Both models run on CPU, including on the simulator. No library source modifications
are required. Whisper Tiny remains an optional comparison configuration in the
pipeline; the meeting screen loads LFM3 Audio.

## Validation scope

See the campaign evidence for native build/inference results and unavailable checks.
Host comparison on AMI IB4001 first 10 seconds (M1 Pro, ET 1.4.1): padded vs dynamic
preprocessing matched exactly; max encoder probability difference was 5.66e-7.
Padding increases computation significantly: 5.86 s for the padded encoder versus
0.31 s for the 125-frame input in that host run. These are host observations,
not physical-phone measurements. This PoC needs device validation before making
real-time or meeting-quality claims.

Native simulator validation (iPhone 17 Pro simulator, iOS 26.5, M1 Pro Mac):
LFM3 Audio + Sortformer processed AMI IB4001 210–270 s in 52.665 s, excluding
model loading and fixture reading. The run produced 18 grouped turns, including
mixed-speech warnings and three anonymous speaker tracks. Approximate normalized
text WER was 18.1% (32 edits / 177 reference words). This is one selected excerpt,
not a meeting-quality benchmark; reference overlap ordering, fillers and number
formatting affect the score. Speaker DER and NeMo/PyTorch parity were not measured.
The earlier Whisper Tiny baseline scored 27.7%, but used different crops, so this
is not a controlled comparison of the two models. These are simulator observations,
not phone performance or physical microphone validation.
