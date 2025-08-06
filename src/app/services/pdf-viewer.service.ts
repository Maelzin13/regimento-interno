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
    
    console.log('Detecção do ambiente Capacitor:', {
      platformIsCapacitor: this.platform.is('capacitor'),
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isMobile: this.platform.is('mobile'),
      href: window.location.href,
      result: isCapacitor
    });
    
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
   * Carrega o PDF como blob e retorna uma URL de objeto
   * @param pdfName Nome do PDF (esquemas ou resumos)
   * @param useRemote Se true, usa o URL remoto em vez do local
   * @returns Promise<string> URL de objeto do blob
   */
  async getPdfAsBlobUrl(pdfName: string, useRemote: boolean = false): Promise<string> {
    try {
      const url = this.getPdfUrlAsString(pdfName, useRemote);
      console.log(`Carregando PDF como blob: ${url}`);
      console.log(`Parâmetros: pdfName=${pdfName}, useRemote=${useRemote}`);
      
      // Se estiver no Capacitor, usar fetch nativo
      if (this.isCapacitor()) {
        console.log('Detectado ambiente Capacitor, usando fetch nativo');
        return this.loadPdfWithFetch(url);
      }
      
      // Configurações para ambiente web
      const options: any = {
        responseType: 'blob',
        observe: 'response'
      };
      
      console.log('Usando HttpClient para carregar PDF');
      const response: any = await firstValueFrom(this.http.get(url, options));
      
      console.log('Resposta HTTP:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        bodySize: response.body?.size
      });
      
      if (response.status !== 200 || !response.body) {
        throw new Error(`Erro ao carregar PDF: ${response.status}`);
      }
      
      // Verificar se o tipo de conteúdo é PDF
      const contentType = response.headers.get('content-type');
      console.log(`Tipo de conteúdo recebido: ${contentType}`);
      
      if (contentType && !contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
        console.warn(`Tipo de conteúdo inesperado: ${contentType}`);
      }
      
      // Criar URL de objeto do blob
      const blob = new Blob([response.body], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      
      console.log('PDF carregado como blob com sucesso');
      return blobUrl;
      
    } catch (error) {
      console.error('Erro ao carregar PDF como blob:', error);
      
      // Se falhar, tentar método alternativo
      console.log('Tentando método alternativo...');
      return this.getPdfAsBlobUrlAlternative(pdfName, useRemote);
    }
  }

  /**
   * Carrega PDF usando fetch nativo (para Capacitor)
   */
  private async loadPdfWithFetch(url: string): Promise<string> {
    try {
      console.log(`Carregando PDF com fetch: ${url}`);
      
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
      
      console.log('PDF carregado com fetch com sucesso');
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
      console.log(`Tentando método alternativo: ${url}`);
      
      // Usar fetch diretamente para evitar problemas com HttpClient no Capacitor
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar PDF: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      console.log('PDF carregado com método alternativo');
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
   * Testa se os PDFs estão acessíveis
   */
  async testPdfAccess(): Promise<void> {
    console.log('Testando acesso aos PDFs...');
    
    for (const [name, fileName] of Object.entries(this.pdfFiles)) {
      console.log(`Testando PDF: ${name} -> ${fileName}`);
      
      try {
        // Testar URL local
        const localUrl = this.getPdfUrlAsString(name, false);
        console.log(`URL local: ${localUrl}`);
        
        const localExists = await this.checkPdfExists(name, false);
        console.log(`PDF local existe: ${localExists}`);
        
        // Testar URL remota
        const remoteUrl = this.getPdfUrlAsString(name, true);
        console.log(`URL remota: ${remoteUrl}`);
        
        const remoteExists = await this.checkPdfExists(name, true);
        console.log(`PDF remoto existe: ${remoteExists}`);
        
      } catch (error) {
        console.error(`Erro ao testar PDF ${name}:`, error);
      }
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