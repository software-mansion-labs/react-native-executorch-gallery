import { useState } from 'react';
import {
  models,
  useObjectDetector,
  type CocoClassYolo,
  type ObjectDetection,
} from 'react-native-executorch';
import type { ImageBuffer } from 'react-native-executorch/cv';
import { useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import { GPUFrame, useResizer } from 'react-native-vision-camera-resizer';
import { scheduleOnRN } from 'react-native-worklets';

import { CameraActionButton } from '@/components/CameraActionButton';
import { RealtimeDetectionViewport, type ImageSize } from '@/components/RealtimeDetectionViewport';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';

const MODEL = models.objectDetection.YOLO26.NANO.SIZE_384.DEFAULT;
const INPUT_SIZE: ImageSize = { width: 384, height: 384 };

function RealtimeObjectDetectionTask() {
  const [loaded, setLoaded] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const [detections, setDetections] = useState<ObjectDetection<'xyxy', CocoClassYolo>[]>([]);
  const [frameSize, setFrameSize] = useState<ImageSize | undefined>();
  const [latency, setLatency] = useState<number | null>(null);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const detector = useObjectDetector(MODEL, { preventLoad: !loaded });
  const { detectObjectsWorklet, isReady } = detector;

  const { resizer } = useResizer({
    ...INPUT_SIZE,
    channelOrder: 'rgb',
    dataType: 'uint8',
    scaleMode: 'cover',
    pixelLayout: 'interleaved',
  });

  const onDetections = (
    results: ObjectDetection<'xyxy', CocoClassYolo>[],
    durationMs: number,
    frameSize?: ImageSize
  ) => {
    if (!isActive) return;
    setDetections(results);
    setLatency(durationMs);
    if (frameSize) setFrameSize(frameSize);
  };

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      if (!isActive || !resizer || !detectObjectsWorklet) {
        frame.dispose();
        return;
      }

      let resized: GPUFrame | undefined;
      try {
        const t0 = Date.now();

        const isSideways = frame.orientation === 'left' || frame.orientation === 'right';
        const frameSize = isSideways
          ? { width: frame.height, height: frame.width }
          : { width: frame.width, height: frame.height };

        resized = resizer.resize(frame);

        const bytes = new Uint8Array(resized.getPixelBuffer());
        const input: ImageBuffer = { data: bytes, ...INPUT_SIZE, format: 'rgb', layout: 'hwc' };
        const results = detectObjectsWorklet(input);

        const durationMs = Date.now() - t0;
        scheduleOnRN(onDetections, results, durationMs, frameSize);
      } catch (err) {
        console.log(err);
      } finally {
        resized?.dispose();
        frame.dispose();
      }
    },
  });

  const toggleDetection = async () => {
    if (isActive) {
      setIsActive(false);
      setDetections([]);
      setLatency(null);
      return;
    }

    if (!hasPermission && !(await requestPermission())) {
      return;
    }
    setIsActive(true);
  };

  return (
    <TaskScreen
      title="Live Detection"
      subtitle="YOLO26 Nano"
      status={detector}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={false}
      busy={isActive}
      onRun={() => undefined}
      meta={
        isActive && latency != null
          ? `${Math.round(1000 / Math.max(latency, 1))} FPS · ${latency} ms / frame`
          : undefined
      }
      onDeleteModel={async () => {
        setIsActive(false);
        setDetections([]);
        setLatency(null);
        await deleteCachedFiles(detector.resource);
        setLoaded(false);
      }}
      footer={
        <CameraActionButton
          isActive={isActive}
          enabled={isReady && !!device}
          onPress={toggleDetection}
        />
      }
    >
      <RealtimeDetectionViewport
        device={device}
        hasPermission={hasPermission}
        frameOutput={frameOutput}
        detections={isActive ? detections : []}
        inputSize={INPUT_SIZE}
        frameSize={frameSize}
      />
    </TaskScreen>
  );
}

export default function RealtimeObjectDetectionScreen() {
  return (
    <ScreenWrapper>
      <RealtimeObjectDetectionTask />
    </ScreenWrapper>
  );
}
