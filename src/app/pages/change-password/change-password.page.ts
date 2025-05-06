import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { ChangePasswordService } from 'src/app/services/change-password.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
})
export class ChangePasswordPage implements OnInit {
  passwordForm: {
    current_password: any;
    new_password: any;
    new_password_confirmation: any;
  } = {
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  };

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    if (field === 'current') {
      this.showCurrentPassword = !this.showCurrentPassword;
    } else if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
    } else if (field === 'confirm') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private changePasswordService: ChangePasswordService
  ) {}

  ngOnInit() {}

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
    });
    toast.present();
  }

  async changePassword() {
    if (
      !this.passwordForm.current_password ||
      !this.passwordForm.new_password ||
      !this.passwordForm.new_password_confirmation ||
      this.passwordForm.new_password !==
        this.passwordForm.new_password_confirmation
    ) {
      this.presentToast(
        'Por favor, preencha todos os campos corretamente.',
        'danger'
      );
      return;
    }

    const { current_password, new_password, new_password_confirmation } =
      this.passwordForm;

    try {
      await this.changePasswordService.changePassword(
        current_password,
        new_password,
        new_password_confirmation
      );
      this.presentToast('Senha alterada com sucesso!', 'success');
      this.passwordForm.current_password = '';
      this.passwordForm.new_password = '';
      this.passwordForm.new_password_confirmation = '';
    } catch (error: any) {
      this.presentToast(error.message, 'danger');
    }
  }

  async fecharModal() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
