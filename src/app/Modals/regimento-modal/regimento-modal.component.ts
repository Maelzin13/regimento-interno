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
        <h3>Sobre o Autor</h3>
        <p>Secretário Executivo de Comissão na Câmara dos Deputados. Advogado, graduado em Filosofia, pós-graduado em Direito Público e Direito Constitucional. Autor do Regimento Interno Facilitado da Câmara dos Deputados.</p>
        <br>
        <h3>Regimento Interno Comentado</h3>
        <p>Uma abordagem simplificada e interativa do RegimentoInterno da Câmara dos Deputados.</p>
      `
    },
    apresentacao: {
      title: 'Apresentação',
      content: `
       <p class="text-lg text-black">Esta obra é resultado da experiência do Autor do Livro Regimento Interno
          Facilitado que ao longo dos trabalhos e dos anos de atuação no Plenário e, por último, nas
          comissões, vinha sentido falta de um suporte teórico que abordasse com um pouco mais de liberdade
          alguns temas do processo legislativo. A necessidade de assentar alguns posicionamentos pessoais,
          algumas experiências, algumas críticas e também tecer algumas considerações elogiosas fez com que os
          escritos particulares do Autor fossem ficando denso de conteúdos, argumentos e teses. O espírito
          acadêmico impeliu então o Autor a socializar as informações e experiências adquiridas para que os
          demais operadores do processo legislativo também tivessem conhecimento desse acervo.</p>
        <p class="text-lg text-black">De fato, o livro Regimento Interno Facilitado, publicado inicialmente
            pelo Autor em 2011 e nas edições anteriores com os autores Nilvia Caldeira, Cristiano Feu e Ruthier
            Silva, serviu de base para as importantes melhorias na abordagem e no acréscimo de informações que,
            mesmo sendo de domínio público, necessitavam ser abordadas de maneira mais direta, mais simples e
            mais didática, desvencilhando um pouco das aspas e literalidades dos textos normativos, por uma
            apresentação mais didática.</p>
        <p class="text-lg text-black">Ao mesmo tempo, a necessidade de ajustar as ferramentas ao momento
            tecnológico que a humanidade vive passou a exigir que o trabalho fosse apresentado em formato
            digital, o que está sendo feito nesta obra com a publicação do livro físico e também em aplicativo
            para android, ios e para acesso na web. Desse modo, esta obra passa a ser o primeiro Regimento
            Interno, nesse formato, a ser publicada digitalmente por meio de aplicativos.</p>
        <p class="text-lg text-black">A obra, além de dar uma formatação totalmente diferente na apresentação
            dos conteúdos, traz comentários e informações que certamente vão auxiliar na compreensão crítica dos
            temas, podendo inclusive servir de argumento para aperfeiçoamento nas regras do processo legislativo
            e para defesa de teses em questões de ordem e outras atuações parlamentares no exercício do mandato.
        </p>
      `
    },
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
    }
  };

  constructor(private modalCtrl: ModalController) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }
} 