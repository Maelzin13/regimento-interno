import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.regimento.app',
  appName: 'Regimento Interno Comentado',
  webDir: 'www',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId:
        '10593129361-sqku04f9hioan9jpd2g6irrlc6uugo1a.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
