import { ModalPage } from '../modal/modal.page';
import { UserModel } from 'src/app/models/userModel';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from 'src/app/services/book.service';
import { AuthService } from 'src/app/services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { IonContent, ModalController,  AlertController } from '@ionic/angular';

@Component({
  selector: 'app-view-text',
  templateUrl: './view-text.page.html',
  styleUrls: ['./view-text.page.scss'],
})
export class ViewTextPage implements OnInit, AfterViewInit {
  book: any;
  bookId: any;
  query: string = '';
  filteredBook: any = null;
  selectedSegment = 'corrido';
  notaListenerAttached = false;
  user: UserModel | null = null;
  searchBy: 'keyword' | 'artigo' = 'keyword';
  @ViewChild(IonContent) content!: IonContent;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private bookService: BookService,
    private authService: AuthService,
    private alertController: AlertController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
    this.bookId = this.route.snapshot.paramMap.get('id');

    this.bookService
      .getBookById(this.bookId)
      .then((books: any) => {
        this.book = books.livro;
      })
      .catch((error) => {
        console.error('Erro ao carregar os livros:', error);
      });
  }

  onSearchInput(event: any) {
    const value = event.target.value;
    this.query = value;
    this.search();
  }

  search() {
    if (!this.query || !this.book) {
      this.filteredBook = null; // limpa o filtro
      return;
    }

    const queryLower = this.query.toLowerCase();
    const searchBy = this.searchBy;

    const clone = JSON.parse(JSON.stringify(this.book)); // faz uma cópia profunda

    clone.titulos = clone.titulos
      .map((titulo: any) => {
        const capitulosFiltrados = titulo.capitulos
          .map((capitulo: any) => {
            const secoesFiltradas = capitulo.secaos
              .map((secao: any) => {
                const artigosFiltrados = secao.artigos.filter((artigo: any) => {
                  if (searchBy === 'keyword') {
                    return (
                      artigo.conteudo?.toLowerCase().includes(queryLower) ||
                      artigo.paragrafos?.some((p: any) =>
                        p.conteudo?.toLowerCase().includes(queryLower)
                      )
                    );
                  } else if (searchBy === 'artigo') {
                    return artigo.conteudo
                      ?.toLowerCase()
                      .includes(`art. ${queryLower}`);
                  }
                  return false;
                });

                return artigosFiltrados.length
                  ? { ...secao, artigos: artigosFiltrados }
                  : null;
              })
              .filter(Boolean);

            return secoesFiltradas.length
              ? { ...capitulo, secaos: secoesFiltradas }
              : null;
          })
          .filter(Boolean);

        return capitulosFiltrados.length
          ? { ...titulo, capitulos: capitulosFiltrados }
          : null;
      })
      .filter(Boolean);

    this.filteredBook = clone;
  }

  navigateToCapitulo(capitulo: any) {
    this.router.navigate(['/chapters', capitulo.id], {
      state: { capitulo },
    });
  }

  ngAfterViewInit() {
    if (!this.notaListenerAttached) {
      this.listenNotaClicks();
      this.notaListenerAttached = true;
    }
  }

  private listenNotaClicks() {
    document.addEventListener('click', async (event: any) => {
      const target = event.target;
      if (target.classList.contains('nota-ref')) {
        const notaId = target.getAttribute('data-nota-id');
        if (notaId) {
          const nota = await this.bookService.getNotesById(notaId);
          console.log('Nota:', nota);
          this.openAlertWithContent(nota, notaId);
        }
      }
    });
  }

  private formatNotas(content: string): string {
    const notaRegex = /###nota (\d+)###/g;
    return content.replace(notaRegex, (_, num) => {
      return `
        <div 
          class="nota-ref-container" 
          style="display: inline-block; vertical-align: baseline; margin-left: 3px; margin-top: 6px;"
        >
          <sup 
        class="nota-ref" 
        data-nota-id="${num}" 
        role="link" 
        tabindex="0"
        style="
          color: #007bff;
          cursor: pointer;
          font-size: 0.75em;
          user-select: none;
          text-decoration: underline;
        "
          >
        ${num}
          </sup>
        </div>`;
    });
  }

  // async openModalWithContent(content: string) {
  //   const modal = await this.modalController.create({
  //     component: ModalNotasPage,
  //     componentProps: { content },
  //   });
  //   return await modal.present();
  // }

  async openAlertWithContent(content: any, notaId: any) {
      const alert = await this.alertController.create({
      header: `Nota ${notaId}`,
      message: `${content.conteudo}`,
      buttons: ['Fechar'],
    });
  
    await alert.present();
  }

  safeHTML(content: string): SafeHtml {
    const formatted = this.formatNotas(content);
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  cleanHTML(content: string): string {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    return doc.body.textContent || '';
  }

  async showModal(content: string) {
    const modal = await this.modalController.create({
      component: ModalPage,
      componentProps: { content },
    });
    return await modal.present();
  }

  async abrirEditor(itemId: number, itemType: string) {
    const modal = await this.modalController.create({
      component: EditBookModalPage,
      componentProps: {
        itemId: itemId,
        itemType: itemType,
      },
    });

    return await modal.present();
  }

  scrollToTop() {
    this.content.scrollToTop(500);
  }
}
