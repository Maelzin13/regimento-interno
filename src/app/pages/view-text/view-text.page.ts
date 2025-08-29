import { ModalPage } from '../modal/modal.page';
import { UserModel } from 'src/app/models/userModel';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from 'src/app/services/book.service';
import { AuthService } from 'src/app/services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';
import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { RegimentoModalComponent } from '../../Modals/regimento-modal/regimento-modal.component';
import { IonContent, ModalController, AlertController, ToastController, LoadingController } from '@ionic/angular';

interface HistoryEntry {
  artigoId: string;
  scrollPosition: number;
  remissaoId?: string | null;
  remissaoText?: string | null;
  paragrafo?: string | null;
  inciso?: string | null;
}

// Interface para representar o destino de uma remissão
interface RemissaoDestino {
  artigo: string;
  paragrafo?: string;
  inciso?: string;
  origem?: {
    elementId?: string;
    text?: string;
  };
}

// Interface para representar a estrutura de destino da API
interface ApiDestino {
  id: number;
  remissao_id: number;
  artigo_id: number;
  paragrafo_id?: number;
  inciso_key?: string;
  alinea_key?: string;
  paragrafo_key?: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  artigo: {
    id: number;
    conteudo: string;
    numero?: string;
    ordem: number;
    secao_id: number;
    created_at?: string;
    updated_at?: string;
  };
  paragrafo?: {
    id: number;
    conteudo: string;
    tipo: string;
    nivel: number;
    ordem: number;
    artigo_id: number;
    paragrafo_id?: number;
    created_at: string;
    updated_at: string;
  };
}

// Interface para representar a estrutura de remissão da API
interface ApiRemissao {
  id: number;
  conteudo: string;
  tipo: string;
  observacao?: string;
  url_externa?: string;
  paragrafo_de_id: number;
  paragrafo_para_id?: number;
  created_at: string;
  updated_at: string;
  destinos: ApiDestino[];
}

@Component({
  selector: 'app-view-text',
  templateUrl: './view-text.page.html',
  styleUrls: ['./view-text.page.scss'],
})
export class ViewTextPage implements OnInit, AfterViewInit {
  book: any;
  bookId: any;
  query: string = '';
  primeiroParagrafo:any;
  totalResults: number = 0;
  filteredBook: any = null;
  searchResults: any[] = [];
  notaListenerAttached = false;
  searchHistory: string[] = [];
  isSearching: boolean = false;
  user: UserModel | null = null;
  allCommentsExpanded = false;
  lastScrollPosition: number = 0;
  currentResultIndex: number = -1;
  searchBy: 'keyword' | 'artigo' = 'keyword';
  @ViewChild(IonContent) content!: IonContent;
  searchType: 'contains' | 'exact' = 'contains';
  @ViewChild('searchInput') searchInput!: ElementRef;
  showReturnIndicator: boolean = false;
  selectedFilter: string = 'keyword';



  // Propriedade para o debounce da rolagem
  private scrollDebounceTimeout: any;
  expandedComments: Set<string> = new Set();

  private notasCache: Map<number, any> = new Map()

  // Adicionar propriedades para histórico de navegação
  navigationHistory: HistoryEntry[] = [];
  currentHistoryIndex: number = -1;
  private handleRemissaoClick: any;
  private showReturnIndicatorTimeout: any;

