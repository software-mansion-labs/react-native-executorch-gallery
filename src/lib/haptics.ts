import { Platform, TurboModuleRegistry } from 'react-native';

/** Plays one soft system impact when the installed native build includes Pulsar. */
export async function playActivationHaptic() {
  if (Platform.OS === 'web' || !TurboModuleRegistry.get('RNPulsar')) return;

  try {
    // Keep older development builds usable until the native dependency is rebuilt.
    const { Presets } = await import('react-native-pulsar');

    Presets.System.impactSoft();
  } catch {
    // Optional feedback must never block opening the requested UI.
  }
}
