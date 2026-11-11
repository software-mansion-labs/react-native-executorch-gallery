import { useEffect, useState } from 'react';
import RNBlobUtil from 'react-native-blob-util';
import { useResourceDownload, type LLMModel } from 'react-native-executorch';

import { SHADER_MESSAGES } from '@/lib/shader-chat/shader-config';
import { widgetChatTemplate, widgetConfigKey } from '@/lib/widget-builder/widget-chat-template';

/**
 * Isolates constrained turns and disables reasoning without editing model/library assets.
 * @param model Registered model configuration whose tokenizer template is reused.
 * @param enabled Explicit model-load gate; opening the demo alone downloads nothing.
 * @returns A cached direct-output configuration or a download/preparation error.
 */
export function useShaderSessionConfig(model: LLMModel, enabled: boolean) {
  const download = useResourceDownload(model.tokenizerConfigPath, { preventLoad: !enabled });
  const source = download.resource;
  const [prepared, setPrepared] = useState<{ source: string; path?: string; error?: Error }>();
  useEffect(() => {
    if (!source) return;
    let active = true;
    const prepare = async () => {
      const config = JSON.parse(await RNBlobUtil.fs.readFile(source, 'utf8'));
      if (typeof config.chat_template !== 'string') throw new Error('Missing chat template.');
      config.chat_template = widgetChatTemplate(config.chat_template);
      const key = widgetConfigKey(config.chat_template + JSON.stringify(SHADER_MESSAGES));
      const path = `${RNBlobUtil.fs.dirs.CacheDir}/shader-session-${key}.json`;
      await RNBlobUtil.fs.writeFile(path, JSON.stringify(config), 'utf8');
      if (active) setPrepared({ source, path });
    };
    void prepare().catch((error: unknown) => {
      if (active)
        setPrepared({ source, error: error instanceof Error ? error : new Error(String(error)) });
    });
    return () => {
      active = false;
    };
  }, [source]);
  const current = prepared?.source === source ? prepared : undefined;
  return {
    config: current?.path ? { ...model, tokenizerConfigPath: current.path } : undefined,
    error: download.downloadError ?? current?.error,
  };
}
