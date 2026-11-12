import RNBlobUtil from 'react-native-blob-util';
import {
  createFsmnVoiceActivityDetector,
  models,
  wrapAsync,
  type LLMModel,
} from 'react-native-executorch';
import {
  createLLMRunner,
  createChatPreprocessor,
  parseTokenizerConfig,
  type LLMRunner,
  type Prompt,
} from 'react-native-executorch/llm';

const SOURCE = models.llm.LFM3_AUDIO_2B.XNNPACK_8DA4W;
const REVISION = 'bd5858beef1c88eac49686af7173a8b3624a0d91';
export const LFM_AUDIO = {
  ...SOURCE,
  modelPath: SOURCE.modelPath.replace('/resolve/v1.0.0/', `/resolve/${REVISION}/`),
  tokenizerPath: SOURCE.tokenizerPath.replace('/resolve/v1.0.0/', `/resolve/${REVISION}/`),
  tokenizerConfigPath: SOURCE.tokenizerConfigPath.replace(
    '/resolve/v1.0.0/',
    `/resolve/${REVISION}/`
  ),
  vadModel: models.voiceActivityDetection.FSMN_VAD.XNNPACK_FP32,
};
export type LfmAudioConfig = LLMModel & { vadModel: typeof LFM_AUDIO.vadModel };

const recognize = wrapAsync((runner: LLMRunner, prompt: Prompt) => {
  'worklet';
  runner.reset();
  let text = '';
  try {
    const stats = runner.generate(prompt, { temperature: 0, maxNewTokens: 256 }, (token) => {
      text += token;
    });
    if (stats.numTokens >= 256)
      throw new Error('LFM3 transcription reached its token limit. Try a shorter segment.');
    return text;
  } finally {
    runner.reset();
  }
});

/** Uses LFM3 Audio for ASR without a chat history retaining previous PCM inputs.
 * Each crop gets the model's ASR system instruction, a fresh KV position and disposable media tensors.
 */
export async function createLfmAudioTranscriber(config: LfmAudioConfig) {
  const tokenizerConfig = parseTokenizerConfig(
    JSON.parse(await RNBlobUtil.fs.readFile(config.tokenizerConfigPath, 'utf8'))
  );
  const preprocessor = createChatPreprocessor({
    chatTemplate: tokenizerConfig.chatTemplate,
    bosToken: tokenizerConfig.bosToken,
    eosToken: tokenizerConfig.eosToken,
    modalities: config.modalities,
    preprocessorConfig: config.preprocessorConfig,
  });
  let runner: LLMRunner | undefined;
  let vad: Awaited<ReturnType<typeof createFsmnVoiceActivityDetector>> | undefined;
  try {
    vad = await createFsmnVoiceActivityDetector(config.vadModel);
    runner = await createLLMRunner(config.modelPath, config.tokenizerPath, config.modalities);
  } catch (cause) {
    preprocessor.dispose();
    vad?.dispose();
    runner?.dispose();
    throw cause;
  }
  const model = runner;
  const activity = vad;
  return {
    async transcribe(audio: Float32Array) {
      if (!(await activity.detectVoice(audio)).length) return '';
      try {
        const prompt = preprocessor.process(
          [
            { role: 'system', content: 'Perform ASR in English.' },
            { role: 'user', content: [{ kind: 'audio', audio }] },
          ],
          2
        );
        return (await recognize(model, prompt)).trim();
      } finally {
        preprocessor.clear();
      }
    },
    transcribeStop() {
      model.stop();
    },
    dispose() {
      preprocessor.dispose();
      activity.dispose();
      model.dispose();
    },
  };
}
