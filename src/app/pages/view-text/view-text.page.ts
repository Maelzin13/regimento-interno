import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ModalPage } from '../modal/modal.page';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-view-text',
  templateUrl: './view-text.page.html',
  styleUrls: ['./view-text.page.scss'],
})
export class ViewTextPage implements OnInit {
  book: any;
  bookId: any;

  constructor(
    private modalController: ModalController,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    // Obtém o ID do livro a partir da rota
    this.bookId = this.route.snapshot.paramMap.get('id');

    // Carrega os livros da API
    this.apiService
      .getAllBooks()
      .then((books: any) => {
        console.log('Livros carregados:', books.data);
        this.book = books.data.find(
          (b: any) => b.id === parseInt(this.bookId, 10)
        );
        console.log('Livro carregado:', this.book);
      })
      .catch((error) => {
        console.error('Erro ao carregar o livro:', error);
      });
  }

  // Modal para mostrar mais detalhes
  async showModal(content: string) {
    const modal = await this.modalController.create({
      component: ModalPage,
      componentProps: { content },
    });
    return await modal.present();
  }
}
