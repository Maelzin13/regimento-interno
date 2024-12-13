import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-sections',
  templateUrl: './sections.page.html',
  styleUrls: ['./sections.page.scss'],
})
export class SectionsPage implements OnInit {
  sections = [
    { id: 1, name: 'Sessão 1' },
    { id: 2, name: 'Sessão 2' },
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const chapterId = this.route.snapshot.paramMap.get('chapterId');
    console.log('Capítulo ID:', chapterId);
  }
}
