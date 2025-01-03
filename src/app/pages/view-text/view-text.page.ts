import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ModalPage } from '../modal/modal.page';
import { ActivatedRoute, Router } from '@angular/router';
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
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.bookId = this.route.snapshot.paramMap.get('id');

    console.log('ID do livro:', this.bookId);

    this.apiService
      .getBookById(this.bookId)
      .then((books: any) => {
        this.book = books;
        console.log('Livros carregados:', books);
      })
      .catch((error) => {
        console.error('Erro ao carregar os livros:', error);
      });
  }

  navigateToCapitulo(capitulo: any) {
    this.router.navigate(['/chapters', capitulo.id], {
      state: { capitulo },
    });
  }

  cleanHTML(content: string): string {
    // Remover tags HTML
    const doc = new DOMParser().parseFromString(content, 'text/html');
    return doc.body.textContent || '';
  }

  async showModal(content: string) {
    const modal = await this.modalController.create({
      component: ModalPage,
      componentProps: { content },
    });
    return await modal.present();
  }
}
