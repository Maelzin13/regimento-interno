import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { DetailedUserModel } from 'src/app/models/detailedUserModel';

@Component({
  selector: 'app-user-edit',
  templateUrl: './user-edit.page.html',
  styleUrls: ['./user-edit.page.scss'],
})
export class UserEditPage implements OnInit {
  loading = false;
  isAdmin = false;
  errorMessage = '';
  successMessage = '';
  user: DetailedUserModel | null = null;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.loading = true;
    const userId = this.route.snapshot.params['id'];

    try {
      const userData = await this.userService.getUsersById(userId);
      this.user = DetailedUserModel.fromJSON(userData);

      console.log(this.user);

      if (this.user.subscriptionStartDate) {
        this.user.subscriptionStartDate = new Date(
          this.user.subscriptionStartDate * 1000
        ).toISOString();
      } else {
        this.user.subscriptionStartDate = new Date().toISOString();
      }

      this.isAdmin = this.user.isAdmin;
    } catch (error) {
      console.error(error);
      this.errorMessage = 'Erro ao carregar informações do usuário.';
    } finally {
      this.loading = false;
    }
  }

  private formatDate(dateStr: string): string {
    const [datePart, timePart] = dateStr.split(' ');

    const timeFormatted = timePart ? timePart.split('.')[0] : '';
    return `${datePart}T${timeFormatted}`;
  }

  async saveChanges() {
    //   if (!this.user) return;
    //   this.loading = true;
    //   this.successMessage = '';
    //   this.errorMessage = '';
    //   try {
    //     const userJSON = this.user.toJSON();
    //     await this.userService.updateUser(userJSON);
    //     this.successMessage = 'Usuário atualizado com sucesso!';
    //     // Redireciona após 2 segundos
    //     setTimeout(() => {
    //       this.router.navigate(['/pages/user']);
    //     }, 2000);
    //   } catch (error) {
    //     console.error(error);
    //     this.errorMessage = 'Erro ao salvar as alterações.';
    //   } finally {
    //     this.loading = false;
    //   }
  }
}
