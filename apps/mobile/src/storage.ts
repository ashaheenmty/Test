import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Tokens live in the iOS Keychain / Android Keystore via expo-secure-store.
 * The web preview (expo export --platform web) keeps them in memory only.
 */
const memory = new Map<string, string>();
const isWeb = Platform.OS === 'web';

export const storage = {
  async get(key: string): Promise<string | null> {
    return isWeb ? (memory.get(key) ?? null) : SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) memory.set(key, value);
    else await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  },
  async remove(key: string): Promise<void> {
    if (isWeb) memory.delete(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
