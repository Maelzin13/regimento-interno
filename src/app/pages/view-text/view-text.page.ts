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

  // Propriedade para o debounce da rolagem
  private scrollDebounceTimeout: any;
  expandedComments: Set<string> = new Set();
  
  private notasCache: Map<number, any> = new Map()
  
  // Adicionar propriedades para histórico de navegação
  navigationHistory: HistoryEntry[] = [];
  currentHistoryIndex: number = -1;
  private remissaoListenerAttached = false;
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
    const user = await this.authService.getUser();
    this.user = user;
    this.bookId = this.route.snapshot.paramMap.get('id');
    this.loadSearchHistory();
    await this.loadBook();
    
  }

  async loadBook() {
    try {
      this.loadingController.create({
        message: 'Carregando regimento...',
        spinner: 'circles',
        cssClass: 'loading-regimento'
      }).then(loader => {
        loader.present();
        
        // Limpar caches para garantir dados atualizados
        this.elementosCache.clear();
        this.contentCache.clear();
        this.remissoesCache.clear();
        
        // Carregar o livro
        this.bookService.getBookById(this.bookId)
          .then((books: any) => {
            // Remover o loading
            loader.dismiss();
            
            // Guardar os dados do livro
            this.book = books.livro;
            this.primeiroParagrafo = books.primeiro.conteudo;
            
            console.log('Livro carregado:', this.book);
            
            // Construir o mapa de artigos imediatamente após carregar os dados
            this.buildArtigoNumeroParaIdMap();
            
            // Checar a URL por algum artigo específico para navegar
            // Mas só depois de garantir que o DOM está pronto
            this.route.queryParams.subscribe(params => {
              if (params && params['artigo']) {
                // Aumentar o timeout para garantir que o DOM está pronto
                setTimeout(() => {
                  console.log('Navegando para artigo da URL:', params['artigo']);
                  this.scrollToArtigo(params['artigo']);
                }, 1000);
              }
            });
          })
          .catch((error) => {
            // Remover o loading em caso de erro
            loader.dismiss();
            console.error('Erro ao carregar os livros:', error);
            this.presentToast('Erro ao carregar o regimento. Tente novamente.');
          });
      });
    } catch (error) {
      console.error('Erro ao carregar o livro:', error);
    } finally {
      this.loadingController.dismiss();
    }
  }

  private artigoNumeroParaId: Record<string, string> = {};

  private buildArtigoNumeroParaIdMap() {
    this.artigoNumeroParaId = {};
    const book = this.filteredBook || this.book;
    if (!book || !book.titulos) {
      console.error('Livro não carregado ou sem títulos');
      return;
    }
    
    console.log('Construindo mapa de artigos para:', book);
    
    try {
      book.titulos.forEach((titulo: any) => {
        titulo.capitulos?.forEach((capitulo: any) => {
          capitulo.secaos?.forEach((secao: any) => {
            secao.artigos?.forEach((artigo: any) => {
              // Usar uma expressão regular mais precisa para capturar o número do artigo
              const match = artigo.conteudo.match(/Art\.?\s*(\d+)[º°]?/i);
              if (match && match[1]) {
                const numero = match[1];
                this.artigoNumeroParaId[numero] = artigo.id;
                console.log(`Mapeado: Artigo ${numero} -> ID ${artigo.id}`);
                
                // Verificar se o conteúdo do artigo contém o texto correto
                const artigoElement = document.getElementById(`artigo-${artigo.id}`);
                if (artigoElement) {
                  const texto = artigoElement.textContent || '';
                  if (!texto.includes(`Art. ${numero}`)) {
                    console.warn(`Possível problema: Artigo ${numero} (ID ${artigo.id}) não contém o texto esperado:`, texto.substring(0, 100));
                  }
                }
              } else {
                console.warn('Artigo sem número identificável:', artigo.conteudo.substring(0, 100));
              }
            });
          });
        });
      });
      
      console.log('Mapa de artigos construído:', this.artigoNumeroParaId);
    } catch (error) {
      console.error('Erro ao construir mapa de artigos:', error);
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
    
    // NÃO executar busca automática - apenas armazenar o valor
    // A busca será executada apenas quando o usuário clicar em "Buscar" ou pressionar Enter
  }

  // Função para executar a busca quando solicitado pelo usuário
  async executeSearch() {
    if (!this.query.trim()) {
      this.presentToast('Digite algo para buscar');
      return;
    }
    
    // Executar a busca
    await this.search();
  }

  clearSearch() {
    this.filteredBook = null;
    this.searchResults = [];
    this.totalResults = 0;
    this.currentResultIndex = -1;
    this.isSearching = false;
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
      
      console.log(`Query original: "${queryLower}", Query processada: "${processedQuery}"`);
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
        console.log('Word Boundary Regex:', wordBoundaryRegex);
        console.log('Normalized Text:', normalizedText);
        console.log('Normalized Query:', normalizedQuery);
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
    // Usar o ID do elemento como base para a posição
    // Elementos com IDs menores aparecem primeiro no documento
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
    
    console.log('Resultados ordenados:', this.searchResults.map((r, i) => ({
      index: i,
      type: r.type,
      id: r.id,
      position: r.position,
      content: r.content.substring(0, 50) + '...'
    })));
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

  ngAfterViewInit() {
    // Garantir que o mapa de artigos está construído
    setTimeout(() => {
      this.buildArtigoNumeroParaIdMap();
    }, 1000);
    
    if (!this.notaListenerAttached) {
      this.listenNotaClicks();
      this.notaListenerAttached = true;
    }
    
    if (!this.remissaoListenerAttached) {
      this.setupRemissaoLinks();
      this.remissaoListenerAttached = true;
    }
    
    // Adicionar listener para remissões inline
    this.setupInlineRemissoesLinks();
  
    this.setupScrollListener();
    
    // Limpar o cache de remissões para forçar uma nova formatação
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
        
        // Passamos o remissaoElement para o handler
        this.handleRemissaoContent(remissaoElement, event);
        event.preventDefault();
      }
    };

    document.addEventListener('click', this.handleRemissaoClick as any);
    console.log('Setup de remissão concluído. Estado do histórico:', this.navigationHistory);
  }

  handleRemissaoContent(remissaoElement: HTMLElement, event: Event) {
    const conteudo = remissaoElement.textContent || '';
    console.log('Conteúdo da remissão:', conteudo);
    
    // Verificação rápida: se não começa com "Art.", ignora
    if (!conteudo.trim().startsWith('Art')) {
      console.log('Remissão não começa com "Art.", ignorando:', conteudo);
      return;
    }
    
    // Obtém o ID da remissão para rastreamento
    const remissaoId = remissaoElement.getAttribute('data-remissao-id');

    // Salva posição antes de navegar
    this.content.getScrollElement().then(scrollElement => {
      const currentPosition = scrollElement.scrollTop;
      
      // Processa a remissão para identificar os possíveis destinos
      const destinosRemissao = this.parseRemissaoCompleta(conteudo);
      
      if (destinosRemissao.length > 0) {
        console.log('Destinos de remissão encontrados:', destinosRemissao);
        
        if (destinosRemissao.length === 1) {
          // Se tem só um destino, navega direto
          const destino = destinosRemissao[0];
          
          // Salvamos informações adicionais sobre a remissão para melhorar a navegação
          this.saveToHistory(null, currentPosition, remissaoId, conteudo, destino.paragrafo, destino.inciso);
          
          this.scrollToArtigo(destino.artigo, destino.paragrafo, destino.inciso, true);
          event.preventDefault();
          return;
        } else {
          // Se tem múltiplos destinos, mostra modal para escolha
          this.saveToHistory(null, currentPosition, remissaoId, conteudo, null, null);
          
          // Modal para escolher entre múltiplos destinos
          this.showDestinationChoiceModal(destinosRemissao);
          event.preventDefault();
          return;
        }
      } else {
        // Não encontrou nenhum destino com o parser
        console.log('Nenhum destino encontrado para a remissão:', conteudo);
        this.presentToast('Não foi possível identificar a referência na remissão.');
      }
    });
  }

  // Modal para múltiplos artigos
  async showArtigosChoiceModal(artigos: string[]) {
    // Convertendo artigos simples para o formato RemissaoDestino
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
    
    console.log('Histórico atualizado:', this.navigationHistory);
  }

  navigateBack() {
    // Verificar se há para onde voltar
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      const previousPosition = this.navigationHistory[this.currentHistoryIndex];
      
      // Restaurar a posição anterior
      this.content.scrollToPoint(0, previousPosition.scrollPosition, 500);
      
      console.log('Navegando de volta para:', previousPosition);
      
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
              this.presentToast('Retornando à remissão original');
            }
          }
          
          // Limpar o histórico de navegação após voltar ao ponto de origem
          // Mantemos apenas a entrada atual para não sobrecarregar o app
          this.navigationHistory = this.navigationHistory.slice(0, this.currentHistoryIndex + 1);
          console.log('Histórico de navegação limpo após retorno:', this.navigationHistory);
        }, 600);
      } else {
        // Feedback para o usuário
        this.presentToast('Retornando à posição anterior');
        
        // Limpar o histórico de navegação após voltar ao ponto de origem
        this.navigationHistory = this.navigationHistory.slice(0, this.currentHistoryIndex + 1);
        console.log('Histórico de navegação limpo após retorno:', this.navigationHistory);
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
      console.log('Artigo marcado como contexto, tentando determinar o artigo atual');
      
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
            console.log(`Artigo do contexto determinado: ${artigoNumero}`);
            
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
      
      console.log(`Buscando ${elementType}: Artigo ${artigoLimpo}${paragrafo ? ', §'+paragrafo : ''}${inciso ? ', '+inciso : ''}`);
      
      // Usar a função especializada para encontrar o elemento exato
      let element = this.findElementoEspecifico(artigoLimpo, paragrafo, inciso);
      
      // Se não encontrou o elemento específico, tenta encontrar apenas o artigo
      if (!element && (paragrafo || inciso)) {
        console.log('Elemento específico não encontrado, tentando encontrar apenas o artigo');
        element = this.findElementoEspecifico(artigoLimpo);
      }
      
      // Se encontrou o elemento, rola até ele e destaca
      if (element) {
        console.log(`Elemento encontrado para ${elementType} ${artigoLimpo}:`, element);
        
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

  safeHTML(content: string): SafeHtml {
    if (!content) return this.sanitizer.bypassSecurityTrustHtml('');
    
    // Gerar uma chave de cache baseada no conteúdo e no estado atual da pesquisa
    const cacheKey = content + (this.query || '') + (this.searchType || '') + (this.searchBy || '') + (this.totalResults || 0);
    
    // Verificar se já temos o resultado em cache
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey)!;
    }

    let formatted = this.formatNotas(content);
    
    // Processa remissões inline (referências a artigos no texto)
    formatted = this.formatRemissoes(formatted);

    // Destaca os termos de busca APENAS se a busca foi executada E se houver resultados
    // NÃO aplicar highlights durante a digitação
    if (this.query && this.searchBy === 'keyword' && this.totalResults > 0 && !this.isSearching) {
      const queryLower = this.query.toLowerCase().trim();
      
      if (this.searchType === 'exact') {
        // Para termo exato, usar uma abordagem mais precisa
        const normalizedQuery = this.normalizeText(queryLower);
        const normalizedContent = this.normalizeText(formatted);
        
        // Usar word boundaries mais precisos para termos exatos
        const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(normalizedQuery)}\\b`, 'gi');
        
        // Aplicar destaque permanente nas ocorrências exatas usando <mark>
        formatted = formatted.replace(wordBoundaryRegex, (match) => {
          // Verificar se a correspondência original (não normalizada) realmente contém o termo exato
          const originalMatch = match.toLowerCase();
          if (originalMatch.includes(queryLower)) {
            return `<mark class="highlight-search permanent-highlight" style="background-color: rgba(255, 230, 0, 0.8); padding: 2px 4px; border-radius: 3px; font-weight: 600; color: #000; box-shadow: 0 0 6px rgba(255, 230, 0, 0.5);">${match}</mark>`;
          }
          return match;
        });
      } else {
        // Para "contém", usar busca simples mas case-insensitive com <mark> permanente
        const regex = new RegExp(this.escapeRegExp(queryLower), 'gi');
        formatted = formatted.replace(regex, match =>
          `<mark class="highlight-search permanent-highlight" style="background-color: rgba(255, 230, 0, 0.8); padding: 2px 4px; border-radius: 3px; font-weight: 600; color: #000; box-shadow: 0 0 6px rgba(255, 230, 0, 0.5);">${match}</mark>`
        );
      }
    }

    const result = this.sanitizer.bypassSecurityTrustHtml(formatted);
    
    this.contentCache.set(cacheKey, result);
    
    return result;
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
  async navigateToResult(index: number) {
    console.log(`=== NAVEGAÇÃO PARA RESULTADO ${index} ===`);
    
    if (index < 0 || index >= this.searchResults.length) {
      console.error(`Índice inválido: ${index}. Total de resultados: ${this.searchResults.length}`);
      return;
    }

    this.currentResultIndex = index;
    const result = this.searchResults[index];

    console.log('Resultado atual:', {
      index: index,
      type: result.type,
      id: result.id,
      position: result.position,
      content: result.content.substring(0, 100) + '...',
      path: result.path
    });

    // Remover destaques flash anteriores
    const previousHighlights = document.querySelectorAll('.flash-highlight');
    previousHighlights.forEach(el => {
      el.classList.remove('flash-highlight');
    });

    // Encontrar o elemento correspondente ao resultado
    setTimeout(() => {
      let element: HTMLElement | null = null;
      
      // Tentar encontrar pelo ID específico usando a nova estrutura
      const elementId = `${result.type}-${result.id}`;
      element = document.getElementById(elementId);
      console.log('Element:', element);
      
      if (element) {
        console.log(`Elemento encontrado pelo ID: ${elementId}`);
      } else {
        console.log(`Elemento não encontrado pelo ID: ${elementId}, buscando por conteúdo...`);
        
        // Buscar elementos que contenham o texto do resultado
        const allElements = document.querySelectorAll('h5, p, div');
        for (const el of Array.from(allElements)) {
          const text = el.textContent || '';
          if (text.includes(result.content.substring(0, 50))) {
            element = el as HTMLElement;
            console.log('Elemento encontrado por conteúdo:', element);
            break;
          }
        }
      }

      if (element) {
        console.log('Elemento encontrado, rolando para:', element);
        
        // Calcular a posição para centralizar o elemento
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const elementHeight = rect.height;
        const offsetTop = rect.top + window.pageYOffset;
        
        // Centralizar o elemento na tela com um pequeno ajuste para cima
        const scrollPosition = offsetTop - (windowHeight * 0.3); // Posiciona a 30% do topo
        
        console.log(`Posições calculadas:`, {
          rectTop: rect.top,
          windowHeight: windowHeight,
          elementHeight: elementHeight,
          offsetTop: offsetTop,
          scrollPosition: scrollPosition
        });
        
        // Rolar para o elemento com maior suavidade
        this.content.scrollToPoint(0, scrollPosition, 500);

        // Adicionar efeito de destaque temporário mais visível
        element.classList.add('flash-highlight');
        
        // Adicionar estilos inline para garantir visibilidade
        element.style.backgroundColor = 'rgba(255, 230, 0, 0.3)';
        element.style.borderRadius = '4px';
        element.style.padding = '8px';
        element.style.transition = 'all 0.3s ease';

        // Forçar a atualização dos destaques das palavras
        setTimeout(() => {
          this.forceHighlightsRefresh();
        }, 300);
        
        // Remover estilos após um tempo
        setTimeout(() => {
          element.classList.remove('flash-highlight');
          element.style.backgroundColor = '';
          element.style.border = '';
          element.style.borderRadius = '';
          element.style.padding = '';
          element.style.transition = '';
        }, 3000);
        
        console.log('Navegação concluída para elemento:', element);
      } else {
        console.error('Elemento não encontrado para resultado:', result);
        this.presentToast('Elemento não encontrado na página');
      }
    }, 100);
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
    console.log(`Navegando para próximo resultado. Atual: ${this.currentResultIndex}, Total: ${this.totalResults}`);
    
    if (this.currentResultIndex < this.totalResults - 1) {
      const nextIndex = this.currentResultIndex + 1;
      console.log(`Indo para índice ${nextIndex}`);
      this.navigateToResult(nextIndex);
    } else {
      console.log('Já no último resultado');
      this.presentToast('Já no último resultado');
    }
  }

  navigateToPreviousResult() {
    console.log(`Navegando para resultado anterior. Atual: ${this.currentResultIndex}, Total: ${this.totalResults}`);
    
    if (this.currentResultIndex > 0) {
      const prevIndex = this.currentResultIndex - 1;
      console.log(`Indo para índice ${prevIndex}`);
      this.navigateToResult(prevIndex);
    } else {
      console.log('Já no primeiro resultado');
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
      console.log('Restaurando última posição:', lastPosition);
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
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Palavra-chave (contém)',
          value: 'keyword_contains',
          checked: this.searchBy === 'keyword' && this.searchType === 'contains'
        },
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Palavra-chave (termo exato)',
          value: 'keyword_exact',
          checked: this.searchBy === 'keyword' && this.searchType === 'exact'
        },
        {
          name: 'searchOption',
          type: 'radio',
          label: 'Artigo (termo exato)',
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

  async showSearchHistory() {
    const alert = await this.alertController.create({
      header: 'Histórico de Pesquisas',
      message: 'Selecione uma pesquisa anterior ou limpe o histórico',
      inputs: this.searchHistory.map(item => ({
        name: 'history',
        type: 'radio',
        label: item,
        value: item
      })),
      buttons: [
        {
          text: 'Limpar Histórico',
          role: 'destructive',
          handler: () => {
            this.clearSearchHistory();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Selecionar',
          handler: (data) => {
            if (data) {
              this.useHistoryItem(data);
            }
          }
        }
      ],
      cssClass: 'search-history-alert'
    });

    await alert.present();
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
    console.log(`Abrindo PDF: ${pdfName}`);
    
    // Navegar para a página de visualização de PDF com URLs remotas
    // Usando window.location.href para garantir uma navegação completa
    const url = `/pdf-viewer/${pdfName}?remote=true`;
    console.log(`Redirecionando para: ${url}`);
    
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
    console.log(`Depurando elementos para encontrar Artigo ${targetArticle}:`);
    const artigos = document.querySelectorAll('h5');
    
    artigos.forEach((el, index) => {
      const texto = el.textContent || '';
      if (texto.includes(`Art. ${targetArticle}º`) || texto.includes(`Art.${targetArticle}º`)) {
        console.log(`Elemento ${index} contém Artigo ${targetArticle}:`, texto.substring(0, 100));
        console.log('ID do elemento:', el.id);
        console.log('Elemento completo:', el);
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
          console.log('Remissão não começa com "Art.", ignorando:', remissaoText);
          return;
        }
        
        console.log('Clique em remissão inline:', remissaoText);
        
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
            console.log('Destinos de remissão inline encontrados:', destinosRemissao);
            
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
            
            console.log('Artigos a navegar:', artigos, 'Parágrafo:', paragrafo, 'Inciso:', inciso);
            
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
          
          // Fallback para o comportamento anterior se o parser não encontrou nada
          console.log('Parser avançado não encontrou destinos, usando fallback');
          
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
    
    console.log('Texto processado para análise:', textoProcessado);
    
    // Verificação inicial: se não começa com "Art.", retorna array vazio
    // Isso melhora significativamente a performance ao evitar processamento desnecessário
    if (!textoProcessado.trim().startsWith('Art')) {
      console.log('Texto não começa com "Art.", ignorando:', textoProcessado);
      return resultados;
    }
    
    // Identificar remissões de lei externa para não confundir com artigos do regimento interno
    // Ex: "Lei 9.504/1997, art. 12"
    const leiExternaPattern = /(?:Lei|Resolução|Código)\s+(?:n[º°]?\s*)?[\d\.\-\/]+,?\s+(?:art\.?|§)/i;
    const leiExternaMatch = textoProcessado.match(leiExternaPattern);
    
    if (leiExternaMatch) {
      console.log('Identificada referência à lei externa:', leiExternaMatch[0]);
      // Apresentaremos todas as opções mas indicando se são leis externas
    }
    
    // Verificar se há múltiplas remissões separadas por ponto e vírgula
    // Ex: "Art. 2º, § 2º; art. 65, I"
    const multipleRemissoesPattern = /([^;]+)/g;
    const remissoesSeparadas = textoProcessado.match(multipleRemissoesPattern);
    
    if (remissoesSeparadas && remissoesSeparadas.length > 1) {
      console.log('Encontradas múltiplas remissões separadas por ponto e vírgula:', remissoesSeparadas);
      
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
      console.log('Padrão de múltiplos artigos encontrado:', multipleMatch);
      
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
      
      console.log('Artigos extraídos:', artigos);
      console.log('Texto restante após remoção de artigos:', eventoFrasePrincipal);
      
      // Verificar se há parágrafo mencionado após o último artigo
      const paragrafoPattern = /§\s*(\d+)[º°]?/;
      const paragrafoMatch = eventoFrasePrincipal.match(paragrafoPattern);
      const paragrafo = paragrafoMatch ? paragrafoMatch[1] : undefined;
      
      // Verificar se há inciso mencionado após o último artigo/parágrafo
      const incisoPattern = /(?:,\s*|e\s+)([IVX]+)\b/i;
      const incisoMatch = eventoFrasePrincipal.match(incisoPattern);
      const inciso = incisoMatch ? incisoMatch[1] : undefined;
      
      console.log('Parágrafo encontrado:', paragrafo);
      console.log('Inciso encontrado:', inciso);
      
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
      
      console.log(`Encontrado artigo ${artigo}-${alinea}, parágrafo ${paragrafo}, inciso ${inciso}`);
      
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
      
      console.log(`Encontrado artigo ${artigo}, parágrafo ${paragrafo}, inciso ${inciso}`);
      
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
      
      console.log(`Encontrado artigo ${artigo}, parágrafo ${paragrafo}`);
      
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
    console.log('Simples Match:', simplesMatch);
    
    if (simplesMatch) {
      const artigo = simplesMatch[1];
      const alinea = simplesMatch[2];
      
      console.log(`Encontrado artigo simples ${artigo}${alinea ? `-${alinea}` : ''}`);
      
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
      // Neste caso, precisamos tentar inferir o artigo pelo contexto ou usar o atual
      console.log('Parágrafo sem referência explícita de artigo:', paragSemArtigoMatch[0]);
      
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
      console.log('Inciso sem referência explícita de artigo:', incisoSemArtigoMatch[0]);
      
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
    
    console.log('Destinos de remissão encontrados:', resultados);
    return resultados;
  }
  
  // Identifica o elemento específico de um parágrafo ou inciso
  findElementoEspecifico(artigoId: string, paragrafo?: string, inciso?: string): HTMLElement | null {
    console.log(`Buscando elemento específico: Artigo ${artigoId}, Parágrafo ${paragrafo}, Inciso ${inciso}`);
    
    // Gerar uma chave única para o cache
    const cacheKey = `artigo-${artigoId}${paragrafo ? `-p${paragrafo}` : ''}${inciso ? `-i${inciso}` : ''}`;
    
    try {
      // Verificar se o elemento já está em cache
      if (this.elementosCache.has(cacheKey)) {
        const cachedElement = this.getElementFromCache(cacheKey);
        console.log(`Elemento encontrado em cache: ${cacheKey}`);
        return cachedElement;
      }
    } catch (error) {
      console.error('Erro ao acessar cache:', error);
      // Em caso de erro, continuar com a busca normal
    }
    
    // Primeiro, vamos buscar o artigo diretamente na estrutura de dados
    const artigoObj = this.findArtigoByNumero(artigoId);
    if (!artigoObj) {
      console.log(`Artigo ${artigoId} não encontrado na estrutura de dados`);
      return null;
    }
    
    console.log('Artigo encontrado na estrutura de dados:', artigoObj);
    
    // Encontrar o elemento do artigo no DOM
    const artigoElement = document.getElementById(`artigo-${artigoObj.id}`);
    if (!artigoElement) {
      console.log(`Elemento do artigo ${artigoId} (ID: ${artigoObj.id}) não encontrado no DOM`);
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
          console.log(`Parágrafo ${paragrafo} encontrado na estrutura de dados:`, p);
          break;
        }
      }
      
      if (paragrafoEncontrado) {
        // Tentar encontrar o elemento pelo ID do parágrafo
        const paragrafoElement = document.getElementById(`paragrafo-${paragrafoEncontrado.id}`);
        if (paragrafoElement) {
          console.log(`Elemento do parágrafo ${paragrafo} encontrado pelo ID:`, paragrafoElement);
          
          // Se também estamos procurando por um inciso específico
          if (inciso) {
            // Verificar se o conteúdo do parágrafo contém o inciso
            const conteudo = paragrafoElement.textContent || '';
            const incisoPattern = new RegExp(`\\b${inciso}\\s*[-–]`, 'i');
            
            if (incisoPattern.test(conteudo)) {
              console.log(`Inciso ${inciso} encontrado no parágrafo ${paragrafo}`);
              // Armazenar em cache
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
    console.log('Buscando no DOM por texto...');
    const paragrafos = artigoElement.parentElement?.querySelectorAll('h5') || [];
    
    for (let i = 0; i < paragrafos.length; i++) {
      const texto = paragrafos[i].textContent || '';
      
      // Verificar se o elemento contém o parágrafo específico
      if (paragrafo && (texto.includes(`§ ${paragrafo}`) || texto.includes(`§${paragrafo}`))) {
        if (inciso) {
          // Se também busca por inciso, verifica se esse parágrafo contém o inciso
          if (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`)) {
            console.log(`Encontrado parágrafo ${paragrafo} com inciso ${inciso} no DOM`);
            // Armazenar em cache
            this.elementosCache.set(cacheKey, paragrafos[i]);
            return paragrafos[i];
          }
        } else {
          console.log(`Encontrado parágrafo ${paragrafo} no DOM`);
          // Armazenar em cache
          this.elementosCache.set(cacheKey, paragrafos[i]);
          return paragrafos[i];
        }
      }
      // Se busca apenas inciso
      else if (inciso && !paragrafo && (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`))) {
        console.log(`Encontrado inciso ${inciso} no DOM`);
        // Armazenar em cache
        this.elementosCache.set(cacheKey, paragrafos[i]);
        return paragrafos[i];
      }
    }
    
    // Se não encontrou o elemento específico, retorna o artigo
    console.log(`Elemento específico não encontrado, retornando o artigo ${artigoId}`);
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
      console.log('Scroll Element:', scrollElement);
      const currentPosition = scrollElement.scrollTop;
      console.log('Current Position:', currentPosition);
      this.lastScrollPosition = currentPosition;
      console.log('Current Position:', this.lastScrollPosition);
      
      // Feedback visual
      this.presentToast('Posição atual mantida');
      
      // Ocultar a barra de navegação após um tempo
      setTimeout(() => {
        this.clearSearch();
      }, 2000);
    });
  }
}
