import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  standalone: false,
  selector: 'app-descricao-modal',
  templateUrl: './descricao-modal.component.html',
  styleUrls: ['./descricao-modal.component.scss'],
})
export class DescricaoModalComponent implements OnInit {
  @Input() titulo: string = '';
  @Input() descricao: string = '';

  atosMesaTable: any[] = [];
  loadingAtosMesa: boolean = false;
  errorAtosMesa: string = '';

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    if (this.titulo === 'Atos da Mesa') {
      this.carregarAtosDaMesa();
    }
  }

  carregarAtosDaMesa() {
    // Dados extraídos da tabela de Atos da Mesa conforme imagem
    this.atosMesaTable = [
      {
        'numero': "160",
        'ano': "2025",
        'ementa': "Estabelece a proibição do porte de cartazes, banners, panfletos e afins no Plenário Ulysses Guimarães e nos Plenários de Comissões.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2025/atodamesa-160-26-fevereiro-2025-796975-norma-cd-mesa.html"
      },
      {
        'numero': "11",
        'ano': "2023",
        'ementa': "Dispõe sobre o número de membros e a distribuição das vagas nas Comissões Permanentes entre os Partidos, Federações e Blocos Parlamentares.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2023/atodamesa-11-8-marco-2023-793827-norma-cd-mesa.html"
      },
      {
        'numero': "209",
        'ano': "2021",
        'ementa': "Disciplina o processo legislativo digital no âmbito da Câmara dos Deputados e dá outras providências.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2021/atodamesa-209-21-outubro-2021-791898-norma-cd-mesa.html"
      },
      {
        'numero': "145",
        'ano': "2020",
        'ementa': "Dispõe sobre o ingresso, a permanência e a circulação de pessoas nos edifícios e locais sob responsabilidade da Câmara dos Deputados.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2020/atodamesa-145-22-julho-2020-790753-norma-cd-mesa.html"
      },
      {
        'numero': "98",
        'ano': "2019",
        'ementa': "Dispõe sobre os procedimentos internos da Procuradoria Parlamentar da Câmara dos Deputados",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2019/atodamesa-98-5-setembro-2019-789096-norma-cd-mesa.html"
      },
      {
        'numero': "80",
        'ano': "2019",
        'ementa': "Dispõe sobre eventos e produtos gráficos e bibliográficos no âmbito das Comissões; e revoga o Ato da Mesa nº 33, de 11 de abril de 2012.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2019/atodamesa-80-4-junho-2019-788269-norma-cd-mesa.html"
      },
      {
        'numero': "191",
        'ano': "2017",
        'ementa': "Estabelece os critérios para a contabilização de presença às sessões da Câmara dos Deputados para os fins do disposto no art. 55, III, da Constituição Federal, e dá outras providências.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2017/atodamesa-191-8-junho-2017-785035-norma-cd-mesa.html"
      },
      {
        'numero': "184",
        'ano': "2017",
        'ementa': "Autoriza a transmissão ao vivo, pela internet, dos trabalhos e eventos institucionais dos órgãos políticos e administrativos da Câmara dos Deputados realizados em suas dependências.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2017/atodamesa-184-16-maio-2017-784815-norma-cd-mesa.html"
      },
      {
        'numero': "80",
        'ano': "2016",
        'ementa': "Dispõe sobre a validade jurídica dos documentos digitais produzidos ou copiados em formato digital pela Câmara dos Deputados.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2016/atodamesa-80-23-marco-2016-782648-norma-cd-mesa.html"
      },
      {
        'numero': "73",
        'ano': "2016",
        'ementa': "Dispõe sobre comunicação parlamentar de desligamento ou filiação partidária.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2016/atodamesa-73-3-fevereiro-2016-782326-norma-cd-mesa.html"
      },
      {
        'numero': "52",
        'ano': "2015",
        'ementa': "Dispõe sobre a oitiva, nas dependências da Câmara dos Deputados, de pessoas submetidas a pena privativa de liberdade ou a prisão processual e revoga o Ato da Mesa nº 82, de 2006.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2015/atodamesa-52-17-setembro-2015-781529-norma-cd-mesa.html"
      },
      {
        'numero': "33",
        'ano': "2015",
        'ementa': "Dispõe sobre o tratamento dos documentos que contêm informações de acesso restrito recebidos de órgão externo pela Câmara dos Deputados.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2015/atodamesa-33-19-junho-2015-781024-norma-cd-mesa.html"
      },
      {
        'numero': "95",
        'ano': "2013",
        'ementa': "Fixa a competência dos membros da Mesa Diretora",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2013/atodamesa-95-11-abril-2013-776128-norma-cd-mesa.html"
      },
      {
        'numero': "65",
        'ano': "2013",
        'ementa': "Aprova o Regulamento dos Procedimentos para a Realização de Eventos na Câmara dos Deputados e altera o Anexo II do Ato da Mesa n° 41, de 2009.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2013/atodamesa-65-8-janeiro-2013-775051-norma-cd-mesa.html"
      },
      {
        'numero': "58",
        'ano': "2013",
        'ementa': "Estabelece diretrizes para a Gestão do Relacionamento da Câmara dos Deputados com a sociedade, de forma não presencial, e dá outras providências.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2013/atodamesa-58-8-janeiro-2013-775040-publicacaooriginal-138697-cd-mesa.html"
      },
      {
        'numero': "45",
        'ano': "2012",
        'ementa': "Dispõe sobre a aplicação, no âmbito da Câmara dos Deputados, da Lei de Acesso à Informação - Lei nº 12.527, de 18 de novembro de 2011, e dá outras providências.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2012/atodamesa-45-16-julho-2012-773823-norma-cd-mesa.html"
      },
      {
        'numero': "31",
        'ano': "2012",
        'ementa': "Disciplina a concessão de diárias, de adicional de embarque e desembarque e de passagens aéreas.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2015/atodamesa-25-6-maio-2015-780670-norma-cd-mesa.html"
      },
      {
        'numero': "69",
        'ano': "2010",
        'ementa': "Disciplina a afixação de cartazes e afins nas dependências internas e externas da Câmara dos Deputados, e dispõe sobre a divulgação de candidaturas, no período eleitoral, para os cargos da Mesa Diretora.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2010/atodamesa-69-15-dezembro-2010-609832-norma-cd-mesa.html"
      },
      {
        'numero': "66",
        'ano': "2010",
        'ementa': "Dispõe sobre o registro de comparecimento dos Deputados.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2010/atodamesa-66-14-julho-2010-607368-norma-cd-mesa.html"
      },
      {
        'numero': "37",
        'ano': "2009",
        'ementa': "Regulamenta os procedimentos a serem observados na apreciação de representações relacionadas ao decoro parlamentar e de processos relacionados às hipóteses de perda de mandato previstas nos incisos IV e V do art. 55 da Constituição Federal.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2009/atodamesa-37-31-marco-2009-587588-norma-cd-mesa.html"
      },
      {
        'numero': "85",
        'ano': "2006",
        'ementa': "Disciplina a competência para resposta a solicitações de informações de agentes políticos.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2006/atodamesa-85-16-agosto-2006-545400-norma-cd-mesa.html"
      },
      {
        'numero': "69",
        'ano': "2005",
        'ementa': "Cria o registro de Frentes Parlamentares na Câmara dos Deputados.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2005/atodamesa-69-10-novembro-2005-539350-norma-cd-mesa.html"
      },
      {
        'numero': "35",
        'ano': "2003",
        'ementa': "Dispõe sobre a apresentação de relatório de participação em missão oficial com ônus e sua divulgação.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/2003/atodamesa-35-12-novembro-2003-321499-norma-cd-mesa.html"
      },
      {
        'numero': "11",
        'ano': "1991",
        'ementa': "Dispõe sobre a tramitação dos requerimentos de informação, previstos no inciso I, do art. 115 do Regimento Interno.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/1991/atodamesa-11-23-maio-1991-321765-norma-cd-mesa.html"
      },
      {
        'numero': "197",
        'ano': "1990",
        'ementa': "Dispõe sobre o número de membros das Comissões Permanentes",
        'link': "https://www2.camara.leg.br/legin/int/atomes/1990/atodamesa-197-1-marco-1990-320613-publicacaooriginal-1-cd-mesa.html"
      },
      {
        'numero': "177",
        'ano': "1989",
        'ementa': "Dispõe sobre a tramitação de proposições e dá outras providências.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/1989/atodamesa-177-22-novembro-1989-320596-norma-cd-mesa.html"
      },
      {
        'numero': "63",
        'ano': "1980",
        'ementa': "Dispõe sobre o ingresso em dependências da Câmara dos Deputados.",
        'link': "https://www2.camara.leg.br/legin/int/atomes/1980-1987/atodamesa-63-10-setembro-1980-319069-norma-cd-mesa.html"
      },
    ];
  }

  fechar() {
    this.modalCtrl.dismiss();
  }
}
