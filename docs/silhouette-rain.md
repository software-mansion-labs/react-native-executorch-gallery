# Silhouette rain PoC

Open **Real time → Silhouette rain** and load the model. Tap **Try demo video**
(the play button) to download and play the portrait sample, or choose a video
from Photos. The primary button pauses/resumes playback; the umbrella toggles collisions for a
before/after comparison. The screen uses the same edge-to-edge layout and floating
controls as Live object detection.

The sample is [Woman Stretching Her Arms by Ivan S / Pexels](https://www.pexels.com/video/woman-stretching-her-arms-8502433/),
used under the [Pexels license](https://www.pexels.com/license/). It is approximately
3.6 MB, downloaded only on request, and cached in app documents. No video or model
weights are committed. The clip plays at normal speed. Its slow movement and plain
background make the inferred obstacle easier to see than the original dance clip.

The published YOLO26 Nano segmentation model at 384 pixels uses XNNPACK INT8.
Its PTE is approximately 4 MB and retains its upstream model license. The custom
pipeline uses RNE's existing `loadModel`, schema, tensor, image preprocessing and
`Model.execute` interfaces. It unions confident person masks and restricts each
mask to its predicted box. There are no library changes.

Expo Video presents continuous native playback. A separate loop samples current
clip time through native thumbnails, allowing one extraction/inference at a time
and skipping intermediate frames. Skia animates 240 drops independently. The
video and mask share the same centred cover transform, including cropping.
Native image references and temporary PNGs are released after sampling. This
path avoids a simulator Skia video-texture readback that produced black input.

Collisions use a swept lookup in the latest union mask. Masks older than 650 ms,
from a previous playback generation, or from an inactive clip cannot affect the
particles. Backgrounding pauses playback; model deletion resets the session.
Teardown waits for pending inference before releasing tensors.

This is a prerecorded-video experiment with CPU image/mask transfers. Mask updates
are slower than video playback, so fast movement can expose lag. Its collision
response is a small visual simulation, not fluid dynamics. Simulator evidence
does not establish phone frame rates, energy use or Android support.

Local verification helpers and campaign media live in ignored `.artifacts/` or
the enclosing workspace's `work/` directory. `.test.mjs` helpers must not be
committed.
