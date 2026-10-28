import { useEffect, useState } from 'react';
import RNBlobUtil from 'react-native-blob-util';
import { useResourceDownload, type LLMModel } from 'react-native-executorch';

import { APP_BUILDER_MESSAGES } from '@/lib/app-builder';
import { widgetChatTemplate, widgetConfigKey } from '@/lib/widget-chat-template';

/**
 * Prepares a direct-output template with only the system message and latest build
 * request, closing LFM 2.6B's thinking prefix and excluding previous widgets.
 * Returns the local model configuration or a preparation/download error.
 */
export function useWidgetSessionConfig(model: LLMModel, enabled: boolean) {
  const download = useResourceDownload(model.tokenizerConfigPath, { preventLoad: !enabled });
  const revision = widgetConfigKey(JSON.stringify(APP_BUILDER_MESSAGES));
  const [prepared, setPrepared] = useState<{
    source: string;
    revision: string;
    path?: string;
    error?: Error;
  }>();
  const source = download.resource;
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const prepare = async () => {
      const config = JSON.parse(await RNBlobUtil.fs.readFile(source, 'utf8'));
      if (typeof config.chat_template !== 'string')
        throw new Error('The model has no supported chat template.');
      config.chat_template = widgetChatTemplate(config.chat_template);
      const key = widgetConfigKey(config.chat_template + revision);
      const path = `${RNBlobUtil.fs.dirs.CacheDir}/widget-session-${key}-${source.split('/').pop()}`;
      await RNBlobUtil.fs.writeFile(path, JSON.stringify(config), 'utf8');
      if (!cancelled) setPrepared({ source, revision, path });
    };
    void prepare().catch((cause: unknown) => {
      if (!cancelled)
        setPrepared({
          source,
          revision,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        });
    });
    return () => {
      cancelled = true;
    };
  }, [source, revision]);
  const current =
    prepared?.source === source && prepared?.revision === revision ? prepared : undefined;
  return {
    config: current?.path ? { ...model, tokenizerConfigPath: current.path } : undefined,
    error: download.downloadError ?? current?.error,
  };
}
