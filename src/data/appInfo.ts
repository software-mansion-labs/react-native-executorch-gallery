import appPackage from '../../package.json';
import executorchPackage from '../../node_modules/react-native-executorch/package.json';

/** Read package metadata without importing or initializing the native inference runtime. */
export const APP_VERSION = appPackage.version;
export const EXECUTORCH_VERSION = executorchPackage.version;

export const ABOUT_LINKS = [
  { title: 'Documentation', url: 'https://docs.swmansion.com/react-native-executorch/' },
  {
    title: 'GitHub',
    url: 'https://github.com/software-mansion/react-native-executorch',
  },
];
