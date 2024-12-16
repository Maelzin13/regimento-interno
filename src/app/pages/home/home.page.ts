import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  books: any;

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
      title: 'Resolução n. 1/2002',
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

  onView(id: number) {
    console.log('Visualizando o livro com ID:', id);
  }

  onEdit(id: number) {
    console.log('Editando o livro com ID:', id);
  }

  onDelete(id: number) {
    console.log('Excluindo o livro com ID:', id);
  }
}