  private contentCache = new Map<string, SafeHtml>();
  private remissoesCache = new Map<string, string>();
  private comentarioCache = new Map<string, SafeHtml>();
  // Cache para elementos específicos encontrados (artigos, parágrafos, incisos)
  private elementosCache: Map<string, HTMLElement | null> = new Map();

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private bookService: BookService,
    private authService: AuthService,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
  ) { }

  async ngOnInit() {
    const user =  this.authService.getUser();
    this.user = user;
    this.bookId = this.route.snapshot.paramMap.get('id');
    this.loadSearchHistory();
    await this.loadBook();

  }

  getSearchPlaceholder(): string {
    switch (this.selectedFilter) {
      case 'keyword':
        return 'Digite a palavra-chave';
      case 'article':
        return 'Digite o número do artigo';
      default:
        return 'Selecione sua busca...';
    }
  }


  onFilterChange(event: any) {
    this.selectedFilter = event.detail.value;
    console.log('Filtro selecionado:', this.selectedFilter);
  }

  getPlaceholder(): string {
    return this.searchBy === 'keyword'
      ? 'Digite a busca por palavra-chave...'
      : 'Digite o artigo...';
  }

  onSearchTypeChange(event: any) {
    this.searchBy = event.detail.value;
    this.query = ''; // limpa a busca ao trocar o tipo
  }

  executeSearch() {
    if (!this.query) return;

    if (this.searchBy === 'keyword') {
      this.searchByKeyword(this.query);
    } else if (this.searchBy === 'artigo') {
      this.searchByArtigo(this.query);
    }
  }

  searchByKeyword(query: string) {
    console.log('Buscando por palavra-chave:', query);
    // aqui entra sua lógica usando bookService
  }

  searchByArtigo(query: string) {
    console.log('Buscando por artigo:', query);
    // aqui entra sua lógica específica para artigos
  }

  async loadBook(forceRefresh: boolean = false) {
    let loader: HTMLIonLoadingElement | null = null;
    try {
      loader = await this.loadingController.create({
        message: 'Carregando regimento...',
        spinner: 'circles',
        cssClass: 'loading-regimento'
      });
      await loader.present();

      // Aqui NÃO limpe this.book, mantenha o anterior!
      // Só limpa caches internos, se quiser
      this.elementosCache.clear();
      this.contentCache.clear();
      this.remissoesCache.clear();

      // Aguarde o novo livro
      const books: any = await this.bookService.getBookById(this.bookId);
      // Só sobrescreva depois que o request chegar
      this.book = books.livro ?? books;
      console.log('Livro carregado:', this.book);
      
      // Processar remissões de forma otimizada
      this.processRemissoes();
      
      // Otimizar performance
      this.optimizePerformance();
      
      this.primeiroParagrafo = books.primeiro?.conteudo ?? '';

      this.route.queryParams.subscribe(params => {
        if (params && params['artigo']) {
          setTimeout(() => {
            this.scrollToArtigo(params['artigo']);
          }, 1000);
        }
      });

    } catch (error) {
      this.presentToast('Erro ao carregar o regimento. Tente novamente.');
      console.error('Erro ao carregar o livro:', error);
    } finally {
      loader?.dismiss();
    }
  }

  onSearchInput(event: any) {
    const value = event.target.value;
    this.query = value;

    // Se o usuário apagou a busca, limpar os resultados e cache imediatamente
    if (!value.trim()) {
      this.clearSearch();
      return;
    }
  }

    clearSearch() {
      this.query = '';
      this.filteredBook = null;
      this.searchResults = [];
      this.totalResults = 0;
      this.currentResultIndex = -1;
      this.isSearching = false;

      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      }, 50);
    }

  // Função para forçar limpeza dos highlights
  forceClearHighlights() {
    setTimeout(() => {
      const highlights = document.querySelectorAll('.highlight-search, mark.highlight-search, .permanent-highlight');
      highlights.forEach(el => {
        el.classList.remove('highlight-search', 'permanent-highlight');
        if (el.tagName.toLowerCase() === 'mark') {
          (el as HTMLElement).style.backgroundColor = '';
          (el as HTMLElement).style.padding = '';
          (el as HTMLElement).style.borderRadius = '';
          (el as HTMLElement).style.boxShadow = '';
          (el as HTMLElement).style.fontWeight = '';
          (el as HTMLElement).style.color = '';
          (el as HTMLElement).style.zIndex = '';
          (el as HTMLElement).style.position = '';
        }
      });
    }, 100);
  }

  async search() {
    if (!this.query || !this.book) {
      this.filteredBook = null;
      this.searchResults = [];
      this.totalResults = 0;
      return;
    }

    this.isSearching = true;
    const queryLower = this.query.toLowerCase().trim();
    const searchBy = this.searchBy;
    const searchType = this.searchType;


    // Para busca por artigo, limpar a entrada do usuário
    let processedQuery = queryLower;
    if (searchBy === 'artigo') {
      // Remover "Art.", "Artigo", "Arts.", "Artigos" da entrada do usuário
      processedQuery = queryLower
        .replace(/^(Art\.?\s*|Artigo\s*|Arts\.?\s*|Artigos\s*)/i, '')
        .trim();

      // Se após a limpeza não sobrou nada, usar a query original
      if (!processedQuery) {
        processedQuery = queryLower;
      }
    }

    // Salvando posição atual antes da busca
    this.saveCurrentPosition();


    const clone = this.book;
    this.searchResults = [];

    const textMatches = (text: string) => {
      if (!text) return false;
      const textLower = text.toLowerCase();

      if (searchType === 'exact') {
        const normalizedText = this.normalizeText(textLower);
        const normalizedQuery = this.normalizeText(queryLower);

        const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(normalizedQuery)}\\b`, 'i');
        return wordBoundaryRegex.test(normalizedText);
      } else {
        return textLower.includes(queryLower);
      }
    };

    // Função para verificar se o artigo contém a busca
    const checkArtigoMatch = (artigoContent: string) => {
      if (!artigoContent) return false;
      const contentLower = artigoContent.toLowerCase();

      // Para busca de artigo, sempre usar termo exato
      const artigoPatterns = [
        // Padrão básico: "Art. X" ou "Artigo X"
        new RegExp(`\\bArt\\.?\\s*${this.escapeRegExp(processedQuery)}[º°]?\\b`, 'i'),
        // Padrão com alíneas: "Art. X-A", "Art. X-B", etc.
        new RegExp(`\\bArt\\.?\\s*${this.escapeRegExp(processedQuery)}[º°]?\\s*[-–]\\s*[A-Z]\\b`, 'i'),
        // Padrão com múltiplas alíneas: "Art. X-A, X-B, X-C"
        new RegExp(`\\bArt\\.?\\s*${this.escapeRegExp(processedQuery)}[º°]?\\s*[-–]\\s*[A-Z](?:\\s*,\\s*${this.escapeRegExp(processedQuery)}[º°]?\\s*[-–]\\s*[A-Z])*\\b`, 'i'),
      ];
      return artigoPatterns.some(pattern => pattern.test(contentLower));
    };

    // Processar a estrutura do livro de forma mais eficiente
    let titulosFiltrados = [];

    for (const titulo of clone.titulos) {
      let capitulosFiltrados = [];

      for (const capitulo of titulo.capitulos || []) {
        let secoesFiltradas = [];

        for (const secao of capitulo.secaos || []) {
          let artigosFiltrados = [];

          for (const artigo of secao.artigos || []) {
            let artigoMatches = false;
            let paragrafosFiltrados = [];

            // Buscar por palavras-chave
            if (searchBy === 'keyword') {
              // Verificar se o artigo contém a busca
              if (textMatches(artigo.conteudo)) {
                artigoMatches = true;
                this.searchResults.push({
                  type: 'artigo',
                  id: artigo.id,
                  content: artigo.conteudo,
                  path: `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo}`,
                  parent: secao,
                  position: this.calculatePosition(artigo)
                });
              }

              // Verificar parágrafos do artigo
              for (const paragrafo of artigo.paragrafos || []) {
                if (textMatches(paragrafo.conteudo)) {
                  paragrafosFiltrados.push(paragrafo);
                  this.searchResults.push({
                    type: 'paragrafo',
                    id: paragrafo.id,
                    content: paragrafo.conteudo,
                    path: `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo}`,
                    parent: artigo,
                    position: this.calculatePosition(paragrafo)
                  });
                }
              }
            }
            // Buscar por artigos específicos
            else if (searchBy === 'artigo') {
              if (checkArtigoMatch(artigo.conteudo)) {
                artigoMatches = true;
                this.searchResults.push({
                  type: 'artigo',
                  id: artigo.id,
                  content: artigo.conteudo,
                  path: `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo}`,
                  parent: secao,
                  position: this.calculatePosition(artigo)
                });
              }
            }

            // Adicionar artigo se encontrou correspondência ou se tem parágrafos filtrados
            if (artigoMatches || paragrafosFiltrados.length > 0) {
              artigosFiltrados.push({
                ...artigo,
                paragrafos: paragrafosFiltrados.length > 0 ? paragrafosFiltrados : artigo.paragrafos
              });
            }
          }

          // Adicionar seção se tem artigos filtrados
          if (artigosFiltrados.length > 0) {
            secoesFiltradas.push({
              ...secao,
              artigos: artigosFiltrados
            });
          }
        }

        // Adicionar capítulo se tem seções filtradas
        if (secoesFiltradas.length > 0) {
          capitulosFiltrados.push({
            ...capitulo,
            secaos: secoesFiltradas
          });
        }
      }

      // Adicionar título se tem capítulos filtrados
      if (capitulosFiltrados.length > 0) {
        titulosFiltrados.push({
          ...titulo,
          capitulos: capitulosFiltrados
        });
      }
    }

    // Atualizar o livro filtrado
    this.filteredBook = {
      ...clone,
      titulos: titulosFiltrados
    };

    this.totalResults = this.searchResults.length;
    this.isSearching = false;

    // Ordenar resultados por posição no documento
    this.sortSearchResults();

    // Limpar cache de conteúdo para forçar re-renderização com novos destaques
    this.contentCache.clear();

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

  // Função para calcular a posição relativa de um elemento no documento
  private calculatePosition(element: any): number {
    return element.id || 0;
  }

  // Função para ordenar os resultados de forma mais lógica
  private sortSearchResults() {
    // Ordenar por posição no documento (usando a propriedade position calculada)
    this.searchResults.sort((a, b) => {
      // Primeiro por tipo: artigos vêm antes de parágrafos
      if (a.type !== b.type) {
        return a.type === 'artigo' ? -1 : 1;
      }

      // Se são do mesmo tipo, ordenar por posição no documento
      const posA = a.position || a.id || 0;
      const posB = b.position || b.id || 0;

      return posA - posB;
    });


  }

  // Método auxiliar para normalizar texto (remover acentos e caracteres especiais)
  private normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  highlightAndSanitize(text: string): SafeHtml {
    // Verificar cache primeiro
    const cacheKey = `${text}_${this.query}_${this.searchType}`;
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey)!;
    }

    let highlighted = this.formatNotas(text);
    
    // Processar remissões inline apenas se necessário
    if (this.query) {
      highlighted = this.processInlineRemissoes(highlighted);
      
      // Aplicar highlight manualmente sem usar o pipe
      const query = this.query.trim();
      if (query) {
        let regex: RegExp;
        if (this.searchType === 'exact') {
          regex = new RegExp(`\\b${this.escapeRegExp(query)}\\b`, 'gi');
        } else {
          regex = new RegExp(this.escapeRegExp(query), 'gi');
        }
        highlighted = highlighted.replace(regex, (match) =>
          `<mark class="search-highlight">${match}</mark>`
        );
      }
    }

    const result = this.sanitizer.bypassSecurityTrustHtml(highlighted);
    
    // Armazenar em cache
    this.contentCache.set(cacheKey, result);
    
    return result;
  }

  ngAfterViewInit() {
    if (!this.notaListenerAttached) {
      this.listenNotaClicks();
      this.notaListenerAttached = true;
    }

    // Configurar listeners para remissões
    this.setupRemissaoLinks();

    this.setupScrollListener();

    this.remissoesCache.clear();
  }

  setupRemissaoLinks() {
    // Remove o antigo listener para evitar duplicação
    document.removeEventListener('click', this.handleRemissaoClick as any);

    this.handleRemissaoClick = (event: any) => {
      const target = event.target as HTMLElement;

      // A remissão pode estar em qualquer nível dentro do .remissao-content
      const remissaoElement = target.closest('.remissao-content') as HTMLElement;

      if (remissaoElement) {
        const remissaoType = remissaoElement.getAttribute('data-remissao-type');
        const urlExterna = remissaoElement.getAttribute('data-url-externa');

        // Se é remissão externa sem link, não processar
        if (remissaoType === 'externa' && !urlExterna) {
          return;
        }

        // Feedback visual no clique
        const container = remissaoElement.closest('.remissao-container') as HTMLElement;
        if (container) {
          // Adicionamos a classe de destaque
          container.classList.add('remissao-highlight');

          // E removemos depois de um tempo
          setTimeout(() => {
            container.classList.remove('remissao-highlight');
          }, 1500);
        }

        // Processar a remissão
        this.handleRemissaoContent(remissaoElement, event);
        event.preventDefault();
      }
    };

    document.addEventListener('click', this.handleRemissaoClick as any);
  }

  handleRemissaoContent(remissaoElement: HTMLElement, event: Event) {
    const conteudo = remissaoElement.textContent || '';
    const remissaoId = remissaoElement.getAttribute('data-remissao-id');
    const remissaoType = remissaoElement.getAttribute('data-remissao-type');
    const urlExterna = remissaoElement.getAttribute('data-url-externa');

    // Verificação rápida: se não começa com "Art.", ignora
    if (!conteudo.trim().startsWith('Art')) {
      return;
    }

    // Salva posição antes de navegar
    this.content.getScrollElement().then(scrollElement => {
      const currentPosition = scrollElement.scrollTop;

      // Se é uma remissão externa, abrir link em nova aba do browser
      if (remissaoType === 'externa') {
        if (urlExterna) {
          // Abrir em nova aba do browser
          window.open(urlExterna, '_blank');
          this.presentToast('Abrindo link externo...');
        }
        event.preventDefault();
        return;
      }

      // Se é uma remissão inline, usar o parser antigo
      if (remissaoType === 'inline') {
        const destinosRemissao = this.parseRemissaoCompleta(conteudo);

        if (destinosRemissao.length > 0) {
          if (destinosRemissao.length === 1) {
            const destino = destinosRemissao[0];
            this.scrollToArtigo(destino.artigo, destino.paragrafo, destino.inciso, true);
            event.preventDefault();
            return;
          } else {
            this.showDestinationChoiceModal(destinosRemissao);
            event.preventDefault();
            return;
          }
        } else {
          this.presentToast('Não foi possível identificar a referência na remissão.');
        }
        return;
      }

      // Buscar a remissão na estrutura de dados usando o ID
      const remissao = this.findRemissaoById(remissaoId);
      
      if (remissao && remissao.destinos && remissao.destinos.length > 0) {
        // Converter os destinos da API para o formato esperado
        const destinosRemissao = this.convertApiDestinosToRemissaoDestinos(remissao.destinos);

        // Salvar posição atual no histórico antes de navegar
        this.content.getScrollElement().then(scrollElement => {
          const currentPosition = scrollElement.scrollTop;
          this.saveToHistory(null, currentPosition, remissaoId, conteudo, null, null);
        });

        if (destinosRemissao.length === 1) {
          // Se tem só um destino, navega direto
          const destino = destinosRemissao[0];
          this.scrollToArtigo(destino.artigo, destino.paragrafo, destino.inciso, true);
          event.preventDefault();
          return;
        } else if (destinosRemissao.length > 1) {
          // Se tem múltiplos destinos, mostra modal para escolha
          this.showDestinationChoiceModal(destinosRemissao);
          event.preventDefault();
          return;
        }
      } else {
        // Fallback: usar o parser antigo se não encontrar destinos na API
        const destinosRemissao = this.parseRemissaoCompleta(conteudo);

        if (destinosRemissao.length > 0) {
          // Salvar posição atual no histórico antes de navegar
          this.content.getScrollElement().then(scrollElement => {
            const currentPosition = scrollElement.scrollTop;
            this.saveToHistory(null, currentPosition, remissaoId, conteudo, null, null);
          });

          if (destinosRemissao.length === 1) {
            const destino = destinosRemissao[0];
            this.scrollToArtigo(destino.artigo, destino.paragrafo, destino.inciso, true);
            event.preventDefault();
            return;
          } else {
            this.showDestinationChoiceModal(destinosRemissao);
            event.preventDefault();
            return;
          }
        } else {
          this.presentToast('Não foi possível identificar a referência na remissão.');
        }
      }
    });
  }

  // Modal para múltiplos artigos
  async showArtigosChoiceModal(artigos: string[]) {
    const destinos: RemissaoDestino[] = artigos.map(artigo => ({
      artigo,
      origem: { text: `Art. ${artigo}` }
    }));

    // Usando o modal de destino mais completo
    await this.showDestinationChoiceModal(destinos);
  }

  saveToHistory(artigoId: string | null, scrollPosition: number, remissaoId?: string | null, remissaoText?: string | null, paragrafo?: string | null, inciso?: string | null) {
    // Se estamos navegando a partir de um ponto intermediário do histórico,
    // descartar tudo o que vem depois
    if (this.currentHistoryIndex < this.navigationHistory.length - 1) {
      this.navigationHistory = this.navigationHistory.slice(0, this.currentHistoryIndex + 1);
    }

    // Adicionar nova entrada ao histórico
    this.navigationHistory.push({
      artigoId: artigoId || 'unknown',
      scrollPosition: scrollPosition,
      remissaoId: remissaoId || null,
      remissaoText: remissaoText || null,
      paragrafo: paragrafo || null,
      inciso: inciso || null
    });

    // Atualizar o índice atual
    this.currentHistoryIndex = this.navigationHistory.length - 1;

  }

  navigateBack() {
    // Verificar se há para onde voltar
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      const previousPosition = this.navigationHistory[this.currentHistoryIndex];

      // Restaurar a posição anterior
      this.content.scrollToPoint(0, previousPosition.scrollPosition, 500);

      // Se voltamos para uma remissão, destacar a remissão de origem
      if (previousPosition.remissaoId) {
        setTimeout(() => {
          const remissaoElement = document.querySelector(`[data-remissao-id="${previousPosition.remissaoId}"]`);

          if (remissaoElement) {
            const container = remissaoElement.closest('.remissao-container');
            if (container) {
              // Adicionar classe de destaque
              container.classList.add('remissao-active');

              // Garantir que o elemento está visível na viewport
              const rect = remissaoElement.getBoundingClientRect();

              // Centralizar o elemento na tela se não estiver visível
              if (rect.top < 0 || rect.bottom > window.innerHeight) {
                const windowHeight = window.innerHeight;
                const elementHeight = rect.height;
                const offsetTop = rect.top + window.pageYOffset;

                // Centralizar o elemento na tela
                const scrollPosition = offsetTop - (windowHeight / 2) + (elementHeight / 2);
                this.content.scrollToPoint(0, scrollPosition, 500);
              }

              // Remover a classe de destaque após um tempo
              setTimeout(() => {
                container.classList.remove('remissao-active');
              }, 3000);

              // Feedback para o usuário
              this.presentToast(`Retornando à remissão: ${previousPosition.remissaoText || 'original'}`);
            }
          }

          // Limpar o histórico de navegação após voltar ao ponto de origem
          // Mantemos apenas a entrada atual para não sobrecarregar o app
          this.navigationHistory = this.navigationHistory.slice(0, this.currentHistoryIndex + 1);
        }, 600);
      } else {
        // Feedback para o usuário
        this.presentToast('Retornando à posição anterior');

        // Limpar o histórico de navegação após voltar ao ponto de origem
        this.navigationHistory = this.navigationHistory.slice(0, this.currentHistoryIndex + 1);
      }

      // Ocultar o indicador de retorno após voltar
      this.showReturnIndicator = false;
    } else {
      this.presentToast('Não há posição anterior para retornar');
    }
  }

  scrollToArtigo(artigo: string, paragrafo?: string, inciso?: string, showReturnOption: boolean = false) {
    // Verificar se o artigo é um marcador de contexto
    if (artigo === 'contexto') {
      // Neste caso, precisamos determinar o artigo atual baseado no contexto
      // Obter o artigo atual onde o usuário está
      this.content.getScrollElement().then(scrollElement => {
        const currentScrollPosition = scrollElement.scrollTop;

        // Procurar o artigo visível na tela ou o mais próximo acima da posição atual
        const artigos = document.querySelectorAll('h5');
        let artigoContexto = null;
        let ultimaPosicaoValida = -1;

        for (let i = 0; i < artigos.length; i++) {
          const el = artigos[i];
          const rect = el.getBoundingClientRect();
          const posicao = rect.top + window.pageYOffset;

          // Se o elemento está acima da posição atual de rolagem, pode ser um candidato
          if (posicao <= currentScrollPosition) {
            // Verifica se o texto contém indicação de artigo
            const texto = el.textContent || '';
            if (texto.match(/Art\.\s*\d+[º°]?\b/i)) {
              // Este é um artigo válido acima da posição atual
              artigoContexto = el;
              ultimaPosicaoValida = posicao;
            }
          }
        }

        if (artigoContexto) {
          // Extrair o número do artigo do texto
          const texto = artigoContexto.textContent || '';
          const match = texto.match(/Art\.\s*(\d+)[º°]?\b/i);

          if (match && match[1]) {
            const artigoNumero = match[1];
            // Agora podemos navegar para o elemento específico dentro deste artigo
            this.scrollToArtigo(artigoNumero, paragrafo, inciso, showReturnOption);
            return;
          }
        }

        // Se não conseguiu determinar o artigo do contexto
        this.presentToast('Não foi possível determinar o artigo no contexto atual.');
      });

      return;
    }

    // Remover caracteres especiais como º ou ° que podem estar no número do artigo
    const artigoLimpo = artigo.replace(/[^\d]/g, '');

    // Salvar posição atual antes de buscar o artigo
    this.content.getScrollElement().then(scrollElement => {
      const currentScrollPosition = scrollElement.scrollTop;

      // Identificar o tipo de elemento que estamos buscando
      let elementType = "artigo";
      if (paragrafo) elementType = "parágrafo";
      if (inciso) elementType = "inciso";

      // Usar a função especializada para encontrar o elemento exato
      let element = this.findElementoEspecifico(artigoLimpo, paragrafo, inciso);

      // Se não encontrou o elemento específico, tenta encontrar apenas o artigo
      if (!element && (paragrafo || inciso)) {
        element = this.findElementoEspecifico(artigoLimpo);
      }

      // Se encontrou o elemento, rola até ele e destaca
      if (element) {
        // Salvar a posição atual no histórico se estamos navegando por remissão
        // Isso permite voltar ao ponto de origem
        if (showReturnOption) {
          this.saveToHistory(artigoLimpo, currentScrollPosition, null, null, paragrafo, inciso);
        }

        // Interrompemos qualquer rolagem em andamento
        const scrollY = typeof this.content.scrollY === 'number' ? this.content.scrollY : 0;
        this.content.scrollToPoint(0, scrollY, 0);

        // Garantir que o elemento está visível na página
        setTimeout(() => {
          // Usar getBoundingClientRect para obter a posição atual do elemento
          const rect = element.getBoundingClientRect();

          // Calcular a posição para centralizar o elemento na tela
          const windowHeight = window.innerHeight;
          const elementHeight = rect.height;
          const offsetTop = rect.top + window.pageYOffset;

          // Centralizar o elemento na tela, com um pequeno ajuste para cima
          // para garantir que o elemento fique na parte superior central da tela
          const scrollPosition = offsetTop - (windowHeight * 0.3); // Posiciona a 30% do topo da tela

          // Rolar para a posição calculada com animação suave
          this.content.scrollToPoint(0, scrollPosition, 500);

          // Remover qualquer destaque anterior
          const destaques = document.querySelectorAll('.flash-highlight, .elemento-destacado, .artigo-destacado, .elemento-especifico-highlight');
          destaques.forEach(el => {
            el.classList.remove('flash-highlight', 'elemento-destacado', 'artigo-destacado', 'elemento-especifico-highlight');
          });

          // Aplicar destaque visual mais forte
          element.classList.add('flash-highlight');

          // Adicionar classe específica para o tipo de elemento
          if (paragrafo || inciso) {
            element.classList.add('elemento-especifico-highlight');
            element.classList.add('elemento-destacado'); // Nova classe para destaque persistente

            // Adicionar uma borda para destacar melhor o elemento específico
            element.style.border = '2px solid #3880ff';
            element.style.borderRadius = '4px';
            element.style.padding = '8px';
            element.style.backgroundColor = 'rgba(56, 128, 255, 0.1)';
          } else {
            element.classList.add('artigo-destacado'); // Nova classe para destaque de artigos
          }

          // Remover classes de destaque após um tempo
          setTimeout(() => {
            element.classList.remove('flash-highlight');

            // Manter o destaque por mais tempo para elementos específicos
            setTimeout(() => {
              element.classList.remove('elemento-especifico-highlight');
              element.classList.remove('elemento-destacado');
              element.classList.remove('artigo-destacado');

              // Remover estilos inline
              element.style.border = '';
              element.style.borderRadius = '';
              element.style.padding = '';
              element.style.backgroundColor = '';
            }, 5000);
          }, 2000);

          // Mostrar o indicador de retorno flutuante, se solicitado
          if (showReturnOption && this.navigationHistory.length > 1) {
            this.showReturnIndicator = true;

            // Limpar qualquer timeout existente
            if (this.showReturnIndicatorTimeout) {
              clearTimeout(this.showReturnIndicatorTimeout);
            }

            // Configurar para ocultar o indicador após 30 segundos
            this.showReturnIndicatorTimeout = setTimeout(() => {
              this.showReturnIndicator = false;
            }, 30000);
          }

          // Feedback visual para o usuário
          let mensagem = `Navegando para o Artigo ${artigoLimpo}`;
          if (paragrafo) mensagem += `, § ${paragrafo}`;
          if (inciso) mensagem += `, ${inciso}`;

          this.presentToast(mensagem);
        }, 100);
      } else {
        this.presentToast(`${elementType} ${artigoLimpo} não encontrado`);
      }
    });
  }

  // Novo método para encontrar artigo diretamente na estrutura de dados
  private findArtigoByNumero(numeroArtigo: string): any {
    const book = this.filteredBook || this.book;
    if (!book || !book.titulos) return null;

    for (const titulo of book.titulos) {
      for (const capitulo of titulo.capitulos || []) {
        for (const secao of capitulo.secaos || []) {
          for (const artigo of secao.artigos || []) {
            // Verifica se o conteúdo do artigo contém o número do artigo
            const match = artigo.conteudo.match(/Art\.?\s*(\d+)[º°]?/i);
            if (match && match[1] === numeroArtigo) {
              return artigo;
            }
          }
        }
      }
    }

    return null;
  }

  private listenNotaClicks() {
    document.addEventListener('click', async (event: any) => {
      const target = event.target;
      if (target.classList.contains('nota-ref')) {
        const notaId = target.getAttribute('data-nota-id');

        // Feedback visual imediato
        target.classList.add('nota-loading-feedback');
        setTimeout(() => target.classList.remove('nota-loading-feedback'), 800);

        if (!notaId) return;

        const notaIdNumber = +notaId;

        if (this.notasCache.has(notaIdNumber)) {
          const nota = this.notasCache.get(notaIdNumber);
          await this.openAlertWithContent(nota, notaIdNumber);
          return;
        }

        const loading = await this.loadingController.create({
          message: 'Carregando nota...',
          spinner: 'bubbles',
          cssClass: 'custom-loading',
        });

        await loading.present();

        this.bookService.getNotesById(notaIdNumber)
          .then(async (nota: any) => {
            this.notasCache.set(notaIdNumber, nota);
            await this.openAlertWithContent(nota, notaIdNumber);
          })
          .catch((error: any) => {
            console.error('Erro ao carregar nota:', error);
            this.presentToast('Erro ao carregar a nota. Tente novamente.');
          })
          .finally(() => {
            loading.dismiss();
          });
      }
    });
  }

  private formatNotas(content: string): string {
    if (typeof content !== 'string') {
      console.warn('formatNotas recebeu conteúdo inválido:', content);
      return '';
    }

    const notaRegex = /###nota\s*(\d+)\s*###/gi;

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
    if (!content || !content.conteudo) {
      this.presentToast('Conteúdo da nota não disponível');
      return;
    }

    const alert = await this.alertController.create({
      header: `Nota ${notaId}`,
      message: this.formatNotas(content.conteudo),
      buttons: ['Fechar'],
      cssClass: 'nota-alert'
    });

    await alert.present();
  }

  // Método para identificar e formatar remissões dentro do texto
  private formatRemissoes(content: string): string {
    // Se já temos este conteúdo em cache, retorne-o
    if (this.remissoesCache.has(content)) {
      return this.remissoesCache.get(content)!;
    }

    // Cópia do conteúdo original para trabalhar
    let formattedContent = content;

    // Detecta padrões de remissão inline
    try {
      // Padrão otimizado para detectar apenas referências que começam com "Art." (A maiúsculo)
      // Isso melhora significativamente a performance ao reduzir falsos positivos
      const artigoPattern = /\b(Art\.?\s+\d+[º°]?(?:(?:\s*,\s*|\s+e\s+)\d+[º°]?)*(?:\s*,\s*§\s*\d+[º°]?)?(?:\s*,\s*[IVX]+)?)/gi;

      // Padrão para detectar referências a parágrafos: "§ X" ou "§§ X, Y e Z"
      const paragrafoPattern = /\b(§{1,2}\s+\d+[º°]?(?:(?:\s*,\s*|\s+e\s+)\d+[º°]?)*)/gi;

      // Padrão para detectar referências a incisos: "inciso X" ou "incisos X, Y e Z"
      const incisoPattern = /\b(inciso[s]?\s+[IVX]+(?:(?:\s*,\s*|\s+e\s+)[IVX]+)*)/gi;

      // Padrão otimizado para detectar referências combinadas que começam com "Art."
      const combinedPattern = /\b(Art\.?\s+\d+[º°]?(?:\s*,\s*§\s*\d+[º°]?)?(?:\s*,\s*(?:inciso\s+)?[IVX]+)?)/gi;

      // Função para substituir com marcação HTML
      const replaceWithLink = (match: string, p1: string): string => {
        // Verificar se a remissão realmente começa com "Art." (A maiúsculo)
        // Esta verificação adicional garante que apenas remissões válidas sejam processadas
        if (!match.trim().startsWith('Art')) {
          return match; // Retorna o texto original se não começar com "Art"
        }

        // Gera um ID único para esta remissão
        const remissaoId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Extrai informações sobre artigos, parágrafos e incisos
        const destinosRemissao = this.parseRemissaoCompleta(match);

        // Preparar atributos data-* para facilitar a navegação
        let dataArtigos = '';
        let dataParagrafos = '';
        let dataIncisos = '';

        if (destinosRemissao.length > 0) {
          // Extrair artigos, parágrafos e incisos únicos
          const artigos = [...new Set(destinosRemissao.map(d => d.artigo))];
          const paragrafos = [...new Set(destinosRemissao.filter(d => d.paragrafo).map(d => d.paragrafo))];
          const incisos = [...new Set(destinosRemissao.filter(d => d.inciso).map(d => d.inciso))];

          // Construir os atributos data-*
          dataArtigos = artigos.join(',');
          dataParagrafos = paragrafos.join(',');
          dataIncisos = incisos.join(',');

        } else {
          // Tentar extrair manualmente apenas se começar com "Art"
          const artigoMatch = match.match(/\b(\d+)[º°]?\b/g);
          if (artigoMatch) {
            dataArtigos = artigoMatch.join(',');
          }

          const paragrafoMatch = match.match(/§\s*(\d+)[º°]?\b/g);
          if (paragrafoMatch) {
            dataParagrafos = paragrafoMatch.map(p => p.replace(/§\s*/, '')).join(',');
          }

          const incisoMatch = match.match(/\b([IVX]+)\b/g);
          if (incisoMatch) {
            dataIncisos = incisoMatch.join(',');
          }
        }

        // Construir os atributos data-*
        const dataAtributos = [
          `data-remissao-id="${remissaoId}"`,
          dataArtigos ? `data-artigos="${dataArtigos}"` : '',
          dataParagrafos ? `data-paragrafos="${dataParagrafos}"` : '',
          dataIncisos ? `data-incisos="${dataIncisos}"` : ''
        ].filter(attr => attr).join(' ');

        // Determinar se a remissão está dentro de parênteses
        const isInParentheses = /\([^)]*$/.test(formattedContent.substring(0, formattedContent.indexOf(match))) &&
                               /^[^(]*\)/.test(formattedContent.substring(formattedContent.indexOf(match) + match.length));

        // Adicionar classe especial para remissões dentro de parênteses
        const extraClass = isInParentheses ? 'remissao-parentese' : '';

        // Retorna o HTML com a classe remissao-inline de forma segura
        return `<span class="remissao-inline ${extraClass}" role="link" tabindex="0" ${dataAtributos}>${match}</span>`;
      };

      // Aplicar substituições apenas para padrões que começam com "Art."
      // Usar apenas o combinedPattern para evitar duplicações
      formattedContent = formattedContent.replace(combinedPattern, replaceWithLink);

      // Adicionar ao cache
      this.remissoesCache.set(content, formattedContent);
    } catch (error) {
      console.error('Erro ao formatar remissões:', error);
      return content;
    }

    return formattedContent;
  }

  // Método para escapar caracteres especiais em expressões regulares
  escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  navigateToResult(index: number) {
    this.currentResultIndex = index;
    setTimeout(() => {
      const highlights = document.querySelectorAll('.search-highlight');
      if (highlights.length > 0 && highlights[index]) {
        const el = highlights[index] as HTMLElement;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('result-focus');
        setTimeout(() => el.classList.remove('result-focus'), 1200);
      }
    }, 300);
  }

  // Força a atualização dos destaques
  forceHighlightsRefresh() {
    if (!this.query) return;

    setTimeout(() => {
      // Encontra todos os destaques existentes (tanto span quanto mark)
      const highlights = document.querySelectorAll('.highlight-search, mark.highlight-search, .permanent-highlight');

      // Certifica-se que todos estão com a classe correta e visíveis
      highlights.forEach((el, index) => {
        el.classList.add('highlight-search', 'permanent-highlight');

        // Garantir que elementos mark tenham os estilos corretos
        if (el.tagName.toLowerCase() === 'mark') {
          (el as HTMLElement).style.backgroundColor = 'rgba(255, 230, 0, 0.8)';
          (el as HTMLElement).style.padding = '2px 4px';
          (el as HTMLElement).style.borderRadius = '3px';
          (el as HTMLElement).style.boxShadow = '0 0 6px rgba(255, 230, 0, 0.5)';
          (el as HTMLElement).style.fontWeight = '600';
          (el as HTMLElement).style.textDecoration = 'none';
          (el as HTMLElement).style.color = '#000';
          (el as HTMLElement).style.zIndex = '10';
          (el as HTMLElement).style.position = 'relative';
        } else {
          // Para elementos span (fallback)
          (el as HTMLElement).style.backgroundColor = 'rgba(255, 230, 0, 0.6)';
          (el as HTMLElement).style.padding = '2px 4px';
          (el as HTMLElement).style.borderRadius = '3px';
          (el as HTMLElement).style.fontWeight = '600';
          (el as HTMLElement).style.zIndex = '10';
          (el as HTMLElement).style.position = 'relative';
        }
      });
    }, 200);
  }

  navigateToNextResult() {
    if (this.currentResultIndex < this.totalResults - 1) {
      const nextIndex = this.currentResultIndex + 1;
      this.navigateToResult(nextIndex);
    } else {
      this.presentToast('Já no último resultado');
    }
  }

  navigateToPreviousResult() {

    if (this.currentResultIndex > 0) {
      const prevIndex = this.currentResultIndex - 1;
      this.navigateToResult(prevIndex);
    } else {

      this.presentToast('Já no primeiro resultado');
    }
  }

  // Salvar e restaurar posição da rolagem
  saveCurrentPosition() {
    this.content.getScrollElement().then(element => {
      this.lastScrollPosition = element.scrollTop;
    });
  }

  restoreLastPosition() {
    if (this.navigationHistory.length > 0 && this.currentHistoryIndex >= 0) {
      const lastPosition = this.navigationHistory[this.currentHistoryIndex].scrollPosition;
      this.content.scrollToPoint(0, lastPosition, 500);
    } else {
      // Fallback para o comportamento existente
    if (this.lastScrollPosition > 0) {
        this.content.scrollToPoint(0, this.lastScrollPosition, 500);
      }
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
    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.value = query;
    }
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
        /*{
          name: 'searchOption',
          type: 'radio',
          label: 'Palavra-chave (contém)',
          value: 'keyword_contains',
          checked: this.searchBy === 'keyword' && this.searchType === 'contains'
        },*/
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Palavra-chave',
          value: 'keyword_exact',
          checked: this.searchBy === 'keyword' && this.searchType === 'exact'
        },
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Artigo',
          value: 'artigo_exact',
          checked: this.searchBy === 'artigo' && this.searchType === 'exact'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Pesquisar',
          handler: (data) => {
            if (data) {
              // Separar o valor em tipo de busca e modo
              const [searchBy, searchType] = data.split('_');
              this.searchBy = searchBy;
              this.searchType = searchType;

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

  async openModal(type: string) {
    const modal = await this.modalController.create({
      component: RegimentoModalComponent,
      componentProps: {
        type: type
      }
    });
    return await modal.present();
  }

  async openPdfDirectly(pdfName: string) {
    const url = `/pdf-viewer/${pdfName}?remote=false`;
    window.location.href = url;
  }

  toggleComment(commentId: string) {
    if (this.expandedComments.has(commentId)) {
      this.expandedComments.delete(commentId);
    } else {
      this.expandedComments.add(commentId);
    }
  }

  isCommentExpanded(commentId: string): boolean {
    if (this.allCommentsExpanded) return true;
    return this.expandedComments.has(commentId);
  }

  processComentarioContent(content: string): SafeHtml {
    if (!content) return this.sanitizer.bypassSecurityTrustHtml('');

    let processedContent = content.replace(
      /^([^:]+):(.*)$/gm,
      (match, title, content) => {
        return `<strong>${title}:</strong>${content}`;
      }
    );

    processedContent = processedContent.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(this.formatNotas(processedContent));
  }

  processComentarioContentFormated(content: string, commentId: string): SafeHtml {
    if (!content) return this.sanitizer.bypassSecurityTrustHtml('');

    // Gerar chave única para o cache baseado no conteúdo, ID do comentário e estado de expansão
    const isExpanded = this.isCommentExpanded(commentId);
    const cacheKey = `${content}_${commentId}_${isExpanded}`;

    // Verificar se já temos o resultado em cache
    if (this.comentarioCache.has(cacheKey)) {
      return this.comentarioCache.get(cacheKey)!;
    }

    const processAndSanitize = (str: string) => this.sanitizer.bypassSecurityTrustHtml(this.formatNotas(str));

    const colonIndex = content.indexOf(':');
    if (colonIndex === -1) {
      const result = processAndSanitize(content);
      this.comentarioCache.set(cacheKey, result);
      return result;
    }

    const beforeColon = content.substring(0, colonIndex + 1);
    const afterColon = content.substring(colonIndex + 1);

    let processedContent;
    if (!isExpanded) {
      processedContent = `<strong>${beforeColon}</strong><a class="ver-mais" (click)="toggleComment('${commentId}')">Ver mais</a>`;
    } else {
      processedContent = `<strong>${beforeColon}</strong>${afterColon}<a class="ver-menos" (click)="toggleComment('${commentId}')">Ver menos</a>`;
    }

    const result = processAndSanitize(processedContent);

    // Armazenar em cache
    this.comentarioCache.set(cacheKey, result);

    return result;
  }

  toggleAllComments() {
    this.allCommentsExpanded = !this.allCommentsExpanded;

    if (this.allCommentsExpanded) {
      // Adiciona todos os comentários ao set
      this.expandedComments = new Set(this.getAllCommentIds());
    } else {
      // Limpa todos (recolhe todos)
      this.expandedComments.clear();
    }
  }

  getAllCommentIds(): string[] {
    const ids: string[] = [];
    const iterate = (book: any) => {
      book?.titulos?.forEach((titulo: any) => {
        titulo.capitulos?.forEach((capitulo: any) => {
          capitulo.secaos?.forEach((secao: any) => {
            secao.artigos?.forEach((artigo: any) => {
              artigo.paragrafos?.forEach((paragrafo: any) => {
                paragrafo.comentarios?.forEach((comentario: any) => {
                  if (comentario.id) ids.push(comentario.id);
                });
              });
            });
          });
        });
      });
    };
    iterate(this.filteredBook || this.book);
    return ids;
  }

  // Função auxiliar para depuração
  private debugArticleElements(targetArticle: string) {
    const artigos = document.querySelectorAll('h5');

    artigos.forEach((el, index) => {
      const texto = el.textContent || '';
      if (texto.includes(`Art. ${targetArticle}º`) || texto.includes(`Art.${targetArticle}º`)) {
      }
    });
  }

  // Método para configurar listeners para remissões inline
  private setupInlineRemissoesLinks() {
    // Usamos delegação de eventos para capturar cliques em remissões inline
    document.addEventListener('click', (event: any) => {
      const target = event.target;
      if (target && target.classList && target.classList.contains('remissao-inline')) {
        event.preventDefault();
        event.stopPropagation(); // Impede propagação do evento que pode causar comportamentos inesperados

        // Capturar o texto da remissão
        const remissaoText = target.textContent || target.innerText;
        if (!remissaoText) return;

        // Verificação rápida: se não começa com "Art.", ignora
        if (!remissaoText.trim().startsWith('Art')) {
          return;
        }
        // Salvar posição atual da rolagem para permitir voltar
        this.content.getScrollElement().then(scrollElement => {
          const currentPosition = scrollElement.scrollTop;

          // Adicionar um efeito visual ao clicar
          target.classList.add('remissao-active');

          // Fornecer feedback visual mais forte
          target.classList.add('remissao-pulsing');

          // Remover classes após um tempo
          setTimeout(() => {
            target.classList.remove('remissao-active');
            target.classList.remove('remissao-pulsing');
          }, 1500);

          // Usar o parser avançado para identificar destinos
          const destinosRemissao = this.parseRemissaoCompleta(remissaoText);

          if (destinosRemissao.length > 0) {
            // Verificar se temos dados de artigos nos atributos data-*
            let artigos: string[] = [];
            let paragrafo: string | undefined;
            let inciso: string | undefined;

            // Primeiro tenta obter dos atributos data-*
            if (target.hasAttribute('data-artigos')) {
              const artigosAttr = target.getAttribute('data-artigos');
              if (artigosAttr) {
                artigos = artigosAttr.split(',');
              }
            }

            if (target.hasAttribute('data-paragrafos')) {
              const paragrafosAttr = target.getAttribute('data-paragrafos');
              if (paragrafosAttr && paragrafosAttr.length > 0) {
                paragrafo = paragrafosAttr.split(',')[0];
              }
            }

            if (target.hasAttribute('data-incisos')) {
              const incisosAttr = target.getAttribute('data-incisos');
              if (incisosAttr && incisosAttr.length > 0) {
                inciso = incisosAttr.split(',')[0];
              }
            }

            // Se não encontrou nos atributos, usa os resultados do parser
            if (artigos.length === 0) {
              artigos = destinosRemissao.map(d => d.artigo);
            }

            if (!paragrafo && destinosRemissao.some(d => d.paragrafo)) {
              paragrafo = destinosRemissao.find(d => d.paragrafo)?.paragrafo;
            }

            if (!inciso && destinosRemissao.some(d => d.inciso)) {
              inciso = destinosRemissao.find(d => d.inciso)?.inciso;
            }

            if (artigos.length === 1) {
              // Se tem apenas um artigo, navega diretamente
              const destino = destinosRemissao[0];

              // Salvar no histórico o ID da remissão para poder destacá-la ao voltar
              const remissaoId = target.getAttribute('data-remissao-id') || null;
              this.saveToHistory(null, currentPosition, remissaoId, remissaoText, destino.paragrafo || paragrafo, destino.inciso || inciso);

              this.scrollToArtigo(artigos[0], destino.paragrafo || paragrafo, destino.inciso || inciso, true);
            } else if (artigos.length > 1) {
              // Se tem múltiplos artigos, mostra modal para escolha
              const remissaoId = target.getAttribute('data-remissao-id') || null;
              this.saveToHistory(null, currentPosition, remissaoId, remissaoText, null, null);

              if (inciso) {
                // Se tem inciso específico, cria destinos com esse inciso
                const destinosComInciso = artigos.map(artigo => ({
                  artigo,
                  paragrafo,
                  inciso,
                  origem: { text: remissaoText }
                }));
                this.showDestinationChoiceModal(destinosComInciso);
              } else {
                // Caso contrário, mostra modal simples de artigos
                this.showArtigosChoiceModal(artigos);
              }
            }
            return;
          }

          // Processar padrões de artigo apenas se começar com "Art"
          const artigoMatch = remissaoText.match(/Art(?:igos?)?\.?\s+(\d+)[º°]?/i);
          const multipleArtsMatch = remissaoText.match(/Arts\.?\s+(\d+)[º°]?(?:,\s*(\d+)[º°]?)*(?:\s+e\s+(\d+)[º°]?)?/i);

          // Salvar no histórico o ID da remissão para poder destacar-la ao voltar
          const remissaoId = target.getAttribute('data-remissao-id') || null;

          if (multipleArtsMatch) {
            // Extrai todos os números mencionados
            const artigos: string[] = [];
            const allNumbersPattern = /\b(\d+)[º°]?\b/g;
            let numberMatch;

            while ((numberMatch = allNumbersPattern.exec(remissaoText)) !== null) {
              const num = numberMatch[1];
              if (!artigos.includes(num)) {
                artigos.push(num);
              }
            }

            if (artigos.length > 1) {
              // Salva a posição atual antes de mostrar modal
              this.saveToHistory(null, currentPosition, remissaoId, remissaoText, null, null);

              // Mostra modal para escolha se encontrou múltiplos artigos
              this.showArtigosChoiceModal(artigos);
            } else if (artigos.length === 1) {
              // Navega diretamente para o artigo
              this.saveToHistory(null, currentPosition, remissaoId, remissaoText, null, null);
              this.scrollToArtigo(artigos[0], undefined, undefined, true);
            }
          } else if (artigoMatch && artigoMatch[1]) {
            // Navega para o artigo mencionado
            this.saveToHistory(null, currentPosition, remissaoId, remissaoText, null, null);
            this.scrollToArtigo(artigoMatch[1], undefined, undefined, true);
          } else {
            // Se não conseguiu extrair o número do artigo, tenta como fallback
            const numerosMatch = remissaoText.match(/\b(\d+)\b/);
            if (numerosMatch && numerosMatch[1]) {
              this.saveToHistory(null, currentPosition, remissaoId, remissaoText, null, null);
              this.scrollToArtigo(numerosMatch[1], undefined, undefined, true);
            } else {
              this.presentToast('Não foi possível identificar o artigo referenciado');
            }
          }
        });
      }
    });
  }

  // Funções de rastreamento para otimizar a renderização de listas
  trackByTituloId(index: number, item: any): number {
    return item.id || index;
  }

  trackByCapituloId(index: number, item: any): number {
    return item.id || index;
  }

  trackBySecaoId(index: number, item: any): number {
    return item.id || index;
  }

  trackByArtigoId(index: number, item: any): number {
    return item.id || index;
  }

  trackByParagrafoId(index: number, item: any): number {
    return item.id || index;
  }

  trackByRemissaoId(index: number, item: any): number {
    return item.id || index;
  }

  trackByComentarioId(index: number, item: any): number {
    return item.id || index;
  }

  // Parse completo de remissões com parágrafos e incisos
  parseRemissaoCompleta(conteudo: string): RemissaoDestino[] {
    const resultados: RemissaoDestino[] = [];

    // Limpar o texto para processamento
    const textoProcessado = conteudo.replace(/\(.*?\)/g, '').trim(); // Remove texto entre parênteses



    // Verificação inicial: se não começa com "Art.", retorna array vazio
    // Isso melhora significativamente a performance ao evitar processamento desnecessário
    if (!textoProcessado.trim().startsWith('Art')) {
      return resultados;
    }

    // Identificar remissões de lei externa para não confundir com artigos do regimento interno
    // Ex: "Lei 9.504/1997, art. 12"
    const leiExternaPattern = /(?:Lei|Resolução|Código)\s+(?:n[º°]?\s*)?[\d\.\-\/]+,?\s+(?:art\.?|§)/i;
    const leiExternaMatch = textoProcessado.match(leiExternaPattern);

    // Verificar se há múltiplas remissões separadas por ponto e vírgula
    // Ex: "Art. 2º, § 2º; art. 65, I"
    const multipleRemissoesPattern = /([^;]+)/g;
    const remissoesSeparadas = textoProcessado.match(multipleRemissoesPattern);

    if (remissoesSeparadas && remissoesSeparadas.length > 1) {

      // Processar cada remissão separadamente
      for (const remissao of remissoesSeparadas) {
        const subResultados = this.parseRemissaoCompleta(remissao.trim());
        resultados.push(...subResultados);
      }

      return resultados;
    }

    // Padrão para referenciar múltiplos artigos com possíveis parágrafos e incisos
    // Ex: "Arts. 4º, 5º e 65, I" ou "Arts. 4º, 5º e 65, § 2º, I"
    const multipleArtsPattern = /\b(?:Arts?\.?\s*)(\d+)[º°]?(?:\s*[-–]\s*[A-Z])?(?:(?:\s*,|\s+e)\s*(\d+)[º°]?(?:\s*[-–]\s*[A-Z])?)+/i;
    const multipleMatch = textoProcessado.match(multipleArtsPattern);

    if (multipleMatch) {
      // Extrair todos os números de artigos mencionados
      const artigos: string[] = [];
      let eventoFrasePrincipal = textoProcessado;

      // Primeiro identificamos todos os artigos
      const allNumbersPattern = /(?:Arts?\.?\s*|,\s*|\s+e\s+)(\d+)[º°]?(?:\s*[-–]\s*[A-Z])?/g;
      let numberMatch;
      while ((numberMatch = allNumbersPattern.exec(textoProcessado)) !== null) {
        if (numberMatch[1] && !artigos.includes(numberMatch[1])) {
          artigos.push(numberMatch[1]);
          // Remover o artigo processado do texto para análise de parágrafos e incisos
          eventoFrasePrincipal = eventoFrasePrincipal.replace(numberMatch[0], ' ');
        }
      }

      // Verificar se há parágrafo mencionado após o último artigo
      const paragrafoPattern = /§\s*(\d+)[º°]?/;
      const paragrafoMatch = eventoFrasePrincipal.match(paragrafoPattern);
      const paragrafo = paragrafoMatch ? paragrafoMatch[1] : undefined;

      // Verificar se há inciso mencionado após o último artigo/parágrafo
      const incisoPattern = /(?:,\s*|e\s+)([IVX]+)\b/i;
      const incisoMatch = eventoFrasePrincipal.match(incisoPattern);
      const inciso = incisoMatch ? incisoMatch[1] : undefined;

      // Adicionar cada artigo como um destino separado
      for (const artigo of artigos) {
        resultados.push({
          artigo,
          paragrafo,
          inciso,
          origem: {
            text: conteudo
          }
        });
      }

      if (resultados.length > 0) {
        return resultados;
      }
    }

    const artigoComAlineaPattern = /\bart\.?\s*(\d+)[º°]?\s*[-–]\s*([A-Z])(?:\s*,\s*§\s*(\d+)[º°]?)?(?:\s*,\s*([IVX]+))?/i;
    const alineaMatch = artigoComAlineaPattern.exec(textoProcessado);

    if (alineaMatch) {
      const artigo = alineaMatch[1];
      const alinea = alineaMatch[2];
      const paragrafo = alineaMatch[3];
      const inciso = alineaMatch[4];

      resultados.push({
        artigo: `${artigo}-${alinea}`,
        paragrafo,
        inciso,
        origem: {
          text: alineaMatch[0]
        }
      });

      return resultados;
    }

    // Padrão para remissão de artigo com parágrafo e inciso
    // Ex: "art. 231, § 8º, I"
    const artigoComParagrafoIncisoPattern = /\bart\.?\s*(\d+)[º°]?(?:\s*,\s*§\s*(\d+)[º°]?)?(?:\s*,\s*([IVX]+))?/i;
    const complexMatch = artigoComParagrafoIncisoPattern.exec(textoProcessado);

    if (complexMatch) {
      const artigo = complexMatch[1];
      const paragrafo = complexMatch[2];
      const inciso = complexMatch[3];

      resultados.push({
        artigo,
        paragrafo,
        inciso,
        origem: {
          text: complexMatch[0]
        }
      });

      return resultados;
    }

    // Padrão para remissão de artigo com parágrafo
    // Ex: "Art. 2º, § 2º"
    const artigoComParagrafoPattern = /\bart\.?\s*(\d+)[º°]?(?:\s*,\s*§\s*(\d+)[º°]?)/i;
    const paragMatch = artigoComParagrafoPattern.exec(textoProcessado);

    if (paragMatch) {
      const artigo = paragMatch[1];
      const paragrafo = paragMatch[2];

      resultados.push({
        artigo,
        paragrafo,
        origem: {
          text: paragMatch[0]
        }
      });

      return resultados;
    }

    // Padrão para artigo único sem parágrafo ou inciso
    // Ex: "Art. 123"
    const artigoSimplesPattern = /\bart\.?\s*(\d+)[º°]?/i;
    const simplesMatch = artigoSimplesPattern.exec(textoProcessado);

    if (simplesMatch) {
      const artigo = simplesMatch[1];
      const alinea = simplesMatch[2];

      resultados.push({
        artigo: alinea ? `${artigo}-${alinea}` : artigo,
        origem: {
          text: simplesMatch[0]
        }
      });

      return resultados;
    }

    // Padrão para parágrafo único sem referência explícita ao artigo
    // Ex: "§ 3º" ou "§§ 3º e 4º"
    const paragSemArtigoPattern = /§{1,2}\s*(\d+)[º°]?(?:\s*e\s*(\d+)[º°]?)?/i;
    const paragSemArtigoMatch = paragSemArtigoPattern.exec(textoProcessado);

    if (paragSemArtigoMatch) {
      // Se tiver múltiplos parágrafos (§§ 3º e 4º)
      if (paragSemArtigoMatch[2]) {
        resultados.push({
          artigo: 'contexto', // Marcador para indicar que precisa usar o artigo do contexto
          paragrafo: paragSemArtigoMatch[1],
          origem: { text: paragSemArtigoMatch[0] }
        });

        resultados.push({
          artigo: 'contexto',
          paragrafo: paragSemArtigoMatch[2],
          origem: { text: paragSemArtigoMatch[0] }
        });
      } else {
        // Parágrafo único
        resultados.push({
          artigo: 'contexto',
          paragrafo: paragSemArtigoMatch[1],
          origem: { text: paragSemArtigoMatch[0] }
        });
      }

      return resultados;
    }

    // Padrão para inciso romano sem referência explícita ao artigo
    // Ex: "inciso V" ou "V -"
    const incisoSemArtigoPattern = /(?:inciso\s+)?([IVX]+)(?:\s*[–\-]|\s+do\s+art\.)/i;
    const incisoSemArtigoMatch = incisoSemArtigoPattern.exec(textoProcessado);

    if (incisoSemArtigoMatch) {

      resultados.push({
        artigo: 'contexto',
        inciso: incisoSemArtigoMatch[1],
        origem: { text: incisoSemArtigoMatch[0] }
      });

      return resultados;
    }

    // Último recurso: procura por qualquer número que possa ser um artigo
    // Mas apenas se o texto começar com "Art"
    if (resultados.length === 0 && textoProcessado.trim().startsWith('Art')) {
      const numerosMatch = textoProcessado.match(/\b(\d+)\b/g);
      if (numerosMatch) {
        for (const numero of numerosMatch) {
          resultados.push({
            artigo: numero,
            origem: {
              text: conteudo
            }
          });
        }
      }
    }

    return resultados;
  }

  // Identifica o elemento específico de um parágrafo ou inciso
  findElementoEspecifico(artigoId: string, paragrafo?: string, inciso?: string): HTMLElement | null {

    // Gerar uma chave única para o cache
    const cacheKey = `artigo-${artigoId}${paragrafo ? `-p${paragrafo}` : ''}${inciso ? `-i${inciso}` : ''}`;

    try {
      // Verificar se o elemento já está em cache
      if (this.elementosCache.has(cacheKey)) {
        const cachedElement = this.getElementFromCache(cacheKey);
        return cachedElement;
      }
    } catch (error) {
      console.error('Erro ao acessar cache:', error);
      // Em caso de erro, continuar com a busca normal
    }

    // Primeiro, vamos buscar o artigo diretamente na estrutura de dados
    const artigoObj = this.findArtigoByNumero(artigoId);
    if (!artigoObj) {
      return null;
    }

    // Encontrar o elemento do artigo no DOM
    const artigoElement = document.getElementById(`artigo-${artigoObj.id}`);
    if (!artigoElement) {
      return null;
    }

    // Se não estamos procurando por parágrafo ou inciso específico, retorna o artigo
    if (!paragrafo && !inciso) {
      // Armazenar em cache
      this.elementosCache.set(cacheKey, artigoElement);
      return artigoElement;
    }

    // Buscar o parágrafo específico na estrutura de dados
    if (paragrafo && artigoObj.paragrafos && artigoObj.paragrafos.length > 0) {
      let paragrafoEncontrado = null;

      // Procurar pelo parágrafo específico
      for (const p of artigoObj.paragrafos) {
        const conteudo = p.conteudo || '';
        const paragPattern = new RegExp(`§\\s*${paragrafo}[º°]?\\b`, 'i');

        if (paragPattern.test(conteudo)) {
          paragrafoEncontrado = p;
          break;
        }
      }

      if (paragrafoEncontrado) {
        // Tentar encontrar o elemento pelo ID do parágrafo
        const paragrafoElement = document.getElementById(`paragrafo-${paragrafoEncontrado.id}`);
        if (paragrafoElement) {

          // Se também estamos procurando por um inciso específico
          if (inciso) {
            // Verificar se o conteúdo do parágrafo contém o inciso
            const conteudo = paragrafoElement.textContent || '';
            const incisoPattern = new RegExp(`\\b${inciso}\\s*[-–]`, 'i');

            if (incisoPattern.test(conteudo)) {
              this.elementosCache.set(cacheKey, paragrafoElement);
              return paragrafoElement;
            }
          }

          // Armazenar em cache
          this.elementosCache.set(cacheKey, paragrafoElement);
          return paragrafoElement;
        }
      }
    }

    // Fallback: busca no DOM por texto
    const paragrafos = artigoElement.parentElement?.querySelectorAll('h5') || [];

    for (let i = 0; i < paragrafos.length; i++) {
      const texto = paragrafos[i].textContent || '';

      // Verificar se o elemento contém o parágrafo específico
      if (paragrafo && (texto.includes(`§ ${paragrafo}`) || texto.includes(`§${paragrafo}`))) {
        if (inciso) {
          // Se também busca por inciso, verifica se esse parágrafo contém o inciso
          if (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`)) {
            // Armazenar em cache
            this.elementosCache.set(cacheKey, paragrafos[i]);
            return paragrafos[i];
          }
        } else {
          // Armazenar em cache
          this.elementosCache.set(cacheKey, paragrafos[i]);
          return paragrafos[i];
        }
      }
      // Se busca apenas inciso
      else if (inciso && !paragrafo && (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`))) {
        // Armazenar em cache
        this.elementosCache.set(cacheKey, paragrafos[i]);
        return paragrafos[i];
      }
    }

    return artigoElement;
  }

  // Modal para escolha de destino complexo (artigo, parágrafo, inciso)
  async showDestinationChoiceModal(destinos: RemissaoDestino[]) {
    const inputs = destinos.map((destino, index) => {
      let label = '';

      // Formatar a label de acordo com o tipo de destino
      if (destino.artigo === 'contexto') {
        // Para elementos que dependem do contexto atual
        if (destino.paragrafo && destino.inciso) {
          label = `§ ${destino.paragrafo}, inciso ${destino.inciso} (no artigo atual)`;
        } else if (destino.paragrafo) {
          label = `§ ${destino.paragrafo} (no artigo atual)`;
        } else if (destino.inciso) {
          label = `Inciso ${destino.inciso} (no artigo atual)`;
        }
      } else {
        // Para referências diretas a artigos
        label = `Art. ${destino.artigo}`;
        if (destino.paragrafo) {
          label += `, § ${destino.paragrafo}`;
        }
        if (destino.inciso) {
          label += `, inciso ${destino.inciso}`;
        }
      }

      // Se tiver texto de origem, adiciona como descrição
      // Isso é útil quando há múltiplas opções semelhantes
      if (destino.origem?.text) {
        const origemText = destino.origem.text.trim();
        if (origemText) {
          // label += ` (${origemText})`;
          label;
        }
      }

      return {
        type: 'radio' as 'radio',
        label: label,
        value: index.toString()
      };
    });

    const alert = await this.alertController.create({
      header: 'Escolha o destino para navegar',
      inputs: inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Ir',
          handler: (value) => {
            const index = parseInt(value, 10);
            if (isNaN(index) || index < 0 || index >= destinos.length) return;

            const destino = destinos[index];
            this.scrollToArtigo(destino.artigo, destino.paragrafo, destino.inciso, true);
          }
        }
      ]
    });
    await alert.present();
  }

  // Função auxiliar para obter elementos do cache com segurança de tipo
  private getElementFromCache(key: string): HTMLElement | null {
    const element = this.elementosCache.get(key);
    return element || null;
  }

  // Método para encontrar uma remissão pelo ID na estrutura de dados
  private findRemissaoById(remissaoId: string | null): ApiRemissao | null {
    if (!remissaoId) return null;

    const book = this.filteredBook || this.book;
    if (!book || !book.titulos) return null;

    for (const titulo of book.titulos) {
      for (const capitulo of titulo.capitulos || []) {
        for (const secao of capitulo.secaos || []) {
          for (const artigo of secao.artigos || []) {
            for (const paragrafo of artigo.paragrafos || []) {
              for (const remissao of paragrafo.remissoes || []) {
                if (remissao.id.toString() === remissaoId) {
                  return remissao;
                }
              }
            }
          }
        }
      }
    }

    return null;
  }

  // Método para converter destinos da API para o formato esperado
  private convertApiDestinosToRemissaoDestinos(apiDestinos: ApiDestino[]): RemissaoDestino[] {
    return apiDestinos.map(destino => {
      // Extrair o número do artigo do conteúdo usando o método robusto
      const artigoNumero = this.extractArtigoNumber(destino.artigo.conteudo) || destino.artigo.id.toString();

      // Extrair informações do parágrafo se existir
      let paragrafo: string | undefined;
      if (destino.paragrafo) {
        const paragrafoMatch = destino.paragrafo.conteudo.match(/§\s*(\d+)[º°]?/i);
        paragrafo = paragrafoMatch ? paragrafoMatch[1] : undefined;
      }

      // Extrair informações do inciso se existir
      let inciso: string | undefined;
      if (destino.paragrafo && destino.paragrafo.tipo) {
        const incisoMatch = destino.paragrafo.tipo.match(/^([IVX]+)\s*[-–]/i);
        inciso = incisoMatch ? incisoMatch[1] : undefined;
      }

      return {
        artigo: artigoNumero,
        paragrafo,
        inciso,
        origem: {
          text: destino.artigo.conteudo
        }
      };
    });
  }

  // Método para extrair número do artigo de forma mais robusta
  private extractArtigoNumber(artigoContent: string): string {
    // Padrões para extrair o número do artigo
    const patterns = [
      /Art\.?\s*(\d+)[º°]?/i,           // Art. 123 ou Art 123
      /Artigo\s*(\d+)[º°]?/i,           // Artigo 123
      /Arts\.?\s*(\d+)[º°]?/i,          // Arts. 123
      /Artigos\s*(\d+)[º°]?/i           // Artigos 123
    ];

    for (const pattern of patterns) {
      const match = artigoContent.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Se não encontrou nenhum padrão, retorna o ID como fallback
    return '';
  }

  // Método para processar remissões inline que ainda podem estar no texto
  private processInlineRemissoes(content: string): string {
    // Se já temos este conteúdo em cache, retorne-o
    if (this.remissoesCache.has(content)) {
      return this.remissoesCache.get(content)!;
    }

    // Cópia do conteúdo original para trabalhar
    let formattedContent = content;

    // Detecta padrões de remissão inline que ainda não foram processados pela API
    try {
      // Padrão otimizado para detectar apenas referências que começam com "Art." (A maiúsculo)
      const combinedPattern = /\b(Art\.?\s+\d+[º°]?(?:\s*,\s*§\s*\d+[º°]?)?(?:\s*,\s*(?:inciso\s+)?[IVX]+)?)/gi;

      // Função para substituir com marcação HTML
      const replaceWithLink = (match: string): string => {
        // Verificar se a remissão realmente começa com "Art." (A maiúsculo)
        if (!match.trim().startsWith('Art')) {
          return match;
        }

        // Gera um ID único para esta remissão
        const remissaoId = 'inline-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Extrai informações sobre artigos, parágrafos e incisos
        const destinosRemissao = this.parseRemissaoCompleta(match);

        // Preparar atributos data-* para facilitar a navegação
        let dataArtigos = '';
        let dataParagrafos = '';
        let dataIncisos = '';

        if (destinosRemissao.length > 0) {
          // Extrair artigos, parágrafos e incisos únicos
          const artigos = [...new Set(destinosRemissao.map(d => d.artigo))];
          const paragrafos = [...new Set(destinosRemissao.filter(d => d.paragrafo).map(d => d.paragrafo))];
          const incisos = [...new Set(destinosRemissao.filter(d => d.inciso).map(d => d.inciso))];

          // Construir os atributos data-*
          dataArtigos = artigos.join(',');
          dataParagrafos = paragrafos.join(',');
          dataIncisos = incisos.join(',');
        } else {
          // Tentar extrair manualmente apenas se começar com "Art"
          const artigoMatch = match.match(/\b(\d+)[º°]?\b/g);
          if (artigoMatch) {
            dataArtigos = artigoMatch.join(',');
          }

          const paragrafoMatch = match.match(/§\s*(\d+)[º°]?\b/g);
          if (paragrafoMatch) {
            dataParagrafos = paragrafoMatch.map(p => p.replace(/§\s*/, '')).join(',');
          }

          const incisoMatch = match.match(/\b([IVX]+)\b/g);
          if (incisoMatch) {
            dataIncisos = incisoMatch.join(',');
          }
        }

        // Construir os atributos data-*
        const dataAtributos = [
          `data-remissao-id="${remissaoId}"`,
          dataArtigos ? `data-artigos="${dataArtigos}"` : '',
          dataParagrafos ? `data-paragrafos="${dataParagrafos}"` : '',
          dataIncisos ? `data-incisos="${dataIncisos}"` : '',
          'data-remissao-type="inline"'
        ].filter(attr => attr).join(' ');

        // Determinar se a remissão está dentro de parênteses
        const isInParentheses = /\([^)]*$/.test(formattedContent.substring(0, formattedContent.indexOf(match))) &&
                               /^[^(]*\)/.test(formattedContent.substring(formattedContent.indexOf(match) + match.length));

        // Adicionar classe especial para remissões dentro de parênteses
        const extraClass = isInParentheses ? 'remissao-parentese' : '';

        // Retorna o HTML com a classe remissao-inline de forma segura
        return `<span class="remissao-inline ${extraClass}" role="link" tabindex="0" ${dataAtributos}>${match}</span>`;
      };

      // Aplicar substituições apenas para padrões que começam com "Art."
      formattedContent = formattedContent.replace(combinedPattern, replaceWithLink);

      // Adicionar ao cache
      this.remissoesCache.set(content, formattedContent);
    } catch (error) {
      console.error('Erro ao processar remissões inline:', error);
      return content;
    }

    return formattedContent;
  }

  // Método para obter contexto do resultado atual
  getCurrentResultContext(): string {
    if (this.currentResultIndex < 0 || this.currentResultIndex >= this.searchResults.length) {
      return '';
    }

    const result = this.searchResults[this.currentResultIndex];
    if (!result) return '';

    // Extrair informações relevantes do resultado
    const type = result.type === 'artigo' ? 'Artigo' : 'Parágrafo';
    const path = result.path || '';

    // Limitar o tamanho do contexto para não ficar muito longo
    const maxLength = 50;
    const context = `${type}: ${path}`;

    return context.length > maxLength ? context.substring(0, maxLength) + '...' : context;
  }

  // Método para manter a posição atual (salvar no histórico)
  keepCurrentPosition() {
    this.content.getScrollElement().then(scrollElement => {
      const currentPosition = scrollElement.scrollTop;
      this.lastScrollPosition = currentPosition;

      // Feedback visual
      this.presentToast('Posição atual mantida');

      // Ocultar a barra de navegação após um tempo
      setTimeout(() => {
        this.clearSearch();
      }, 2000);
    });
  }

  // Método para processar remissões de forma otimizada
  private processRemissoes() {
    const book = this.book;
    if (!book || !book.titulos) return;

    // Cache para remissões processadas
    this.remissoesCache.clear();
    
    // Processar apenas quando necessário
    if (this.query) {
      this.processRemissoesForSearch();
    }
  }

  // Método para processar remissões apenas durante busca
  private processRemissoesForSearch() {
    // Limpar cache de remissões inline para forçar reprocessamento
    this.remissoesCache.clear();
  }

  // Método para limpar todos os caches
  private clearAllCaches() {
    this.contentCache.clear();
    this.remissoesCache.clear();
    this.comentarioCache.clear();
    this.elementosCache.clear();
  }

  // Método para otimizar performance
  private optimizePerformance() {
    // Limpar caches antigos periodicamente
    if (this.contentCache.size > 100) {
      this.contentCache.clear();
    }
    
    if (this.remissoesCache.size > 50) {
      this.remissoesCache.clear();
    }
    
    if (this.comentarioCache.size > 100) {
      this.comentarioCache.clear();
    }
  }


}
