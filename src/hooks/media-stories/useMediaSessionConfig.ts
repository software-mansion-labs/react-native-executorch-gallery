import { useEffect, useState } from 'react';
import RNBlobUtil from 'react-native-blob-util';
import { useResourceDownload, type LLMModel } from 'react-native-executorch';

import { mediaChatTemplate, mediaConfigKey } from '@/lib/media-stories/media';

/**
 * Wraps the original tokenizer template to isolate each media item. Together with
 * resetOnTurn, this prevents previous images and descriptions from filling the context.
 * Returns a local model config plus any tokenizer preparation error.
 */
export function useMediaSessionConfig(model: LLMModel, enabled: boolean) {
  const download = useResourceDownload(model.tokenizerConfigPath, { preventLoad: !enabled });
  const [prepared, setPrepared] = useState<{ source: string; path?: string; error?: Error }>();
  const source = download.resource;
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const prepare = async () => {
      const config = JSON.parse(await RNBlobUtil.fs.readFile(source, 'utf8'));
      if (typeof config.chat_template !== 'string')
        throw new Error('The model has no chat template.');
      config.chat_template = mediaChatTemplate(config.chat_template);
      const path = `${RNBlobUtil.fs.dirs.CacheDir}/media-session-${mediaConfigKey(config.chat_template)}.json`;
      await RNBlobUtil.fs.writeFile(path, JSON.stringify(config), 'utf8');
      if (!cancelled) setPrepared({ source, path });
    };
    void prepare().catch((cause: unknown) => {
      if (!cancelled)
        setPrepared({ source, error: cause instanceof Error ? cause : new Error(String(cause)) });
    });
    return () => {
      cancelled = true;
    };
  }, [source]);
  return {
    config:
      prepared?.path && prepared.source === source
        ? { ...model, tokenizerConfigPath: prepared.path }
        : undefined,
    error: download.downloadError ?? (prepared?.source === source ? prepared?.error : undefined),
  };
}
