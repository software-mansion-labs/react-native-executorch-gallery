import { selectExecutorch } from './select-executorch.mjs';

// Preserve the existing local-development shortcut while recording its selection.
try {
  selectExecutorch(['local', ...process.argv.slice(2)]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
