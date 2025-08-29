import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyA76-1Beau7Zc1HATQXPwS0Z1zWgrEIw4c',
  authDomain: 'regimento-interno-comentado.firebaseapp.com',
  projectId: 'regimento-interno-comentado',
  storageBucket: 'regimento-interno-comentado.firebasestorage.app',
  messagingSenderId: '202495948548',
  appId: '1:202495948548:android:96124bfc20b0bc76970251', // Android app ID
  measurementId: 'G-2SSKFE05MP',
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
