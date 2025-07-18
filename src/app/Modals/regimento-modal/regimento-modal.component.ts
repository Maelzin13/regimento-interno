import { Component, Input, OnInit } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-regimento-modal',
  templateUrl: './regimento-modal.component.html',
  styleUrls: ['./regimento-modal.component.scss']
})
export class RegimentoModalComponent implements OnInit {
  @Input() type: string = '';
  
  content: any = {
    abreviaturas: {
      title: 'Abreviaturas',
      content: `
        <p class="text-lg text-black">Ação Direta de Inconstitucionalidade (ADI)</p>
        <p class="text-lg text-black">Comissão de Constituição e Justiça e de Cidadania (CCJC)</p>
        <p class="text-lg text-black">CF- Constituição Federal</p>
        <p class="text-lg text-black">CN - Congresso Nacional</p>
        <p class="text-lg text-black">CPI - Comissão Parlamentar de Inquérito</p>
        <p class="text-lg text-black">CPMI - Comissão Parlamentar Mista de Inquérito</p>
        <p class="text-lg text-black">DVS - Destaque para Votação em Separado</p>
        <p class="text-lg text-black">HC - Habeas Corpus</p>
        <p class="text-lg text-black">INC - Indicação</p>
        <p class="text-lg text-black">MPV - Medida Provisória</p>
        <p class="text-lg text-black">MS - Mandado de Segurança</p>
        <p class="text-lg text-black">MSC - Mensagem</p>
        <p class="text-lg text-black">PDC - Projeto de Decreto Legislativo (anterior a 2019)</p>
        <p class="text-lg text-black">PDL - Projeto de Decreto Legislativo (após 2019 (PDL)</p>
        <p class="text-lg text-black">PEC - Proposta de Emenda à Constituição</p>
        <p class="text-lg text-black">PL - Projeto de Lei Ordinária</p>
        <p class="text-lg text-black">PLP - Projeto de Lei Complementar</p>
        <p class="text-lg text-black">Projeto de Lei de Conversão (PLV)</p>
        <p class="text-lg text-black">PRC - Projeto de Resolução da Câmara</p>
        <p class="text-lg text-black">QO - Questão de Ordem</p>
        <p class="text-lg text-black">REC - Recurso</p>
        <p class="text-lg text-black">RCCN - Regimento Comum do Congresso Nacional</p>
        <p class="text-lg text-black">REQ - Requerimento</p>
        <p class="text-lg text-black">REM - Reclamação</p>
        <p class="text-lg text-black">RIC - Requerimento de Informação</p>
        <p class="text-lg text-black">RICD - Regimento Interno da Câmara dos Deputados</p>
        <p class="text-lg text-black">SGM - Secretaria-Geral da Mesa</p>
        <p class="text-lg text-black">SDR - Sistema de Deliberação Remota</p>
        <p class="text-lg text-black">STF - Supremo Tribunal Federal</p>
        <p class="text-lg text-black">TCU - Tribunal de Contas da União</p>
        <p class="text-lg text-black">TJDFT - Tribunal de Justiça do Distrito Federal e Territórios</p>
        <p class="text-lg text-black">TVR – Projeto de Decreto Legislativo relativo a concessão e ou
            permissão de rádio e televisão</p>
      `
    },
    indice: {
      title: 'Índice',
      content: `
        <div>
              <h3 class="text-xl font-bold text-[#1E999A] mb-4">Índice dos Resumos temáticos</h3>
              <div class="space-y-2">
                  <p class="text-lg font-semibold text-black">Tudo sobre:</p>
                  <ul class="list-disc pl-8 space-y-2 text-black">
                      <li>Pedido de vista</li>
                      <li>Comunicação de Liderança</li>
                      <li>Criação, constituição e instalação de Comissão</li>
                      <li>Convocacao de Ministro</li>
                      <li>Emendas</li>
                      <li>Uso da palavra</li>
                      <li>Requerimento de informação</li>
                      <li>Apensação e desapensação</li>
                      <li>Destaques</li>
                      <li>Retirada de pauta</li>
                      <li>Prazo das Comissões</li>
                      <li>Eleição nas Comissões</li>
                      <li>Designação de Relator</li>
                      <li>Grupos de trabalho</li>
                      <li>Verificação de votação</li>
                      <li>Ato da Mesa 123/2020 – Principais pontos</li>
                  </ul>
              </div>
          </div>
          <div>
              <h3 >Índice dos Quadros esquemáticos</h3>
              <div>
                  <ul>
                      <li>Participação no Colégio de Líderes</li>
                      <li>Proporcionalidade partidária</li>
                  </ul>
              </div>
          </div>
      `
    },
    resumo: {
      title: 'Resumos Temáticos',
      content: `
        <div>
          <h3 class="text-xl font-bold text-[#1E999A] mb-4">Índice dos Resumos temáticos</h3>
        </div>
      `
    },
    esquematico: {
      title: 'Esquemas',
      content: `
        <div>
          <h3 class="text-xl font-bold text-[#1E999A] mb-4">Índice dos Quadros esquemáticos</h3>
        </div>
      `
    }
  };

  pdfUrl: SafeResourceUrl = '';
  isMobile: boolean = false;
  isLoading: boolean = true;
  currentPage: number = 1;
  totalPages: number = 0;
  pdfScale: number = 1.0;
  showContextViewer: boolean = false;
  contextViewerUrl: string = '';

  constructor(
    private modalCtrl: ModalController,
    private platform: Platform,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.isMobile = this.platform.is('mobile') || this.platform.is('android') || this.platform.is('ios');
    this.setupPdfViewer();
  }

  setupPdfViewer() {
    // Definir os caminhos dos PDFs
    let pdfPath = '';
    
    if (this.type === 'resumo') {
      pdfPath = '/assets/docs/Resumos Temáticos.pdf';
    } else if (this.type === 'esquematico') {
      pdfPath = '/assets/docs/ESQUEMAS.pdf';
    } else {
      return; // Não é um tipo de PDF
    }
    
    // Configurar o visualizador de PDF padrão
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfPath);
    
    // Usar Context7 para visualização em dispositivos móveis
    if (this.isMobile) {
      // Para o Context7, precisamos da URL completa do PDF
      // Vamos usar uma URL pública para os PDFs, pois o Context7 precisa acessar o PDF diretamente
      
      // Em produção, os PDFs devem estar hospedados em um servidor acessível publicamente
      // Por exemplo, um bucket S3 ou outro serviço de armazenamento
      
      // Para este exemplo, usaremos a URL base da aplicação
      const baseUrl = window.location.origin;
      const fullPdfUrl = `${baseUrl}${pdfPath}`;
      
      // Usar o serviço Context7 para visualização
      this.contextViewerUrl = `https://context7.com/view?url=${encodeURIComponent(fullPdfUrl)}`;
      this.showContextViewer = true;
      
      console.log('Context7 URL:', this.contextViewerUrl);
    }
  }

  onPdfLoaded(event: any) {
    this.isLoading = false;
    this.totalPages = event.numPages;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  zoomIn() {
    this.pdfScale += 0.25;
  }

  zoomOut() {
    if (this.pdfScale > 0.5) {
      this.pdfScale -= 0.25;
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
} 