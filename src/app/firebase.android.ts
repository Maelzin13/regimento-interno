import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../environments/environment';

const firebaseConfig = {
  apiKey: environment.firebase.apiKey,
  authDomain: environment.firebase.authDomain,
  projectId: environment.firebase.projectId,
  storageBucket: environment.firebase.storageBucket,
  messagingSenderId: environment.firebase.messagingSenderId,
  appId: environment.firebase.appId, // Android app ID será configurado via variável de ambiente
  measurementId: environment.firebase.measurementId,
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
