import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { SumarioService } from 'src/app/services/sumario.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';

type Secao = { id: number; texto: string };
type Capitulo = { id: number; texto: string; secoes?: Secao[] };
type Titulo = { id: number; texto: string; capitulos: Capitulo[] };

@Component({
  selector: 'app-regimento-modal',
  templateUrl: './regimento-modal.component.html',
  styleUrls: ['./regimento-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RegimentoModalComponent implements OnInit {
  @Input() type: string = '';
  
  // Conteúdo estático para diferentes tipos de modal
  private staticContent: Record<string, { title: string; content: string }> = {
    abreviaturas: {
      title: 'Abreviaturas',
      content: `
        <div class="abreviaturas-content">
          <p class="abreviatura-item">ADI - Ação Direta de Inconstitucionalidade</p>
          <p class="abreviatura-item">CCJC - Comissão de Constituição e Justiça e de Cidadania</p>
          <p class="abreviatura-item">CF - Constituição Federal</p>
          <p class="abreviatura-item">CN - Congresso Nacional</p>
          <p class="abreviatura-item">CPI - Comissão Parlamentar de Inquérito</p>
          <p class="abreviatura-item">CPMI - Comissão Parlamentar Mista de Inquérito</p>
          <p class="abreviatura-item">DECOM – Departamento de Comissões</p> 
          <p class="abreviatura-item">DVS - Destaque para Votação em Separado</p>
          <p class="abreviatura-item">HC - Habeas Corpus</p>
          <p class="abreviatura-item">INC - Indicação</p>
          <p class="abreviatura-item">MPV - Medida Provisória</p>
          <p class="abreviatura-item">MS - Mandado de Segurança</p> 
          <p class="abreviatura-item">MSC - Mensagem</p>
          <p class="abreviatura-item">PDC - Projeto de Decreto Legislativo (anterior a 2019)</p>
          <p class="abreviatura-item">PDL - Projeto de Decreto Legislativo (após 2019)</p>
          <p class="abreviatura-item">PEC - Proposta de Emenda à Constituição</p>
          <p class="abreviatura-item">PL - Projeto de Lei Ordinária</p>
          <p class="abreviatura-item">PLP - Projeto de Lei Complementar</p>
          <p class="abreviatura-item">PLV - Projeto de Lei de Conversão</p>
          <p class="abreviatura-item">PRC - Projeto de Resolução da Câmara</p>  
          <p class="abreviatura-item">QO - Questão de Ordem</p>
          <p class="abreviatura-item">REC - Recurso</p>
          <p class="abreviatura-item">RCCN - Regimento Comum do Congresso Nacional</p>
          <p class="abreviatura-item">REQ - Requerimento</p>
          <p class="abreviatura-item">REM - Reclamação</p>
          <p class="abreviatura-item">RIC - Requerimento de Informação</p>
          <p class="abreviatura-item">RICD - Regimento Interno da Câmara dos Deputados</p>
          <p class="abreviatura-item">SGM - Secretaria-Geral da Mesa</p>
          <p class="abreviatura-item">SDR - Sistema de Deliberação Remota</p>
          <p class="abreviatura-item">STF - Supremo Tribunal Federal</p>
          <p class="abreviatura-item">TCU - Tribunal de Contas da União</p>
          <p class="abreviatura-item">TJDFT - Tribunal de Justiça do Distrito Federal e Territórios</p>
          <p class="abreviatura-item">TVR – Projeto de Decreto Legislativo relativo à concessão e ou permissão de rádio e televisão</p>
        </div>
      `
    },
    resumo: {
      title: 'Resumos Temáticos',
      content: `
        <div class="resumo-content">
          <h3 class="content-title">Índice dos Resumos temáticos</h3>
        </div>
      `
    },
    esquematico: {
      title: 'Esquemas',
      content: `
        <div class="esquematico-content">
          <h3 class="content-title">Índice dos Quadros esquemáticos</h3>
        </div>
      `
    }
  };
  @Input() bookId!: number;

  loading = false;
  errorMsg = '';

  content: Record<string, { title: string; content: SafeHtml | string }> = {};

  constructor(
    private modalCtrl: ModalController,
    private sanitizer: DomSanitizer,
    private router: Router,
    private sumarioService: SumarioService
  ) {}

  ngOnInit() {
    if (!this.type) this.type = 'sumario';
    
    // Verifica se é um tipo de conteúdo estático
    if (this.staticContent[this.type]) {
      this.loadStaticContent();
    } else {
      this.content[this.type] = { title: 'Carregando…', content: '' };
      this.getSumario();
    }
  }

  private loadStaticContent() {
    const staticData = this.staticContent[this.type];
    if (staticData) {
      this.content[this.type] = {
        title: staticData.title,
        content: this.sanitizer.bypassSecurityTrustHtml(staticData.content)
      };
    }
  }

  private escapeHtml(s: string = ''): string {
    return s.replace(
      /[&<>"]/g,
      (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string)
    );
  }

  /** Constrói o HTML com a hierarquia Título → Capítulo → Seção */
  private buildSumarioHtml(titulos: Titulo[]): string {
    const out: string[] = [];

    for (const t of titulos) {
      // TÍTULO
      out.push(`
        <div class="nivel-1">
          <a href="#titulo-${t.id}">${this.escapeHtml(t.texto)}</a>
        </div>
      `);

      if (t.capitulos?.length) {
        out.push('<ul class="lista-capitulos">');

        for (const c of t.capitulos) {
          // CAPÍTULO
          out.push(`
            <li class="nivel-2">
              <a href="#capitulo-${c.id}">${this.escapeHtml(c.texto)}</a>
            </li>
          `);

          // SEÇÕES
          if (c.secoes?.length) {
            out.push('<ul class="lista-secoes">');
            for (const s of c.secoes) {
              out.push(`
                <li class="nivel-3">
                  <a href="#secao-${s.id}">${this.escapeHtml(s.texto)}</a>
                </li>
              `);
            }
            out.push('</ul>');
          }
        }

        out.push('</ul>');
      }

      out.push('<hr>');
    }

    return out.join('');
  }

  async getSumario() {
    this.loading = true;
    this.errorMsg = '';
    try {
      const resp = await this.sumarioService.getSumario(this.bookId);

      const titulos: Titulo[] = resp?.data?.sumario ?? [];
      const html = this.buildSumarioHtml(titulos);

      this.content[this.type] = {
        title: 'Sumário',
        content: this.sanitizer.bypassSecurityTrustHtml(html),
      };
    } catch (e) {
      console.error('Erro ao carregar sumário:', e);
      this.errorMsg = 'Não foi possível carregar o sumário.';
    } finally {
      this.loading = false;
    }
  }

  redirectToPdfViewer(pdfName: string) {
    this.modalCtrl.dismiss().then(() => {
      this.router.navigateByUrl(`/pdf-viewer/${pdfName}`);
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
