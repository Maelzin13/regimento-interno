import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { SumarioService } from 'src/app/service/sumario.service';

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
  @Input() bookId!: number;

  loading = false;
  errorMsg = '';

  content: Record<string, { title: string; content: SafeHtml | string }> = {};

  constructor(
    private modalCtrl: ModalController,
    private platform: Platform,
    private sanitizer: DomSanitizer,
    private router: Router,
    private sumarioService: SumarioService
  ) {}

  ngOnInit() {
    if (!this.type) this.type = 'sumario';
    this.content[this.type] = { title: 'Carregando…', content: '' };
    this.getSumario();
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
