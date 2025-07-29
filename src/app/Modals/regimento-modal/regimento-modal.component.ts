import { Component, Input, OnInit } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

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

  constructor(
    private modalCtrl: ModalController,
    private platform: Platform,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {}

  ngOnInit() {
    // Se o tipo for um PDF, redirecionar para a página de visualização
    if (this.type === 'resumo' || this.type === 'esquema') {
      const pdfName = this.type === 'resumo' ? 'resumos' : 'esquemas';
      this.redirectToPdfViewer(pdfName);
    }
  }

  redirectToPdfViewer(pdfName: string) {
    // Fechar o modal
    this.modalCtrl.dismiss().then(() => {
      // Navegar para a página de visualização de PDF
      this.router.navigateByUrl(`/pdf-viewer/${pdfName}`);
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
} 