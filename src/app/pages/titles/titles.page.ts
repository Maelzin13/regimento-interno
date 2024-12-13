import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-titles',
  templateUrl: './titles.page.html',
  styleUrls: ['./titles.page.scss'],
})
export class TitlesPage implements OnInit {
  titles = [
    { id: 1, name: 'Título 1' },
    { id: 2, name: 'Título 2' },
    { id: 3, name: 'Título 3' },
  ];

  constructor() {}

  ngOnInit() {
    console.log('ngOnInit TitlesPage');
  }
}
