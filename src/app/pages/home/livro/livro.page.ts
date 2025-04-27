import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';
import { BookService } from 'src/app/services/book.service';
import { DescricaoModalComponent } from 'src/app/Modals/descricao-modal/descricao-modal.component';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-livro',
  templateUrl: './livro.page.html',
  styleUrls: ['./livro.page.scss'],
})
export class LivroPage implements OnInit {
  user: UserModel | null = null;
  books: any;
  isLoading: boolean = true;

  textos = [
    {
      title: 'Constituição Federal',
      link: 'https://www.planalto.gov.br/ccivil_03/constituicao/ConstituicaoCompilado.htm',
    },
    {
      title: 'Regimento do Senado',
      link: 'https://www25.senado.leg.br/documents/12427/45868/RISF+2018+Volume+1.pdf/cd5769c8-46c5-4c8a-9af7-99be436b89c4',
    },
    {
      title: 'Regimento Comum',
      link: 'https://www25.senado.leg.br/documents/59501/97171143/RCCN.pdf',
    },
    {
      title: 'Resolução n. 1/2002 do Congresso Nacional',
      link: 'https://legis.senado.leg.br/norma/561120/publicacao/27423643',
    },
    {
      title: 'Lei Complementar 95/1998',
      link: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp95compilado.htm',
    },
    {
      title: 'Atos da Mesa',
      description:
        'Atos diretamente relacionados ao processo legislativo strictu sensu.',
    },
  ];

  constructor(
    public bookService: BookService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
    this.bookService
      .getAllBooks()
      .then((data) => {
        this.books = data.data;
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Erro ao carregar os livros:', error);
        this.isLoading = false;
      });
  }

  async openDescricaoModal(texto: any) {
    const modal = await this.modalCtrl.create({
      component: DescricaoModalComponent,
      componentProps: {
        titulo: texto.title,
        descricao: texto.description,
      },
    });

    await modal.present();
  }

  async showSubscriptionMessage() {
    const toast = await this.toastCtrl.create({
      message: 'É necessário ter uma assinatura ativa para acessar este conteúdo',
      duration: 3000,
      position: 'middle',
      color: 'warning'
    });
    await toast.present();
  }

  cleanHTML(content: string): string {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    return doc.body.textContent || '';
  }
}
