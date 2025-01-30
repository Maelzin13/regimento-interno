import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.regimento.app',
  appName: 'Regimento Interno',
  webDir: 'www',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId:
        '10593129361-sqku04f9hioan9jpd2g6irrlc6uugo1a.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },

    FacebookLogin: {
      appId: '9233731516671511',
      permissions: ['email', 'public_profile'],
    },
  },
};

export default config;
