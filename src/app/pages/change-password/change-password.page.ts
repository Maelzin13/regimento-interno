import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ChangePasswordService } from 'src/app/services/change-password.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
})
export class ChangePasswordPage implements OnInit {
  passwordForm: any;

  constructor(
    private toastController: ToastController,
    private changePasswordService: ChangePasswordService
  ) {}

  ngOnInit() {
    console.log('ChangePasswordPage');
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
    });
    toast.present();
  }

  async changePassword() {
    if (this.passwordForm.invalid) {
      this.presentToast(
        'Por favor, preencha todos os campos corretamente.',
        'danger'
      );
      return;
    }

    const { current_password, new_password, new_password_confirmation } =
      this.passwordForm.value;

    try {
      await this.changePasswordService.changePassword(
        current_password,
        new_password,
        new_password_confirmation
      );
      this.presentToast('Senha alterada com sucesso!', 'success');
      this.passwordForm.reset();
    } catch (error: any) {
      this.presentToast(error.message, 'danger');
    }
  }
}
