import { ModalPage } from '../modal/modal.page';
import { ModalController } from '@ionic/angular';
import { ModalNotasPage } from '../modal-notas/modal-notas.page';
import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from 'src/app/services/book.service';
import { AuthService } from 'src/app/services/auth.service';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-view-text',
  templateUrl: './view-text.page.html',
  styleUrls: ['./view-text.page.scss'],
})
export class ViewTextPage implements OnInit {
  book: any;
  bookId: any;
  prefacio: any;
  user: UserModel | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private bookService: BookService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
    this.bookId = this.route.snapshot.paramMap.get('id');

    this.bookService
      .getBookById(this.bookId)
      .then((books: any) => {
        this.prefacio = books.prefacios;
        this.book = books.livro;
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

  safeHTML(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  cleanHTML(content: string): string {
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

   async openModal() {
    const modal = await this.modalController.create({
      component: ModalNotasPage  
    });
    return await modal.present();
  }

  async abrirEditor(itemId: number, itemType: string) {
    const modal = await this.modalController.create({
      component: EditBookModalPage,
      componentProps: {
        itemId: itemId,
        itemType: itemType,
      },
    });

    return await modal.present();
  }
}
