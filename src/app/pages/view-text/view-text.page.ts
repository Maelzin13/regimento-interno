import { ModalPage } from '../modal/modal.page';
import { UserModel } from 'src/app/models/userModel';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from 'src/app/services/book.service';
import { AuthService } from 'src/app/services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';
import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { IonContent, ModalController, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { RegimentoModalComponent } from '../../Modals/regimento-modal/regimento-modal.component';

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
  }

  clearSearch() {
    this.filteredBook = null;
    this.searchResults = [];
    this.totalResults = 0;
    this.currentResultIndex = -1;
    this.isSearching = false;
    console.log('totalResults', this.totalResults);
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

    const textMatches = (text: string) => {
      if (!text) return false;
      const textLower = text.toLowerCase();

      if (searchType === 'exact') {
        const regex = new RegExp(`\\b${this.escapeRegExp(queryLower)}\\b`, 'i');
        console.log('regex', regex);
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

  ngAfterViewInit() {
    // Garantir que o mapa de artigos está construído
    setTimeout(() => {
      console.log('Reconstruindo mapa de artigos...');
      this.buildArtigoNumeroParaIdMap();
      console.log('Mapa de artigos reconstruído:', this.artigoNumeroParaId);
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
    
    // Obtém o ID da remissão para rastreamento
    const remissaoId = remissaoElement.getAttribute('data-remissao-id');

    // Salva posição antes de navegar
    this.content.getScrollElement().then(scrollElement => {
      const currentPosition = scrollElement.scrollTop;
      
      // Tenta o parser avançado primeiro - esta é a abordagem principal
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
      }
      
      // Fallback para o comportamento existente se o parser avançado não encontrar nada
      // Este código raramente será executado com o parser melhorado
      console.log('Parser avançado não encontrou destinos, usando fallback');
      
      // Salvamos informações adicionais sobre a remissão para melhorar a navegação
      this.saveToHistory(null, currentPosition, remissaoId, conteudo, null, null);

      // Padrões para diferentes formatos de remissões
      // 1. Formato "Arts. X, Y e Z"
      const multipleArtsPattern = /Arts?\.\s*(\d+)[º°]?(?:\s*,\s*(\d+)[º°]?)*(?:\s*e\s*(\d+)[º°]?)?/i;
      // 2. Formato "Art. X"
      const singleArtPattern = /Art\.\s*(\d+)[º°]?/i;
      // 3. Formato para capturar números isolados após "Art." ou "Arts."
      const numbersPattern = /Art(?:s)?\.(?:[^0-9]+(\d+)[º°]?)+/gi;
      
      // Tenta encontrar múltiplos artigos no formato "Arts. X, Y e Z"
      const multipleMatch = conteudo.match(multipleArtsPattern);
      if (multipleMatch) {
        // Extrai todos os números mencionados
        const artigos: string[] = [];
        
        // Primeiro, pegamos o número após "Arts."
        if (multipleMatch[1]) artigos.push(multipleMatch[1]);
        
        // Depois, procuramos por todos os números que aparecem após vírgulas ou "e"
        const allNumbersPattern = /\b(\d+)[º°]?\b/g;
        let numberMatch;
        
        // Usamos uma abordagem compatível com ES5/ES6 em vez de matchAll
        while ((numberMatch = allNumbersPattern.exec(conteudo)) !== null) {
          const num = numberMatch[1];
          if (!artigos.includes(num)) {
            artigos.push(num);
          }
        }
        
        console.log('Artigos encontrados na remissão:', artigos);
        
        if (artigos.length > 1) {
          // Se encontrou múltiplos artigos, mostra um modal para escolha
          this.showArtigosChoiceModal(artigos);
        } else if (artigos.length === 1) {
          // Se encontrou apenas um artigo, navega diretamente
          this.scrollToArtigo(artigos[0], undefined, undefined, true);
        }
        
        event.preventDefault();
        return;
      }
      
      // Se não encontrou o padrão múltiplo, tenta o padrão simples "Art. X"
      const singleMatch = conteudo.match(singleArtPattern);
      if (singleMatch && singleMatch[1]) {
        this.scrollToArtigo(singleMatch[1], undefined, undefined, true);
        event.preventDefault();
        return;
      }
      
      // Último recurso: procura por qualquer número após "Art." ou "Arts."
      const allNumbers: string[] = [];
      let match;
      
      // Extrair todos os números que aparecem após "Art." ou "Arts."
      while ((match = numbersPattern.exec(conteudo)) !== null) {
        if (match[1] && !allNumbers.includes(match[1])) {
          allNumbers.push(match[1]);
        }
      }
      
      if (allNumbers.length > 0) {
        console.log('Números de artigos encontrados:', allNumbers);
        
        if (allNumbers.length > 1) {
          // Se encontrou múltiplos artigos, mostra um modal para escolha
          this.showArtigosChoiceModal(allNumbers);
        } else {
          // Se encontrou apenas um artigo, navega diretamente
          this.scrollToArtigo(allNumbers[0], undefined, undefined, true);
        }
        
        event.preventDefault();
        return;
      }

      // Fallback: pega o primeiro número isolado
      const numerosMatch = conteudo.match(/(\d+)/g);
      if (numerosMatch && numerosMatch.length > 0) {
        console.log('Números isolados encontrados:', numerosMatch);
        
        if (numerosMatch.length > 1) {
          // Se encontrou múltiplos números, mostra um modal para escolha
          this.showArtigosChoiceModal(numerosMatch);
        } else {
          // Se encontrou apenas um número, navega diretamente
          this.scrollToArtigo(numerosMatch[0], undefined, undefined, true);
        }
        
        event.preventDefault();
        return;
      }

      this.presentToast('Não foi possível identificar o artigo referenciado');
    });
  }

  // Modal para múltiplos artigos
  async showArtigosChoiceModal(artigos: string[]) {
    const alert = await this.alertController.create({
      header: 'Escolha o artigo para navegar',
      inputs: artigos.map(a => ({
        type: 'radio',
        label: `Artigo ${a}`,
        value: a
      })),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Ir',
          handler: (value) => {
            if (value) this.scrollToArtigo(value, undefined, undefined, true);
          }
        }
      ]
    });
    await alert.present();
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
    // Remover caracteres especiais como º ou ° que podem estar no número do artigo
    const artigoLimpo = artigo.replace(/[^\d]/g, '');

    // Buscar o ID do artigo no mapa
    const artigoIdReal = this.artigoNumeroParaId[artigoLimpo];
    let id = artigoIdReal ? `artigo-${artigoIdReal}` : `artigo-${artigoLimpo}`;
    
    console.log('ID do artigo:', id, 'Parágrafo:', paragrafo, 'Inciso:', inciso);
    
    // Salvar posição atual antes de buscar o artigo
    this.content.getScrollElement().then(scrollElement => {
      const currentScrollPosition = scrollElement.scrollTop;

      // Primeiro tentamos encontrar o elemento específico completo usando os dados do this.book
      let element = null;
      let foundByContent = false;
      let elementType = "artigo";
      
      if (paragrafo) elementType = "parágrafo";
      if (inciso) elementType = "inciso";
      
      // Primeiro tentar encontrar o elemento específico (parágrafo ou inciso)
      if (paragrafo || inciso) {
        element = this.findElementoEspecifico(artigoLimpo, paragrafo, inciso);
        if (element) {
          console.log(`Elemento específico encontrado para ${elementType}:`, element);
        }
      }
      
      // Se não encontrou elemento específico, busca o artigo na estrutura de dados
      if (!element) {
        const artigoObj = this.findArtigoByNumero(artigoLimpo);
        
        if (artigoObj) {
          // Se encontrou o artigo na estrutura de dados, usa o ID real
          id = `artigo-${artigoObj.id}`;
          element = document.getElementById(id);
          console.log('Artigo encontrado na estrutura de dados:', artigoObj);
          
          // Se encontrou o artigo mas estamos procurando por parágrafo/inciso específico
          if (element && (paragrafo || inciso)) {
            // Buscar o parágrafo/inciso dentro do artigo encontrado
            const elementoEspecifico = this.findElementoEspecifico(artigoLimpo, paragrafo, inciso);
            if (elementoEspecifico) {
              element = elementoEspecifico;
              console.log(`Elemento específico encontrado dentro do artigo:`, element);
            }
          }
        }
      }
      
      // Se ainda não encontrou, continua com busca normal pelo artigo
      if (!element) {
        element = document.getElementById(id);
      }
      
      // Se não encontrar pelo ID, usamos uma busca mais precisa pelo conteúdo
      if (!element) {
        const artigos = document.querySelectorAll('h5');
        let exactMatches = [];
        let possibleMatches = [];
        
        // Mapeamento de conteúdos específicos para artigos problemáticos
        const artigosEspeciais: Record<string, string> = {
          '4': 'No dia 1º de fevereiro do primeiro ano de cada legislatura',
          // Adicione outros artigos problemáticos aqui se necessário
        };
        
        // Primeiro loop: procurar por correspondências exatas
        for (let i = 0; i < artigos.length; i++) {
          const el = artigos[i];
          const texto = el.textContent || '';
          
          // Verificação para artigos especiais com conteúdo conhecido
          if (artigoLimpo in artigosEspeciais && texto.includes(artigosEspeciais[artigoLimpo])) {
            console.log(`Encontrado Artigo ${artigoLimpo} pelo conteúdo específico:`, texto.substring(0, 100));
            exactMatches = [el];
            break;
          }
          
          // Padrão para encontrar "Art. X" no início do texto
          const padraoExato = new RegExp(`^Art\\.\\s*${artigoLimpo}[º°]?\\b`, 'i');
          if (padraoExato.test(texto)) {
            exactMatches.push(el);
            console.log(`Correspondência exata encontrada para Artigo ${artigoLimpo}:`, texto.substring(0, 100));
            
            // Se também procuramos por parágrafo/inciso, damos prioridade
            if (paragrafo && (texto.includes(`§ ${paragrafo}`) || texto.includes(`§${paragrafo}`))) {
              if (inciso && (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`))) {
                // Encontrou correspondência perfeita!
                exactMatches = [el];
                break;
              } else if (!inciso) {
                // Encontrou parágrafo sem inciso
                exactMatches = [el];
                break;
              }
            }
          }
          // Padrão alternativo: contém "Art. X" em qualquer lugar
          else if (texto.match(new RegExp(`Art\\.\\s*${artigoLimpo}[º°]?\\b`, 'i'))) {
            possibleMatches.push(el);
            console.log(`Correspondência possível encontrada para Artigo ${artigoLimpo}:`, texto.substring(0, 100));
          }
          
          // Verifica por parágrafo específico
          if (paragrafo && (texto.includes(`§ ${paragrafo}`) || texto.includes(`§${paragrafo}`))) {
            possibleMatches.push(el);
            console.log(`Possível parágrafo ${paragrafo} encontrado:`, texto.substring(0, 100));
          }
          
          // Verifica por inciso específico
          if (inciso && (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`))) {
            possibleMatches.push(el);
            console.log(`Possível inciso ${inciso} encontrado:`, texto.substring(0, 100));
          }
        }
        
        // Verificação adicional para artigos que não foram encontrados
        if (exactMatches.length === 0 && artigoLimpo in artigosEspeciais) {
          // Busca mais ampla pelo conteúdo específico
          for (let i = 0; i < artigos.length; i++) {
            const el = artigos[i];
            const texto = el.textContent || '';
            
            if (texto.includes(artigosEspeciais[artigoLimpo])) {
              console.log(`Encontrado Artigo ${artigoLimpo} pelo conteúdo específico (busca ampla):`, texto.substring(0, 100));
              exactMatches = [el];
              break;
            }
          }
        }
        
        // Usa a primeira correspondência exata, ou a primeira possível se não houver exatas
        if (exactMatches.length > 0) {
          element = exactMatches[0];
          foundByContent = true;
          console.log(`Usando correspondência exata para Artigo ${artigoLimpo}:`, element.textContent?.substring(0, 100));
        } else if (possibleMatches.length > 0) {
          element = possibleMatches[0];
          foundByContent = true;
          console.log(`Usando correspondência possível para Artigo ${artigoLimpo}:`, element.textContent?.substring(0, 100));
        }
      }
      
      // Se encontrou o elemento, rola até ele e destaca
      if (element) {
        console.log(`Elemento encontrado para ${elementType} ${artigoLimpo}:`, element);
        
        // Se encontrado pelo conteúdo, adiciona um ID para facilitar futuras referências
        if (foundByContent && !element.id) {
          const idBase = `artigo-${artigoLimpo}`;
          let newId = idBase;
          
          if (paragrafo) {
            newId += `-paragrafo-${paragrafo}`;
          }
          
          if (inciso) {
            newId += `-inciso-${inciso}`;
          }
          
          newId += '-temp';
          element.id = newId;
        }
        
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
          const scrollPosition = offsetTop - (windowHeight / 2) + (elementHeight / 2) - 50;
          
          // Rolar para a posição calculada com animação suave
          this.content.scrollToPoint(0, scrollPosition, 500);
          
          // Destaque visual mais forte para parágrafos e incisos
          element.classList.add('flash-highlight');
          
          // Adicionar classe específica para o tipo de elemento
          if (paragrafo || inciso) {
            element.classList.add('elemento-especifico-highlight');
            element.classList.add('elemento-destacado'); // Nova classe para destaque persistente
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
            }, 3000);
          }, 3000);
          
          // Mostrar o indicador de retorno flutuante, se solicitado
          if (showReturnOption && this.navigationHistory.length > 1) {
            this.showReturnIndicator = true;
            
            // Limpar qualquer timeout existente
            if (this.showReturnIndicatorTimeout) {
              clearTimeout(this.showReturnIndicatorTimeout);
            }
            
            // Configurar para ocultar o indicador após 8 segundos
            this.showReturnIndicatorTimeout = setTimeout(() => {
              this.showReturnIndicator = false;
            }, 8000);
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
    const cacheKey = content + (this.query || '') + (this.searchType || '') + (this.searchBy || '');
    
    // Verificar se já temos o resultado em cache
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey)!;
    }

    let formatted = this.formatNotas(content);
    
    // Processa remissões inline (referências a artigos no texto)
    formatted = this.formatRemissoes(formatted);

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

    const result = this.sanitizer.bypassSecurityTrustHtml(formatted);
    
    // Guardar o resultado em cache
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
      // Padrão para detectar referências a artigos: "Art. X" ou "Arts. X, Y e Z"
      const artigoPattern = /\b(Art(?:s)?\.?\s+\d+[º°]?(?:(?:\s*,\s*|\s+e\s+)\d+[º°]?)*(?:\s*,\s*§\s*\d+[º°]?)?(?:\s*,\s*[IVX]+)?)/gi;
      
      // Padrão para detectar referências a parágrafos: "§ X" ou "§§ X, Y e Z"
      const paragrafoPattern = /\b(§{1,2}\s+\d+[º°]?(?:(?:\s*,\s*|\s+e\s+)\d+[º°]?)*)/gi;
      
      // Padrão para detectar referências a incisos: "inciso X" ou "incisos X, Y e Z"
      const incisoPattern = /\b(inciso[s]?\s+[IVX]+(?:(?:\s*,\s*|\s+e\s+)[IVX]+)*)/gi;
      
      // Padrão para detectar referências combinadas: "Art. X, § Y, inciso Z"
      const combinedPattern = /\b(Art\.?\s+\d+[º°]?(?:\s*,\s*§\s*\d+[º°]?)?(?:\s*,\s*(?:inciso\s+)?[IVX]+)?)/gi;
      
      // Função para substituir com marcação HTML
      const replaceWithLink = (match: string, p1: string): string => {
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
          
          // Log para depuração
          console.log(`Remissão "${match}" parseada:`, {
            artigos,
            paragrafos,
            incisos
          });
        } else {
          // Tentar extrair manualmente
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
        const dataAtributos = `
          data-remissao-id="${remissaoId}"
          ${dataArtigos ? `data-artigos="${dataArtigos}"` : ''}
          ${dataParagrafos ? `data-paragrafos="${dataParagrafos}"` : ''}
          ${dataIncisos ? `data-incisos="${dataIncisos}"` : ''}
        `;
        
        // Determinar se a remissão está dentro de parênteses
        const isInParentheses = /\([^)]*$/.test(formattedContent.substring(0, formattedContent.indexOf(match))) && 
                               /^[^(]*\)/.test(formattedContent.substring(formattedContent.indexOf(match) + match.length));
        
        // Adicionar classe especial para remissões dentro de parênteses
        const extraClass = isInParentheses ? 'remissao-parentese' : '';
        
        // Retorna o HTML com a classe remissao-inline
        return `<span class="remissao-inline ${extraClass}" role="link" tabindex="0" ${dataAtributos.trim()}>${match}</span>`;
      };

      // Aplicar substituições
      formattedContent = formattedContent
        .replace(combinedPattern, replaceWithLink)
        .replace(artigoPattern, replaceWithLink)
        .replace(paragrafoPattern, replaceWithLink)
        .replace(incisoPattern, replaceWithLink);

      // Adicionar ao cache
      this.remissoesCache.set(content, formattedContent);
    } catch (error) {
      console.error('Erro ao formatar remissões:', error);
    }

    return formattedContent;
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
          
          // Processar padrões de artigo
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
    
    // Padrão para remissões complexas com múltiplos artigos e possível inciso
    // Ex: "Arts. 4º, 5º e 65, I"
    const multipleArtsWithIncisoPattern = /Arts?\.?\s*(\d+)[º°]?(?:\s*,\s*(\d+)[º°]?)*(?:\s*e\s*(\d+)[º°]?)?(?:\s*,\s*([IVX]+))?/i;
    
    // Padrão para remissão de artigo com parágrafo e inciso
    // Ex: "art. 231, § 8º, I"
    const artigoComParagrafoIncisoPattern = /Art\.?\s*(\d+)[º°]?(?:\s*,\s*§\s*(\d+)[º°]?)?(?:\s*,\s*([IVX]+))?/gi;
    
    // Padrão para remissão de artigo com parágrafo
    // Ex: "Art. 2º, § 2º"
    const artigoComParagrafoPattern = /Art\.?\s*(\d+)[º°]?(?:\s*,\s*§\s*(\d+)[º°]?)/gi;
    
    // Padrão para artigos separados por ponto e vírgula
    // Ex: "Art. 2º, § 2º; art. 65, I"
    const multipleRemissoesPattern = /([^;]+)/g;
    
    // Verificar se há múltiplas remissões separadas por ponto e vírgula
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
    
    // Verificar o padrão de múltiplos artigos com possível inciso (Arts. 4º, 5º e 65, I)
    const multipleMatch = textoProcessado.match(multipleArtsWithIncisoPattern);
    if (multipleMatch) {
      console.log('Encontrou padrão de múltiplos artigos:', multipleMatch);
      
      // Extrair todos os números de artigos mencionados
      const artigos: string[] = [];
      const allNumbersPattern = /\b(\d+)[º°]?\b/g;
      let numberMatch;
      
      while ((numberMatch = allNumbersPattern.exec(textoProcessado)) !== null) {
        const num = numberMatch[1];
        if (!artigos.includes(num)) {
          artigos.push(num);
        }
      }
      
      console.log('Artigos extraídos:', artigos);
      
      // Verificar se há inciso mencionado (formato romano)
      const incisoPattern = /,\s*([IVX]+)\b/i;
      const incisoMatch = textoProcessado.match(incisoPattern);
      const inciso = incisoMatch ? incisoMatch[1] : undefined;
      
      console.log('Inciso encontrado:', inciso);
      
      // Adicionar cada artigo como um destino separado
      for (const artigo of artigos) {
        resultados.push({
          artigo,
          inciso,
          origem: {
            text: conteudo
          }
        });
      }
      
      return resultados;
    }
    
    // Resetar o regex lastIndex
    artigoComParagrafoIncisoPattern.lastIndex = 0;
    
    // Processar padrões de artigo com parágrafo e inciso (art. 231, § 8º, I)
    let match;
    while ((match = artigoComParagrafoIncisoPattern.exec(textoProcessado)) !== null) {
      const artigo = match[1];
      const paragrafo = match[2];
      const inciso = match[3];
      
      console.log(`Encontrado artigo ${artigo}, parágrafo ${paragrafo}, inciso ${inciso}`);
      
      resultados.push({
        artigo,
        paragrafo,
        inciso,
        origem: {
          text: match[0]
        }
      });
    }
    
    // Se encontrou resultados com o padrão específico, retorna
    if (resultados.length > 0) {
      console.log('Destinos de remissão encontrados com padrão específico:', resultados);
      return resultados;
    }
    
    // Resetar o regex lastIndex
    artigoComParagrafoPattern.lastIndex = 0;
    
    // Processar padrões de artigo com parágrafo (Art. 2º, § 2º)
    while ((match = artigoComParagrafoPattern.exec(textoProcessado)) !== null) {
      const artigo = match[1];
      const paragrafo = match[2];
      
      console.log(`Encontrado artigo ${artigo}, parágrafo ${paragrafo}`);
      
      resultados.push({
        artigo,
        paragrafo,
        origem: {
          text: match[0]
        }
      });
    }
    
    // Se ainda não encontrou nada, tenta um padrão mais simples para artigos
    if (resultados.length === 0) {
      const artigoSimples = /Art\.?\s*(\d+)[º°]?/gi;
      while ((match = artigoSimples.exec(textoProcessado)) !== null) {
        const artigo = match[1];
        
        console.log(`Encontrado artigo simples ${artigo}`);
        
        resultados.push({
          artigo,
          origem: {
            text: match[0]
          }
        });
      }
    }
    
    // Último recurso: procura por qualquer número
    if (resultados.length === 0) {
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
    
    // Primeiro tentamos encontrar o elemento pelo ID
    let seletorId = `artigo-${artigoId}`;
    
    // Construir seletores específicos baseados nos parâmetros
    if (paragrafo && inciso) {
      // Tenta encontrar o elemento mais específico primeiro (artigo + parágrafo + inciso)
      const seletorCompleto = `#artigo-${artigoId}-paragrafo-${paragrafo}-inciso-${inciso}`;
      const elementoCompleto = document.querySelector(seletorCompleto);
      if (elementoCompleto) {
        console.log(`Elemento encontrado pelo seletor específico: ${seletorCompleto}`);
        return elementoCompleto as HTMLElement;
      }
      
      // Se não encontrou, tenta só com parágrafo
      seletorId = `artigo-${artigoId}-paragrafo-${paragrafo}`;
    } else if (paragrafo) {
      seletorId = `artigo-${artigoId}-paragrafo-${paragrafo}`;
    } else if (inciso) {
      seletorId = `artigo-${artigoId}-inciso-${inciso}`;
    }
    
    // Tenta pelo ID construído
    const elementoPorId = document.getElementById(seletorId);
    if (elementoPorId) {
      console.log(`Elemento encontrado pelo ID: ${seletorId}`);
      return elementoPorId;
    }
    
    // Se não encontrou pelo ID, busca na estrutura de dados
    const artigoObj = this.findArtigoByNumero(artigoId);
    if (artigoObj) {
      console.log('Artigo encontrado na estrutura de dados:', artigoObj);
      
      // Tenta encontrar o elemento pelo ID do artigo encontrado
      const artigoElement = document.getElementById(`artigo-${artigoObj.id}`);
      if (artigoElement) {
        // Se não estamos procurando por parágrafo ou inciso específico, retorna o artigo
        if (!paragrafo && !inciso) {
          return artigoElement;
        }
        
        // Caso contrário, busca pelo parágrafo/inciso dentro do artigo
        if (paragrafo || inciso) {
          // Busca todos os elementos h5 dentro do artigo e seus irmãos
          const paragrafos = artigoElement.parentElement?.querySelectorAll('h5') || [];
          
          for (let i = 0; i < paragrafos.length; i++) {
            const texto = paragrafos[i].textContent || '';
            
            // Verifica se o parágrafo contém a referência ao parágrafo específico
            if (paragrafo && (texto.includes(`§ ${paragrafo}`) || texto.includes(`§${paragrafo}`))) {
              if (inciso) {
                // Se também busca por inciso, verifica se esse parágrafo contém o inciso
                if (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`)) {
                  console.log(`Encontrado parágrafo ${paragrafo} com inciso ${inciso}`);
                  return paragrafos[i];
                }
              } else {
                console.log(`Encontrado parágrafo ${paragrafo}`);
                return paragrafos[i];
              }
            }
            // Se busca apenas inciso
            else if (inciso && !paragrafo && (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`))) {
              console.log(`Encontrado inciso ${inciso}`);
              return paragrafos[i];
            }
          }
        }
      }
    }
    
    // Busca o artigo pelo seletor genérico
    const artigoElement = document.getElementById(`artigo-${artigoId}`);
    if (!artigoElement) {
      console.log(`Elemento não encontrado para artigo ${artigoId}`);
      return null;
    }
    
    if (paragrafo || inciso) {
      // Se tem parágrafo ou inciso, busca no conteúdo
      const paragrafos = artigoElement.parentElement?.querySelectorAll('h5') || [];
      
      for (let i = 0; i < paragrafos.length; i++) {
        const texto = paragrafos[i].textContent || '';
        
        // Verifica se o parágrafo contém a referência ao parágrafo específico
        if (paragrafo && (texto.includes(`§ ${paragrafo}`) || texto.includes(`§${paragrafo}`))) {
          if (inciso) {
            // Se também busca por inciso, verifica se esse parágrafo contém o inciso
            if (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`)) {
              return paragrafos[i];
            }
          } else {
            return paragrafos[i];
          }
        }
        // Se busca apenas inciso
        else if (inciso && (texto.includes(`${inciso} –`) || texto.includes(`${inciso} -`) || texto.includes(`${inciso}-`))) {
          return paragrafos[i];
        }
      }
    }
    
    return artigoElement; // Retorna o artigo se não encontrou específico
  }

  // Modal para escolha de destino complexo (artigo, parágrafo, inciso)
  async showDestinationChoiceModal(destinos: RemissaoDestino[]) {
    const alert = await this.alertController.create({
      header: 'Escolha o destino para navegar',
      inputs: destinos.map((destino, index) => {
        let label = `Art. ${destino.artigo}`;
        if (destino.paragrafo) {
          label += `, § ${destino.paragrafo}`;
        }
        if (destino.inciso) {
          label += `, ${destino.inciso}`;
        }
        if (destino.origem?.text) {
          label += ` (${destino.origem.text})`;
        }
        
        return {
          type: 'radio',
          label: label,
          value: index.toString()
        };
      }),
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
}
