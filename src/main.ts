import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Importações necessárias do Firebase
import { initializeApp } from 'firebase/app'; // Inicializa o Firebase
import { environment } from './environments/environment'; // Certifique-se de que o environment esteja configurado corretamente

// Inicialização do Angular
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.log(err));

// Inicialização do Firebase
const firebaseApp = initializeApp(environment.firebase); // Use a configuração do environment
