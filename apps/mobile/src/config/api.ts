import Constants from 'expo-constants';
import { setApiBaseUrl } from '@repo/api-client';

export function initMobileApi() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  const devHostIp = hostUri ? hostUri.split(':')[0] : null;

  let configuredUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:4000';

  // Automatically replace localhost or 127.0.0.1 with the host computer's IP when running in Expo Go
  if (
    devHostIp &&
    (configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1'))
  ) {
    configuredUrl = configuredUrl
      .replace('localhost', devHostIp)
      .replace('127.0.0.1', devHostIp);
  }

  setApiBaseUrl(configuredUrl);
  console.log(`[Mobile API] Connected to backend API at: ${configuredUrl}`);
}
