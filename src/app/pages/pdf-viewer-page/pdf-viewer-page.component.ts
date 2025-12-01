import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { PdfViewerComponent } from '../../components/pdf-viewer/pdf-viewer.component';

@Component({
  selector: 'app-pdf-viewer-page',
  templateUrl: './pdf-viewer-page.component.html',
  styleUrls: ['./pdf-viewer-page.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, PdfViewerComponent]
})
export class PdfViewerPageComponent implements OnInit {
  pdfName: string = '';
  pageTitle: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    
    // Obter o nome do PDF da rota
    this.route.params.subscribe(params => {
      this.pdfName = params['name'];
      this.setPageTitle();
    });
  }

  private setPageTitle() {
    switch(this.pdfName) {
      case 'esquemas':
        this.pageTitle = 'Esquemas';
        break;
      case 'resumos':
        this.pageTitle = 'Resumos Temáticos';
        break;
      default:
        this.pageTitle = 'Visualizador de PDF';
    }
  }
  
  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
} 