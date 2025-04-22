import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyA76-1Beau7Zc1HATQXPwS0Z1zWgrEIw4c',
  authDomain: 'regimento-interno-comentado.firebaseapp.com',
  projectId: 'regimento-interno-comentado',
  storageBucket: 'regimento-interno-comentado.firebasestorage.app',
  messagingSenderId: '202495948548',
  appId: '1:202495948548:web:0182a0168649faec970251',
  measurementId: 'G-2SSKFE05MP',
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
