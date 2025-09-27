import { Component, Input, OnInit } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { SumarioService } from 'src/app/services/sumario.service';

type Secao = { id: number; texto: string };
type Capitulo = { id: number; texto: string; secoes?: Secao[] };
type Titulo = { id: number; texto: string; capitulos: Capitulo[] };

@Component({
  selector: 'app-regimento-modal',
  templateUrl: './regimento-modal.component.html',
  styleUrls: ['./regimento-modal.component.scss'],
})
export class RegimentoModalComponent implements OnInit {
  @Input() type: string = '';
  @Input() bookId!: number; // necessário para buscar o sumário

  content: Record<string, { title: string; content: SafeHtml | string }> = {
    abreviaturas: {
      title: 'Abreviaturas',
      content: `
      <p class="text-lg text-black">ADI - Ação Direta de Inconstitucionalidade</p>
      <p class="text-lg text-black">CCJC - Comissão de Constituição e Justiça e de Cidadania</p>
      <p class="text-lg text-black">CF- Constituição Federal</p>
      <p class="text-lg text-black">CN - Congresso Nacional</p>
      <p class="text-lg text-black">CPI - Comissão Parlamentar de Inquérito</p>
      <p class="text-lg text-black">CPMI - Comissão Parlamentar Mista de Inquérito</p>
      <p class="text-lg text-black">DECOM – Departamento de Comissões</p> 
      <p class="text-lg text-black">DVS - Destaque para Votação em Separado</p>
      <p class="text-lg text-black">HC - Habeas Corpus</p>
      <p class="text-lg text-black">INC - Indicação</p>
      <p class="text-lg text-black">MPV - Medida Provisória</p>
      <p class="text-lg text-black">MS - Mandado de Segurança</p> 
      <p class="text-lg text-black">MSC - Mensagem</p>
      <p class="text-lg text-black">PDC - Projeto de Decreto Legislativo (anterior a 2019)</p>
      <p class="text-lg text-black">PDL - Projeto de Decreto Legislativo (após 2019)</p>
      <p class="text-lg text-black">PEC - Proposta de Emenda à Constituição</p>
      <p class="text-lg text-black">PL - Projeto de Lei Ordinária</p>
      <p class="text-lg text-black">PLP - Projeto de Lei Complementar</p>
      <p class="text-lg text-black">PLV - Projeto de Lei de Conversão</p>
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
      <p class="text-lg text-black">TVR – Projeto de Decreto Legislativo relativo à concessão e ou permissão de rádio e televisão</p>
      `,
    },
    resumo: {
      title: 'Resumos Temáticos',
      content: `
        <div>
          <h3 class="text-xl font-bold text-[#1E999A] mb-4">Índice dos Resumos temáticos</h3>
        </div>
      `,
    },
    esquematico: {
      title: 'Esquemas',
      content: `
        <div>
          <h3 class="text-xl font-bold text-[#1E999A] mb-4">Índice dos Quadros esquemáticos</h3>
        </div>
      `,
    },
  };

  constructor(
    private modalCtrl: ModalController,
    private platform: Platform,
    private router: Router,
    private sanitizer: DomSanitizer,
    private sumarioService: SumarioService
  ) {}

  ngOnInit() {
    const t = (this.type || '').toLowerCase();

    // PDFs (mantém seu comportamento)
    if (t === 'resumo' || t === 'esquema' || t === 'esquematico') {
      const pdfName = t === 'resumo' ? 'resumos' : 'esquemas';
      this.redirectToPdfViewer(pdfName);
      return;
    }

    // Sumário (ao abrir com 'indice' ou 'sumario')
    if (t === 'indice' || t === 'sumario') {
      this.content[t] = { title: 'Carregando…', content: '' };
      this.getSumario(t);
    }
  }

  private escapeHtml(s: string = ''): string {
    return s.replace(
      /[&<>"]/g,
      (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string)
    );
  }

  private buildSumarioHtml(titulos: Titulo[]): string {
    const out: string[] = [];

    for (const t of titulos) {
      out.push(`
        <div class="nivel-1">
          <a href="#titulo-${t.id}">${this.escapeHtml(t.texto)}</a>
        </div>
      `);

      if (t.capitulos?.length) {
        out.push('<ul class="lista-capitulos">');

        for (const c of t.capitulos) {
          out.push(`
            <li class="nivel-2">
              <a href="#capitulo-${c.id}">${this.escapeHtml(c.texto)}</a>
            </li>
          `);

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

  private async getSumario(key: 'indice' | 'sumario') {
    try {
      const resp = await this.sumarioService.getSumario(this.bookId);
      const titulos: Titulo[] = resp?.data?.sumario ?? [];
      const html = this.buildSumarioHtml(titulos);

      this.content[key] = {
        title: 'Sumário',
        content: this.sanitizer.bypassSecurityTrustHtml(html),
      };
    } catch (e) {
      console.error('Erro ao carregar sumário:', e);
      this.content[key] = {
        title: 'Sumário',
        content: 'Não foi possível carregar o sumário.',
      };
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
