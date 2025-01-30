import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBYhYMY3FCrLpetZmyH1R3dvCAHuT9ASZo',
  authDomain: 'regimento-interno-987c2.firebaseapp.com',
  projectId: 'regimento-interno-987c2',
  storageBucket: 'regimento-interno-987c2.firebasestorage.app',
  messagingSenderId: '10593129361',
  appId: '1:10593129361:web:fb377197a8bbed0c0dc030',
};

// Inicializa o Firebase
const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
