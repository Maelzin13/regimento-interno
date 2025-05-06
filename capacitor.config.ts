import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.regimento.app',
  appName: 'Regimento Interno Comentado',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    Keyboard: {
      resize: 'body',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId:
        '202495948548-u96k38icouig7se6rq4pu065d5oeb0sc.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    GenericOauth2: {
      android: {
        scheme: 'com.regimento.app',
      },
      ios: {
        scheme:
          'com.googleusercontent.apps.202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q',
      },
    },
  },
};

export default config;
