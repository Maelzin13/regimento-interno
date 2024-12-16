import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  constructor(private afAuth: AngularFireAuth) {}

  public authenticationState = new BehaviorSubject<boolean>(this.isLoggedIn());

  // Verifica se o usuário está logado
  private isLoggedIn(): boolean {
    return localStorage.getItem('loggedIn') === 'true';
  }

  // Login com Email e Senha
  login(usuario: string, senha: string) {
    return this.afAuth
      .signInWithEmailAndPassword(usuario, senha)
      .then((result) => {
        this.authenticationState.next(true);
        localStorage.setItem('loggedIn', 'true');
        console.log('Login successful:', result);
      })
      .catch((error) => {
        this.authenticationState.next(false);
        localStorage.removeItem('loggedIn');
        console.error('Login error:', error);
      });
  }

  // Login com Google
  async loginWithGoogle() {
    return this.afAuth
      .signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then(async (result) => {
        this.authenticationState.next(true);
        localStorage.setItem('loggedIn', 'true'); // Persistência do login
        console.log('Google Login successful:', result);
        return result;
      })
      .catch(async (error) => {
        this.authenticationState.next(false);
        localStorage.removeItem('loggedIn'); // Remove login na falha
        console.error('Google Login error:', error);
      });
  }

  // Logout
  logout() {
    return this.afAuth.signOut().then(() => {
      this.authenticationState.next(false);
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('userProfile');
      console.log('Logout successful');
    });
  }
}
