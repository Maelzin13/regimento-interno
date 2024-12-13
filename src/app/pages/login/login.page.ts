import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private router: Router) {}

  login() {
    if (this.email === 'admin@example.com' && this.password === 'admin') {
      this.router.navigate(['/home']);
    } else {
      alert('Credenciais inválidas!');
    }
  }
}
