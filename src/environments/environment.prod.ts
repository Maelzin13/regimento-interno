// Configurações do Firebase - você pode substituir pelos valores reais
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA76-1Beau7Zc1HATQXPwS0Z1zWgrEIw4c',
  authDomain: 'regimento-interno-comentado.firebaseapp.com',
  projectId: 'regimento-interno-comentado',
  storageBucket: 'regimento-interno-comentado.firebasestorage.app',
  messagingSenderId: '202495948548',
  appId: '1:202495948548:web:0182a0168649faec970251',
  measurementId: 'G-2SSKFE05MP',
};

// Configurações do Google OAuth
const GOOGLE_OAUTH_CONFIG = {
  clientId: '202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q.apps.googleusercontent.com', // iOS client ID
  serverClientId: '202495948548-u96k38icouig7se6rq4pu065d5oeb0sc.apps.googleusercontent.com', // Web client ID para backend
};

export const environment = {
  production: true,
  baseUrl: 'https://regimentocd.com.br',
  firebase: FIREBASE_CONFIG,
  googleOAuth: GOOGLE_OAUTH_CONFIG,
};