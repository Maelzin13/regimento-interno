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

  // Propriedade para o debounce da rolagem
  private scrollDebounceTimeout: any;
  expandedComments: Set<string> = new Set();
  
  private notasCache: Map<number, any> = new Map()
  // private handleRemissaoClick: any;

  // Adicionar propriedades para histórico de navegação
  navigationHistory: { artigoId: string, scrollPosition: number }[] = [];
  currentHistoryIndex: number = -1;
  private remissaoListenerAttached = false;
  private handleRemissaoClick: any;

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

  ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
    this.bookId = this.route.snapshot.paramMap.get('id');
    this.loadSearchHistory();

    this.bookService
      .getBookById(this.bookId)
      .then((books: any) => {
        this.book = books.livro;
        this.primeiroParagrafo = books.primeiro.conteudo;
      })
      .catch((error) => {
        console.error('Erro ao carregar os livros:', error);
      });
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
    if (!this.notaListenerAttached) {
      this.listenNotaClicks();
      this.notaListenerAttached = true;
    }
    
    if (!this.remissaoListenerAttached) {
      this.setupRemissaoLinks();
      this.remissaoListenerAttached = true;
    }
  
    this.setupScrollListener();
  }

  setupRemissaoLinks() {
    // Remove o antigo listener para evitar duplicação
    document.removeEventListener('click', this.handleRemissaoClick as any);

    this.handleRemissaoClick = (event: any) => {
      const target = event.target as HTMLElement;
      // A remissão pode estar em qualquer nível dentro do .remissoes
      const remissaoElement = target.closest('.remissoes') as HTMLElement;
      if (remissaoElement) {
        // Feedback visual no clique
        remissaoElement.classList.add('flash-highlight');
        setTimeout(() => remissaoElement.classList.remove('flash-highlight'), 600);
        this.handleRemissaoContent(remissaoElement, event);
        event.preventDefault();
      }
    };

    document.addEventListener('click', this.handleRemissaoClick as any);
    console.log('Setup de remissão concluído. Estado do histórico:', this.navigationHistory);
  }

  handleRemissaoContent(remissaoElement: HTMLElement, event: Event) {
    const conteudo = remissaoElement.innerText || remissaoElement.textContent || '';
    console.log('Conteúdo da remissão:', conteudo);

    // Salva posição antes de navegar
    this.content.getScrollElement().then(scrollElement => {
      const currentPosition = scrollElement.scrollTop;
      this.saveToHistory(null, currentPosition);

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
          this.scrollToArtigo(artigos[0]);
        }
        
        event.preventDefault();
        return;
      }
      
      // Se não encontrou o padrão múltiplo, tenta o padrão simples "Art. X"
      const singleMatch = conteudo.match(singleArtPattern);
      if (singleMatch && singleMatch[1]) {
        this.scrollToArtigo(singleMatch[1]);
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
          this.scrollToArtigo(allNumbers[0]);
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
          this.scrollToArtigo(numerosMatch[0]);
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
            if (value) this.scrollToArtigo(value);
          }
        }
      ]
    });
    await alert.present();
  }

  saveToHistory(artigoId: string | null, scrollPosition: number) {
    // Se estamos navegando a partir de um ponto intermediário do histórico,
    // descartar tudo o que vem depois
    if (this.currentHistoryIndex < this.navigationHistory.length - 1) {
      this.navigationHistory = this.navigationHistory.slice(0, this.currentHistoryIndex + 1);
    }
    
    // Adicionar nova entrada ao histórico
    this.navigationHistory.push({
      artigoId: artigoId || 'unknown',
      scrollPosition: scrollPosition
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
    } else {
      console.log('Não há posição anterior no histórico');
    }
  }

  scrollToArtigo(artigo: string, inciso?: string) {
    // Remover caracteres especiais como º ou ° que podem estar no número do artigo
    const artigoLimpo = artigo.replace(/[^\d]/g, '');
    
    console.log(`Tentando encontrar o Artigo ${artigoLimpo}`);
    
    // Salvar a posição atual antes de navegar
    this.content.getScrollElement().then(scrollElement => {
      const currentPosition = scrollElement.scrollTop;
      
      // Primeiro tentamos encontrar pelo ID exato
      let id = 'artigo-' + artigoLimpo;
      if (inciso) {
        id += '-inciso-' + inciso;
      }
      
      let element = document.getElementById(id);
      let foundByContent = false;
      
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
          }
          // Padrão alternativo: contém "Art. X" em qualquer lugar
          else if (texto.match(new RegExp(`Art\\.\\s*${artigoLimpo}[º°]?\\b`, 'i'))) {
            possibleMatches.push(el);
            console.log(`Correspondência possível encontrada para Artigo ${artigoLimpo}:`, texto.substring(0, 100));
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
        console.log(`Elemento encontrado para Artigo ${artigoLimpo}:`, element);
        
        // Se encontrado pelo conteúdo, adiciona um ID para facilitar futuras referências
        if (foundByContent && !element.id) {
          element.id = `artigo-${artigoLimpo}-temp`;
        }
        
        // Atribuir um índice ao elemento para identificação no DOM
        const allElements = document.querySelectorAll('h5');
        let elementIndex = -1;
        for (let i = 0; i < allElements.length; i++) {
          if (allElements[i] === element) {
            elementIndex = i;
            break;
          }
        }
        console.log(`Índice do elemento no DOM: ${elementIndex}`);
        
        // Garantir que o elemento está visível na página
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Ajusta a posição para considerar o header
        setTimeout(() => {
          // Usar getBoundingClientRect para obter a posição atual do elemento
          const rect = element.getBoundingClientRect();
          const offsetTop = rect.top + window.pageYOffset - 120;
          
          this.content.scrollToPoint(0, offsetTop, 500);
          
          // Salvar o artigo no histórico
          this.saveToHistory(artigoLimpo, currentPosition);
        }, 100);
        
        // Destaque visual
        element.classList.add('flash-highlight');
        setTimeout(() => element.classList.remove('flash-highlight'), 1500);
        
        // Feedback visual para o usuário
        this.presentToast(`Navegando para o Artigo ${artigoLimpo}`);
      } else {
        // Se não encontrou o elemento, tenta uma busca mais ampla pelo conteúdo
        console.log(`Elemento para Artigo ${artigoLimpo} não foi encontrado. Tentando busca mais ampla...`);
        
        // Busca por qualquer menção ao número do artigo
        const allElements = document.querySelectorAll('h5, p');
        let foundElement = null;
        
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          const texto = el.textContent || '';
          
          if (texto.includes(`Art. ${artigoLimpo}`) || 
              texto.includes(`Art.${artigoLimpo}`) || 
              texto.includes(`Artigo ${artigoLimpo}`)) {
            foundElement = el;
            console.log(`Encontrada menção ao Artigo ${artigoLimpo} em:`, texto.substring(0, 100));
            break;
          }
        }
        
        if (foundElement) {
          foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          setTimeout(() => {
            // Usar getBoundingClientRect para obter a posição atual do elemento
            const rect = foundElement.getBoundingClientRect();
            const offsetTop = rect.top + window.pageYOffset - 120;
            
            this.content.scrollToPoint(0, offsetTop, 500);
            this.saveToHistory(artigoLimpo, currentPosition);
          }, 100);
          
          foundElement.classList.add('flash-highlight');
          setTimeout(() => foundElement.classList.remove('flash-highlight'), 1500);
          
          this.presentToast(`Navegando para menção ao Artigo ${artigoLimpo}`);
        } else {
          this.presentToast(`Artigo ${artigoLimpo} não encontrado`);
          console.log(`Elemento para Artigo ${artigoLimpo} não foi encontrado após busca ampla`);
        }
      }
    });
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
    
    const processAndSanitize = (str: string) => this.sanitizer.bypassSecurityTrustHtml(this.formatNotas(str));
  
    const colonIndex = content.indexOf(':');
    if (colonIndex === -1) {
      return processAndSanitize(content);
    }
  
    const beforeColon = content.substring(0, colonIndex + 1);
    const afterColon = content.substring(colonIndex + 1);
  
    if (!this.isCommentExpanded(commentId)) {
      const processedContent = `<strong>${beforeColon}</strong><a class="ver-mais" (click)="toggleComment('${commentId}')">Ver mais</a>`;
      return processAndSanitize(processedContent);
    }
  
    const processedContent = `<strong>${beforeColon}</strong>${afterColon}<a class="ver-menos" (click)="toggleComment('${commentId}')">Ver menos</a>`;
    return processAndSanitize(processedContent);
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
}
