import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PdfViewerService {
  private pdfBasePath = '/assets/docs/';
  private remotePdfBasePath = '/assets/docs/';
  
  private pdfFiles = {
    'esquemas': 'esquemas.pdf',
    'resumos': 'resumos_tematicos.pdf'
  };

  constructor(
    private sanitizer: DomSanitizer,
    private platform: Platform,
    private http: HttpClient
  ) {}

  /**
   * Obtém o URL do PDF
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @param useRemote Se true, usa o URL remoto em vez do local
   * @returns URL seguro para o PDF
   */
  getPdfUrl(pdfName: string, useRemote: boolean = false): SafeResourceUrl {
    const fileName = this.pdfFiles[pdfName as keyof typeof this.pdfFiles];
    if (!fileName) {
      throw new Error(`PDF não encontrado: ${pdfName}`);
    }
    
    const basePath = useRemote ? this.remotePdfBasePath : this.pdfBasePath;
    console.log(`Gerando URL para PDF: ${basePath}${fileName}`);
    return this.sanitizer.bypassSecurityTrustResourceUrl(basePath + fileName);
  }

  /**
   * Obtém o URL do PDF como string
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @param useRemote Se true, usa o URL remoto em vez do local
   * @returns URL como string
   */
  getPdfUrlAsString(pdfName: string, useRemote: boolean = false): string {
    const fileName = this.pdfFiles[pdfName as keyof typeof this.pdfFiles];
    if (!fileName) {
      throw new Error(`PDF não encontrado: ${pdfName}`);
    }
    
    const basePath = useRemote ? this.remotePdfBasePath : this.pdfBasePath;
    return basePath + fileName;
  }

  /**
   * Verifica se o PDF existe
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @param useRemote Se true, verifica o URL remoto em vez do local
   * @returns Promise<boolean> que resolve para true se o PDF existe
   */
  async checkPdfExists(pdfName: string, useRemote: boolean = false): Promise<boolean> {
    try {
      const url = this.getPdfUrlAsString(pdfName, useRemote);
      
      // Para URLs remotas, podemos fazer uma solicitação HEAD para verificar se o arquivo existe
      if (useRemote) {
        const response = await firstValueFrom(this.http.head(url, { observe: 'response' }));
        return response.status === 200;
      } 
      
      // Para URLs locais, tentamos carregar o arquivo
      const response = await firstValueFrom(this.http.get(url, { 
        responseType: 'blob',
        observe: 'response'
      }));
      
      return response.status === 200 && response.body?.type === 'application/pdf';
    } catch (error) {
      console.error('Erro ao verificar PDF:', error);
      return false;
    }
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
   * @param useRemote Se true, usa o URL remoto em vez do local
   */
  openPdfInNewTab(pdfName: string, useRemote: boolean = false): void {
    const fileName = this.pdfFiles[pdfName as keyof typeof this.pdfFiles];
    if (!fileName) {
      throw new Error(`PDF não encontrado: ${pdfName}`);
    }
    
    const basePath = useRemote ? this.remotePdfBasePath : this.pdfBasePath;
    window.open(basePath + fileName, '_blank');
  }
} 