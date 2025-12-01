import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PdfViewerService {
  private pdfBasePath = '/assets/docs/';
  
  private pdfFiles = {
    'esquemas': 'esquemas.pdf',
    'resumos': 'resumos_tematicos.pdf'
  };

  constructor(
    private sanitizer: DomSanitizer,
    private platform: Platform
  ) {}

  /**
   * Verifica se está rodando no Capacitor
   */
  private isCapacitor(): boolean {
    const isCapacitor = this.platform.is('capacitor') || 
           window.location.protocol === 'capacitor:' ||
           (window.location.hostname === 'localhost' && this.platform.is('mobile')) ||
           window.location.href.includes('capacitor://');
    
    return isCapacitor;
  }

  /**
   * Obtém o URL do PDF
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @returns URL seguro para o PDF
   */
  getPdfUrl(pdfName: string): SafeResourceUrl {
    const fileName = this.pdfFiles[pdfName as keyof typeof this.pdfFiles];
    if (!fileName) {
      throw new Error(`PDF não encontrado: ${pdfName}`);
    }
    
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBasePath + fileName);
  }

  /**
   * Obtém o URL do PDF como string
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @returns URL como string
   */
  getPdfUrlAsString(pdfName: string): string {
    const fileName = this.pdfFiles[pdfName as keyof typeof this.pdfFiles];
    if (!fileName) {
      throw new Error(`PDF não encontrado: ${pdfName}`);
    }
    
    return this.pdfBasePath + fileName;
  }

  /**
   * Carrega o PDF como blob e retorna uma URL de objeto
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @returns Promise<string> URL de objeto do blob
   */
  async getPdfAsBlobUrl(pdfName: string): Promise<string> {
    try {
      const url = this.getPdfUrlAsString(pdfName);
      
      // Usar fetch nativo (funciona tanto no Capacitor quanto no web)
      return this.loadPdfWithFetch(url);
      
    } catch (error) {
      console.error('Erro ao carregar PDF como blob:', error);
      
      return this.getPdfAsBlobUrlAlternative(pdfName);
    }
  }

  /**
   * Carrega PDF usando fetch nativo (para Capacitor)
   */
  private async loadPdfWithFetch(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf,application/octet-stream,*/*',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar PDF: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      return blobUrl;
      
    } catch (error) {
      console.error('Erro ao carregar PDF com fetch:', error);
      throw new Error('Não foi possível carregar o PDF no dispositivo móvel.');
    }
  }

  /**
   * Método alternativo para carregar PDF
   */
  private async getPdfAsBlobUrlAlternative(pdfName: string): Promise<string> {
    try {
      const url = this.getPdfUrlAsString(pdfName);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar PDF: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
      
    } catch (error) {
      console.error('Erro no método alternativo:', error);
      throw new Error('Não foi possível carregar o PDF.');
    }
  }

  /**
   * Verifica se o PDF existe na lista de PDFs disponíveis
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @returns Promise<boolean> que resolve para true se o PDF está na lista
   */
    async checkPdfExists(pdfName: string): Promise<boolean> {
    // Verifica se o PDF está na lista de PDFs disponíveis
    return pdfName in this.pdfFiles;
  }

  /**
   * Verifica se o dispositivo é móvel
   * @returns true se for um dispositivo móvel
   */
  isMobileDevice(): boolean {
    return this.platform.is('mobile') || 
           this.platform.is('android') || 
           this.platform.is('ios') ||
           window.innerWidth < 768;
  }

  /**
   * Abre o PDF diretamente em uma nova janela/aba
   * @param pdfName Nome do PDF (esquemas ou resumos)
   */
  openPdfInNewTab(pdfName: string): void {
    const fileName = this.pdfFiles[pdfName as keyof typeof this.pdfFiles];
    if (!fileName) {
      throw new Error(`PDF não encontrado: ${pdfName}`);
    }
    
    window.open(this.pdfBasePath + fileName, '_blank');
  }

  /**
   * Libera a memória de uma URL de objeto
   * @param blobUrl URL de objeto a ser liberada
   */
  revokeBlobUrl(blobUrl: string): void {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  }
} 