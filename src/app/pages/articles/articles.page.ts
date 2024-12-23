import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-articles',
  templateUrl: './articles.page.html',
  styleUrls: ['./articles.page.scss'],
})
export class ArticlesPage implements OnInit {
  artigo: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.artigo = history.state.artigo || {};
  }
}
