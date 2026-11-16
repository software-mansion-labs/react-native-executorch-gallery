import {
  FLUID_COMPONENTS,
  FLUID_SPEECH,
  loadFluidComponent,
  loadFluidTokenizer,
  disposeFluidModel,
  type FluidComponent,
} from './fluidSpeech';
import { NEMOTRON_FILE_NAME, NEMOTRON_PATH, loadNemotron, disposeNemotron } from './nemotron';

export const MEETING_ASSETS = [
  { name: NEMOTRON_FILE_NAME, path: NEMOTRON_PATH, component: 'diarizer' as const },
  ...FLUID_COMPONENTS.map((component) => ({
    name: FLUID_SPEECH[component].split('/').pop()!,
    path: FLUID_SPEECH[component],
    component,
  })),
  { name: 'tokenizer.json', path: FLUID_SPEECH.tokenizerPath, component: 'tokenizer' as const },
];

/** Validates the selected file through the shipping native loader before installing it. */
export async function validateMeetingAsset(
  component: FluidComponent | 'diarizer' | 'tokenizer',
  path: string
) {
  if (component === 'diarizer') await disposeNemotron(await loadNemotron(path));
  else if (component === 'tokenizer') await disposeFluidModel(await loadFluidTokenizer(path));
  else await disposeFluidModel(await loadFluidComponent(component, path));
}
