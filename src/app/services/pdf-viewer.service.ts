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
   * @param useRemote Se true, usa o URL remoto em vez do local
   * @returns URL seguro para o PDF
   */
  getPdfUrl(pdfName: string, useRemote: boolean = false): SafeResourceUrl {
    const fileName = this.pdfFiles[pdfName as keyof typeof this.pdfFiles];
    if (!fileName) {
      throw new Error(`PDF não encontrado: ${pdfName}`);
    }
    
    const basePath = useRemote ? this.remotePdfBasePath : this.pdfBasePath;
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
   * Carrega o PDF como blob e retorna uma URL de objeto
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @param useRemote Se true, usa o URL remoto em vez do local
   * @returns Promise<string> URL de objeto do blob
   */
  async getPdfAsBlobUrl(pdfName: string, useRemote: boolean = false): Promise<string> {
    try {
      const url = this.getPdfUrlAsString(pdfName, useRemote);
      
      // Se estiver no Capacitor, usar fetch nativo
      if (this.isCapacitor()) {
        return this.loadPdfWithFetch(url);
      }
      
      // Configurações para ambiente web
      const options: any = {
        responseType: 'blob',
        observe: 'response'
      };
      
      const response: any = await firstValueFrom(this.http.get(url, options));
      
      if (response.status !== 200 || !response.body) {
        throw new Error(`Erro ao carregar PDF: ${response.status}`);
      }
      
      // Verificar se o tipo de conteúdo é PDF
      const contentType = response.headers.get('content-type');
      
      if (contentType && !contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {}
      // Criar URL de objeto do blob
      const blob = new Blob([response.body], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
      
    } catch (error) {
      console.error('Erro ao carregar PDF como blob:', error);
      
      return this.getPdfAsBlobUrlAlternative(pdfName, useRemote);
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
   * Método alternativo para carregar PDF no Capacitor
   */
  private async getPdfAsBlobUrlAlternative(pdfName: string, useRemote: boolean = false): Promise<string> {
    try {
      const url = this.getPdfUrlAsString(pdfName, useRemote);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar PDF: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
      
    } catch (error) {
      console.error('Erro no método alternativo:', error);
      throw new Error('Não foi possível carregar o PDF no dispositivo móvel.');
    }
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