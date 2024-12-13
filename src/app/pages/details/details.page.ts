import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
})
export class DetailsPage implements OnInit {
  article = { title: 'Artigo 1', content: 'Conteúdo do Artigo 1' };

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const articleId = this.route.snapshot.paramMap.get('articleId');
    console.log('Artigo ID:', articleId);
  }
}
