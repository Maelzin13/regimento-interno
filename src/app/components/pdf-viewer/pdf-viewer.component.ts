import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { SafeResourceUrl } from '@angular/platform-browser';
import { PdfViewerService } from '../../services/pdf-viewer.service';
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, PdfViewerModule]
})
export class PdfViewerComponent implements OnInit, OnChanges {
  @Input() pdfName: string = '';
  @Input() useRemoteUrl: boolean = false;
  
  pdfUrl: SafeResourceUrl | null = null;
  pdfSrc: string | null = null; // Fonte do PDF como string
  isMobile: boolean = false;
  isLoading: boolean = true;
  currentPage: number = 1;
  totalPages: number = 0;
  pdfScale: number = 1.0;
  
  // Tratamento de erros
  hasError: boolean = false;
  errorMessage: string = '';
  retryCount: number = 0;
  
  // Configurações do PDF Viewer
  pdfRenderText: boolean = true;
  pdfShowAll: boolean = true;
  pdfOriginalSize: boolean = false;
  pdfExternalLinkTarget: string = 'blank';
  pdfShowBorders: boolean = false;
  pdfAutoresize: boolean = true;
  pdfStickToPage: boolean = true;
  
  constructor(
    private pdfViewerService: PdfViewerService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.loadPdf();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['pdfName'] && !changes['pdfName'].firstChange) || 
        (changes['useRemoteUrl'] && !changes['useRemoteUrl'].firstChange)) {
      this.loadPdf();
    }
  }

  async loadPdf(): Promise<void> {
    if (!this.pdfName) return;
    
    // Resetar estado de erro
    this.hasError = false;
    this.errorMessage = '';
    
    // Mostrar loading
    const loading = await this.loadingController.create({
      message: 'Carregando PDF...',
      spinner: 'circles',
      cssClass: 'custom-loading'
    });
    await loading.present();
    
    this.isLoading = true;
    this.isMobile = this.pdfViewerService.isMobileDevice();
    
    try {
      console.log(`Carregando PDF: ${this.pdfName}, remoto: ${this.useRemoteUrl}`);
      
      // Verificar se o PDF existe
      const pdfExists = await this.pdfViewerService.checkPdfExists(this.pdfName, this.useRemoteUrl);
      
      if (!pdfExists) {
        console.warn(`PDF não encontrado: ${this.pdfName}, remoto: ${this.useRemoteUrl}`);
        
        // Se estamos usando URL local, tentar URL remota
        if (!this.useRemoteUrl) {
          console.log('PDF local não encontrado, tentando remoto...');
          const remoteExists = await this.pdfViewerService.checkPdfExists(this.pdfName, true);
          
          if (remoteExists) {
            console.log('PDF remoto encontrado, usando URL remota.');
            this.useRemoteUrl = true;
          } else {
            throw new Error('PDF não encontrado localmente nem remotamente.');
          }
        } else {
          throw new Error('PDF não encontrado no servidor remoto.');
        }
      }
      
      // Obter URL do PDF como string
      this.pdfSrc = this.pdfViewerService.getPdfUrlAsString(this.pdfName, this.useRemoteUrl);
      console.log('URL do PDF:', this.pdfSrc);
      
      // Ajustar escala para dispositivos móveis
      if (this.isMobile) {
        this.pdfScale = 1.0;
        this.pdfShowAll = true;
        this.pdfStickToPage = true;
        this.pdfAutoresize = true;
      }
    } catch (error) {
      console.error('Erro ao carregar PDF:', error);
      this.isLoading = false;
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível carregar o PDF. Verifique sua conexão e tente novamente.';
      loading.dismiss();
      this.showErrorToast('Erro ao carregar o PDF. Tente novamente.');
    }
  }

  onPdfLoaded(event: any): void {
    console.log('PDF carregado com sucesso:', event);
    this.isLoading = false;
    this.hasError = false;
    this.totalPages = event.numPages;
    
    // Fechar o loading
    this.loadingController.dismiss().catch(() => {
      console.log('Loading já foi fechado');
    });
  }

  onPdfError(error: any): void {
    console.error('Erro ao renderizar PDF:', error);
    this.isLoading = false;
    this.hasError = true;
    this.errorMessage = 'Erro ao renderizar o PDF. Verifique se o arquivo existe e está acessível.';
    
    // Fechar o loading
    this.loadingController.dismiss().catch(() => {
      console.log('Loading já foi fechado');
    });
    
    // Mostrar mensagem de erro
    this.showErrorToast('Erro ao renderizar o PDF. Tentando alternativa...');
    
    // Tentar usar URL remota se estiver usando local
    if (!this.useRemoteUrl && this.retryCount < 1) {
      console.log('Tentando carregar PDF remoto como fallback...');
      this.retryCount++;
      this.useRemoteUrl = true;
      this.loadPdf();
    }
  }

  retryLoading(): void {
    // Alternar entre local e remoto para tentar diferentes fontes
    this.useRemoteUrl = !this.useRemoteUrl;
    this.retryCount++;
    this.loadPdf();
  }

  async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  zoomIn(): void {
    this.pdfScale += 0.25;
  }

  zoomOut(): void {
    if (this.pdfScale > 0.5) {
      this.pdfScale -= 0.25;
    }
  }

  onIframeLoad(): void {
    this.isLoading = false;
    this.loadingController.dismiss().catch(() => {
      console.log('Loading já foi fechado');
    });
  }

  openInNewTab(): void {
    this.pdfViewerService.openPdfInNewTab(this.pdfName, this.useRemoteUrl);
  }
} 