import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-chapters',
  templateUrl: './chapters.page.html',
  styleUrls: ['./chapters.page.scss'],
})
export class ChaptersPage implements OnInit {
  chapters = [
    { id: 1, name: 'Capítulo 1' },
    { id: 2, name: 'Capítulo 2' },
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const titleId = this.route.snapshot.paramMap.get('titleId');
    console.log('Título ID:', titleId);
  }
}
