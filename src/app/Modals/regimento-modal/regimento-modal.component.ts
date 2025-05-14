import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-regimento-modal',
  templateUrl: './regimento-modal.component.html',
  styleUrls: ['./regimento-modal.component.scss']
})
export class RegimentoModalComponent {
  @Input() type: string = '';
  
  content: any = {
    autor: {
      title: 'O Autor',
      content: `
        <h3>Nome do Autor</h3>
        <p>Breve biografia e qualificações do autor...</p>
        <p>Experiência profissional e acadêmica...</p>
      `
    },
    apresentacao: {
      title: 'Apresentação',
      content: `
        <h3>Apresentação do Regimento Interno</h3>
        <p>Contexto histórico e importância do regimento...</p>
        <p>Objetivos e estrutura da obra...</p>
      `
    },
    abreviaturas: {
      title: 'Abreviaturas',
      content: `
        <h3>Lista de Abreviaturas</h3>
        <ul>
          <li><strong>Art.</strong> - Artigo</li>
          <li><strong>Cap.</strong> - Capítulo</li>
          <li><strong>§</strong> - Parágrafo</li>
          <li><strong>Inc.</strong> - Inciso</li>
          <li><strong>Al.</strong> - Alínea</li>
        </ul>
      `
    },
    indice: {
      title: 'Índice',
      content: `
        <h3>Índice do Regimento Interno</h3>
        <ul>
          <li>Título I - Da Câmara dos Deputados</li>
          <li>Título II - Das Sessões</li>
          <li>Título III - Da Mesa</li>
          <li>Título IV - Das Comissões</li>
          <li>Título V - Do Processo Legislativo</li>
          <li>Título VI - Da Fiscalização e Controle</li>
          <li>Título VII - Das Disposições Gerais e Transitórias</li>
        </ul>
      `
    }
  };

  constructor(private modalCtrl: ModalController) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }
} 