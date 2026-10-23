import type { Href } from 'expo-router';

export type Task = {
  id: string;
  title: string;
  keywords: string;
  href?: Href;
};

export type TaskSection = {
  title: string;
  keywords: string;
  data: Task[];
};

/** Available demos link to their routes; remaining tasks stay as catalogue placeholders. */
export const TASK_SECTIONS: TaskSection[] = [
  {
    title: 'Computer vision',
    keywords: 'vision photo image',
    data: [
      {
        id: 'object-detection',
        href: '/object-detection',
        title: 'Object detection',
        keywords: 'locate classify objects SSDlite MobileNet YOLO',
      },
      {
        id: 'image-classification',
        href: '/image-classification',
        title: 'Image classification',
        keywords: 'identify categories EfficientNet',
      },
      {
        id: 'instance-segmentation',
        href: '/instance-segmentation',
        title: 'Instance segmentation',
        keywords: 'detect mask instances YOLO',
      },
      {
        id: 'semantic-segmentation',
        href: '/semantic-segmentation',
        title: 'Semantic segmentation',
        keywords: 'pixel masks DeepLab',
      },
      {
        id: 'keypoint-detection',
        href: '/keypoint-detection',
        title: 'Pose estimation',
        keywords: 'keypoints body skeleton YOLO',
      },
      {
        id: 'ocr',
        title: 'Text recognition',
        keywords: 'OCR read text PaddleOCR',
      },
      {
        id: 'style-transfer',
        title: 'Style transfer',
        keywords: 'art painting mosaic',
      },
    ],
  },
  {
    title: 'Real time',
    keywords: 'vision video camera',
    data: [
      {
        id: 'realtime-object-detection',
        title: 'Live object detection',
        keywords: 'continuous streaming YOLO',
      },
    ],
  },
  {
    title: 'Generative AI',
    keywords: 'generation language',
    data: [
      {
        id: 'llm-chat',
        title: 'Local chat',
        keywords: 'LLM conversation assistant LFM',
      },
      {
        id: 'text-to-image',
        title: 'Text to image',
        keywords: 'generate pictures SDXS DreamShaper',
      },
    ],
  },
  {
    title: 'Audio & speech',
    keywords: 'speech audio voice sound',
    data: [
      {
        id: 'text-to-speech',
        title: 'Text to speech',
        keywords: 'synthesis speak Kokoro',
      },
      {
        id: 'speech-to-text',
        title: 'Speech to text',
        keywords: 'transcription recognition Whisper',
      },
      {
        id: 'voice-activity-detection',
        title: 'Voice activity detection',
        keywords: 'microphone silence FSMN VAD',
      },
    ],
  },
  {
    title: 'Embeddings & search',
    keywords: 'vision image text',
    data: [
      {
        id: 'image-embeddings',
        title: 'Multimodal search',
        keywords: 'rank similarity CLIP',
      },
    ],
  },
  {
    title: 'Natural language processing',
    keywords: 'language text',
    data: [
      {
        id: 'privacy-filter',
        title: 'Privacy filter',
        keywords: 'redact personal information PII',
      },
    ],
  },
];

export function filterTasks(query: string): TaskSection[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

  return TASK_SECTIONS.map((section) => ({
    ...section,
    data: section.data.filter((task) => {
      const searchable = `${section.title} ${section.keywords} ${task.title} ${task.keywords}`;
      const normalized = searchable.toLocaleLowerCase();

      return terms.every((term) => normalized.includes(term));
    }),
  })).filter((section) => section.data.length > 0);
}
