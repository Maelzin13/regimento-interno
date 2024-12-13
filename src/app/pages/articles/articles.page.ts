import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-articles',
  templateUrl: './articles.page.html',
  styleUrls: ['./articles.page.scss'],
})
export class ArticlesPage implements OnInit {
  articles = [
    { id: 1, title: 'Artigo 1' },
    { id: 2, title: 'Artigo 2' },
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const sectionId = this.route.snapshot.paramMap.get('sectionId');
    console.log('Sessão ID:', sectionId);
  }
}
