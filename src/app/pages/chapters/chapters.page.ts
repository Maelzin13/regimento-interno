import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-chapters',
  templateUrl: './chapters.page.html',
  styleUrls: ['./chapters.page.scss'],
})
export class ChaptersPage implements OnInit {
  capitulo: any;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.capitulo = history.state.capitulo || {};
    console.log('capitulo: ', this.capitulo);
  }

  navigateToArtigo(artigo: any) {
    this.router.navigate(['/articles', artigo.id], {
      state: { artigo },
    });
  }
}
