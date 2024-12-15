import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'Regimento Interno',
  webDir: 'www',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId:
        '10593129361-i8585acjc0v8vje4jc2u27bl5pop9m3s.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },

    FacebookLogin: {
      appId: '9233731516671511',
      permissions: ['email', 'public_profile'],
    },
  },
};

export default config;
