import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  books: any;

  constructor(public apiService: ApiService) {}

  ngOnInit() {
    this.apiService
      .getAllBooks()
      .then((data) => {
        this.books = data.data;
        console.log(this.books);
      })
      .catch((error) => {
        console.error('Erro ao carregar os livros:', error);
      });
  }
}
