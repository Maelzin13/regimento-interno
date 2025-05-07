import { ModalPage } from '../modal/modal.page';
import { UserModel } from 'src/app/models/userModel';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from 'src/app/services/book.service';
import { AuthService } from 'src/app/services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';
import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { IonContent, ModalController, AlertController, ToastController } from '@ionic/angular';

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
  searchType: 'contains' | 'exact' = 'contains';
  searchResults: any[] = [];
  isSearching: boolean = false;
  searchHistory: string[] = [];
  lastScrollPosition: number = 0;
  totalResults: number = 0;
  currentResultIndex: number = -1;
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild('searchInput') searchInput!: ElementRef;
  
  // Propriedade para o debounce da rolagem
  private scrollDebounceTimeout: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private bookService: BookService,
    private authService: AuthService,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
    this.bookId = this.route.snapshot.paramMap.get('id');
    this.loadSearchHistory();

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
    
    if (this.query.length >= 3) {
      this.search();
    } else if (this.query.length === 0) {
      this.clearSearch();
    }
  }

  clearSearch() {
    this.filteredBook = null;
    this.searchResults = [];
    this.totalResults = 0;
    this.currentResultIndex = -1;
    this.isSearching = false;
  }

  async search() {
    if (!this.query || !this.book) {
      this.filteredBook = null;
      this.searchResults = [];
      this.totalResults = 0;
      return;
    }

    this.isSearching = true;
    const queryLower = this.query.toLowerCase();
    const searchBy = this.searchBy;
    const searchType = this.searchType;

    // Salvando posição atual antes da busca
    this.saveCurrentPosition();

    const clone = JSON.parse(JSON.stringify(this.book));
    this.searchResults = [];

    // Função para verificar se um texto contém a query de acordo com o tipo de busca
    const textMatches = (text: string) => {
      if (!text) return false;
      const textLower = text.toLowerCase();
      
      if (searchType === 'exact') {
        const regex = new RegExp(`\\b${this.escapeRegExp(queryLower)}\\b`, 'i');
        return regex.test(textLower);
      } else {
        return textLower.includes(queryLower);
      }
    };

    // Processamento de títulos
    clone.titulos = clone.titulos
      .map((titulo: any) => {
        const capitulosFiltrados = titulo.capitulos
          .map((capitulo: any) => {
            const secoesFiltradas = capitulo.secaos
              .map((secao: any) => {
                const artigosFiltrados = secao.artigos
                  .map((artigo: any) => {
                    let artigoMatches = false;
                    
                    if (searchBy === 'keyword') {
                      artigoMatches = textMatches(artigo.conteudo);
                      
                      if (artigoMatches) {
                        this.searchResults.push({
                          type: 'artigo',
                          id: artigo.id,
                          content: artigo.conteudo,
                          path: `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo}`,
                          parent: secao
                        });
                      }
                    } else if (searchBy === 'artigo') {
                      // Busca específica por artigo (número)
                      if (artigo.conteudo?.toLowerCase().includes(`art. ${queryLower}`)) {
                        artigoMatches = true;
                        this.searchResults.push({
                          type: 'artigo',
                          id: artigo.id,
                          content: artigo.conteudo,
                          path: `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo}`,
                          parent: secao
                        });
                      }
                    }

                    // Processar parágrafos apenas se estivermos procurando por palavras-chave
                    const paragrafosFiltrados = artigo.paragrafos
                      .map((paragrafo: any) => {
                        if (searchBy === 'keyword' && textMatches(paragrafo.conteudo)) {
                          this.searchResults.push({
                            type: 'paragrafo',
                            id: paragrafo.id,
                            content: paragrafo.conteudo,
                            path: `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo}`,
                            parent: artigo
                          });
                          return paragrafo;
                        }
                        return null;
                      })
                      .filter(Boolean);

                    if (paragrafosFiltrados.length) {
                      artigoMatches = true;
                      return { ...artigo, paragrafos: paragrafosFiltrados };
                    } else if (artigoMatches) {
                      return artigo;
                    }
                    return null;
                  })
                  .filter(Boolean);

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
    this.totalResults = this.searchResults.length;
    this.isSearching = false;
    
    // Adicionar à histórico de pesquisa
    this.addToSearchHistory(this.query);

    // Exibir resultado da busca
    if (this.totalResults > 0) {
      this.currentResultIndex = 0;
      this.navigateToResult(0);
      this.presentToast(`Encontrados ${this.totalResults} resultados para "${this.query}"`);
      
      // Garantir que os destaques sejam aplicados após o DOM ser atualizado
      setTimeout(() => {
        this.forceHighlightsRefresh();
      }, 500);
    } else {
      this.presentToast(`Nenhum resultado encontrado para "${this.query}"`);
    }
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
    
    // Adicionar listener para manter destaques durante a rolagem
    this.setupScrollListener();
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

  async openAlertWithContent(content: any, notaId: any) {
      const alert = await this.alertController.create({
      header: `Nota ${notaId}`,
      message: `${content.conteudo}`,
      buttons: ['Fechar'],
    });
  
    await alert.present();
  }

  safeHTML(content: string): SafeHtml {
    if (!content) return this.sanitizer.bypassSecurityTrustHtml('');
    
    let formatted = this.formatNotas(content);
    
    // Destaca os termos de busca se estiver buscando
    if (this.query && this.searchBy === 'keyword') {
      const queryLower = this.query.toLowerCase();
      const regex = this.searchType === 'exact' ? 
        new RegExp(`\\b${this.escapeRegExp(queryLower)}\\b`, 'gi') : 
        new RegExp(this.escapeRegExp(queryLower), 'gi');
      
      formatted = formatted.replace(regex, match => 
        `<span class="highlight-search">${match}</span>`
      );
    }
    
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  // Método para escapar caracteres especiais em expressões regulares
  escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  cleanHTML(content: string): string {
    if (!content) return '';
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

  // Métodos para navegação nos resultados
  async navigateToResult(index: number) {
    if (index < 0 || index >= this.searchResults.length) return;
    
    this.currentResultIndex = index;
    const result = this.searchResults[index];
    
    // Remover destaques flash anteriores
    const previousHighlights = document.querySelectorAll('.flash-highlight');
    previousHighlights.forEach(el => {
      el.classList.remove('flash-highlight');
    });
    
    // Encontrar o elemento correspondente ao resultado
    setTimeout(() => {
      const elementId = `${result.type}-${result.id}`;
      const element = document.getElementById(elementId);
      
      if (element) {
        // Rolar para o elemento com maior suavidade
        this.content.scrollToPoint(0, element.offsetTop - 120, 500);
        
        // Adicionar efeito de destaque temporário
        element.classList.add('flash-highlight');
        
        // Forçar a atualização dos destaques das palavras
        this.forceHighlightsRefresh();
      }
    }, 100);
  }

  // Força a atualização dos destaques
  forceHighlightsRefresh() {
    if (!this.query) return;
    
    setTimeout(() => {
      // Encontra todos os destaques existentes
      const highlights = document.querySelectorAll('.highlight-search');
      
      // Certifica-se que todos estão com a classe correta e visíveis
      highlights.forEach(el => {
        el.classList.add('highlight-search');
        (el as HTMLElement).style.backgroundColor = 'rgba(255, 230, 0, 0.4)';
      });
    }, 200);
  }

  navigateToNextResult() {
    if (this.currentResultIndex < this.totalResults - 1) {
      this.navigateToResult(this.currentResultIndex + 1);
    }
  }

  navigateToPreviousResult() {
    if (this.currentResultIndex > 0) {
      this.navigateToResult(this.currentResultIndex - 1);
    }
  }

  // Salvar e restaurar posição da rolagem
  saveCurrentPosition() {
    this.content.getScrollElement().then(element => {
      this.lastScrollPosition = element.scrollTop;
    });
  }

  restoreLastPosition() {
    if (this.lastScrollPosition > 0) {
      setTimeout(() => {
        this.content.scrollToPoint(0, this.lastScrollPosition, 500);
      }, 100);
    }
  }

  // Gerenciamento do histórico de pesquisa
  loadSearchHistory() {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      this.searchHistory = JSON.parse(history);
    }
  }

  addToSearchHistory(query: string) {
    if (!this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      if (this.searchHistory.length > 10) {
        this.searchHistory.pop();
      }
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }
  }

  useHistoryItem(query: string) {
    this.query = query;
    this.searchInput.nativeElement.value = query;
    this.search();
  }

  clearSearchHistory() {
    this.searchHistory = [];
    localStorage.removeItem('searchHistory');
  }

  async showSearchOptions() {
    const alert = await this.alertController.create({
      header: 'Opções de Busca',
      subHeader: 'Escolha o tipo de busca',
      inputs: [
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Buscar por Palavra-chave',
          value: 'keyword',
          checked: this.searchBy === 'keyword'
        },
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Buscar por Artigo',
          value: 'artigo',
          checked: this.searchBy === 'artigo'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Próximo',
          handler: (data) => {
            if (data) {
              this.searchBy = data;
              this.showSearchTypeOptions();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async showSearchTypeOptions() {
    const alert = await this.alertController.create({
      header: 'Opções de Busca',
      subHeader: 'Escolha como buscar o termo',
      inputs: [
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Conteúdo que contém o termo',
          value: 'contains',
          checked: this.searchType === 'contains'
        },
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Termo exato',
          value: 'exact',
          checked: this.searchType === 'exact'
        }
      ],
      buttons: [
        {
          text: 'Voltar',
          handler: () => {
            this.showSearchOptions();
          }
        },
        {
          text: 'Confirmar',
          handler: (data) => {
            if (data) {
              this.searchType = data;
              
              if (this.query) {
                this.search();
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  // Configura o listener de rolagem
  setupScrollListener() {
    this.content.ionScroll.subscribe(() => {
      if (this.query && this.searchResults.length > 0) {
        // Usando debounce para não sobrecarregar durante a rolagem
        if (this.scrollDebounceTimeout) {
          clearTimeout(this.scrollDebounceTimeout);
        }
        
        this.scrollDebounceTimeout = setTimeout(() => {
          this.forceHighlightsRefresh();
        }, 200);
      }
    });
  }
}
