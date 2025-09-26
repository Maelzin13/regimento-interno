import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
})
export class CadastroPage {
  name: string = '';
  email: string = '';
  password: string = '';
  password_confirmation: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
  ) {}



  async register() {
    if (!this.name || !this.email || !this.password || !this.password_confirmation) {
      this.presentToastDanger('Preencha todos os campos.');
      return;
    }

    if(!this.email.includes('@')) {
      this.presentToastDanger('Email inválido.');
      return;
    }

    if(this.password.length < 8) {
      this.presentToastDanger('Senha deve ter no mínimo 8 caracteres.');
      return;
    }
  
    if (this.password !== this.password_confirmation) {
      this.presentToastDanger('As senhas não coincidem.');
      return;
    }
  
    try {
      const res = await this.authService.register({
        name: this.name,
        email: this.email,
        password: this.password,
        password_confirmation: this.password_confirmation
      });
  
      if (res?.access_token) {
        this.presentToastSuccess(res.message);
        this.resetForm();
        this.router.navigate(['/login']);
      }
    } catch (err: any) {
      console.error('Erro ao registrar:', err);
      const msg = this.formatValidationError(err);
      await this.presentToastDanger(msg);
    }
  }

  resetForm() {
    this.name = '';
    this.email = '';
    this.password = '';
    this.password_confirmation = '';
  }

  private formatValidationError(err: any): string {
    const parts: string[] = [];
  
    // Mensagens por campo (errors: { email: ["..."], password: ["..."] })
    if (err?.errors && typeof err.errors === 'object') {
      for (const field of Object.keys(err.errors)) {
        const fieldMsgs = Array.isArray(err.errors[field]) ? err.errors[field] : [String(err.errors[field])];
        // Ex.: "email: Já está em uso"
        parts.push(`${field}: ${fieldMsgs.join(', ')}`);
      }
    }
  
    // Requisitos de senha (lista)
    if (Array.isArray(err?.requirements) && err.requirements.length) {
      parts.push(`Requisitos da senha:\n- ${err.requirements.join('\n- ')}`);
    }
  
    // Exemplo de senha
    if (err?.example) {
      parts.push(`Exemplo: ${err.example}`);
    }
  
    // Mensagem genérica
    if (err?.message) {
      parts.push(err.message);
    }
  
    // Fallback caso nada tenha vindo estruturado
    if (!parts.length) {
      parts.push('Erro ao processar a solicitação.');
    }
  
    // Junta tudo com quebras de linha
    return parts.join('\n');
  }

  async presentToastDanger(message: any) {
    const toast = await this.toastController.create({
      message,
      duration: 6000,
      color: 'danger',
      position: 'middle',
    });
    toast.present();
  }

  async presentToastSuccess(message: any) {
    const toast = await this.toastController.create({
      message,
      duration: 6000,
      color: 'success',
      position: 'middle',
    });
    toast.present();
  }
}
