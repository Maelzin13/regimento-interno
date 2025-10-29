import { Component } from '@angular/core';


@Component({
  selector: 'app-autor',
  templateUrl: './autor.page.html',
  styleUrls: ['./autor.page.scss'],
})
export class AutorPage {
  constructor(
  ) {}

  openLinke() {
    window.open('https://regimentocd.com.br/suporte', '_blank');
  }
}
