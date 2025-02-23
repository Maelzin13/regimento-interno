import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BookService } from 'src/app/services/book.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
})
export class SearchPage implements OnInit {
  query: string = '';
  searchBy: string = 'keyword';
  searchResults: any[] = [];
  bookId: number = 1;

  constructor(
    private modalController: ModalController,
    private bookService: BookService
  ) {}

  ngOnInit() {
    console.log('SearchPage iniciada');
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async search() {
    if (!this.query.trim()) {
      this.searchResults = [];
      return;
    }
    try {
      const result = await this.bookService.searchBook(
        this.bookId,
        this.query,
        this.searchBy
      );
      this.searchResults = result.searchResults;
      console.log('Resultados da busca:', this.searchResults);
    } catch (error) {
      console.error('Erro ao buscar o livro:', error);
    }
  }
}
