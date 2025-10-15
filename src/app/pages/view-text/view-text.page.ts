import { ModalPage } from '../modal/modal.page';
import { ActivatedRoute } from '@angular/router';
import { UserModel } from 'src/app/models/userModel';
import { BookService } from 'src/app/services/book.service';
import { AuthService } from 'src/app/services/auth.service';
import { StorageService } from 'src/app/services/storage.service';
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
  allCommentsExpanded = true;
  lastScrollPosition: number = 0;
  currentResultIndex: number = -1;
  currentHistoryIndex: number = -1;
  showReturnIndicator: boolean = false;
  navigationHistory: HistoryEntry[] = [];
  expandedComments: Set<string> = new Set();
  searchBy: 'keyword' | 'artigo' = 'keyword';
  searchType: 'contains' | 'exact' = 'contains';
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild('searchInput') searchInput!: ElementRef;
  
  private scrollDebounceTimeout: any;
  private searchDebounceTimeout: any;
  private notasCache: Map<number, any> = new Map()
  private handleRemissaoClick: any;
  private showReturnIndicatorTimeout: any;
  private articleQueryNumero: string | null = null;
  private contentCache = new Map<string, SafeHtml>();
  private remissoesCache = new Map<string, string>();
  private comentarioCache = new Map<string, SafeHtml>();
  private elementosCache: Map<string, HTMLElement | null> = new Map();
  private artigoByNumero = new Map<string, { id: number; ref: any }>();
  private quadrosCache = new Map<string, any>();

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private storage: StorageService,
    private authService: AuthService,
    private bookService: BookService,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  async ngOnInit() {
    const user = await this.authService.getUser();
    this.user = user;
    this.bookId = this.route.snapshot.paramMap.get('id');
    await this.loadSearchHistory();
    await this.loadBook();
  }

  async loadBook() {
    const loader = await this.loadingController.create({
      message: 'Carregando regimento...',
      spinner: 'circles',
      cssClass: 'loading-regimento'
    });
    try {
      await loader.present();

      // Aqui NÃO limpe this.book, mantenha o anterior!
      // Só limpa caches internos, se quiser
      this.contentCache.clear();
      this.elementosCache.clear();
      this.remissoesCache.clear();

      let Allbooks: any = null;
      Allbooks = await this.bookService.getBookById(this.bookId);
      
      this.book = Allbooks.livro;
      this.buildIndices();
      this.processRemissoes();
      this.processQuadros(Allbooks.quadros);
      
      // Otimizar performance
      this.optimizePerformance();
      this.primeiroParagrafo = Allbooks.primeiro?.conteudo ?? ''
      

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
      loader.dismiss();
    }
  }

  clearSearch() {
    // Limpar timeout de debounce se existir
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
      this.searchDebounceTimeout = null;
    }
    
    this.query = '';
    this.articleQueryNumero = null;
    this.filteredBook = null;
    this.searchResults = [];
    this.totalResults = 0;
    this.currentResultIndex = -1;
    this.isSearching = false;
    this.forceClearHighlights();
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
  }
  
  
  private buildIndices(): void {
    this.artigoByNumero.clear();
    const book = this.book;
    if (!book?.titulos) return;
  
    for (const titulo of book.titulos) {
      for (const capitulo of titulo.capitulos || []) {
        for (const secao of capitulo.secaos || []) {
          for (const artigo of secao.artigos || []) {
            const numeroNorm = this.normalizeNumero(artigo?.numero);
            if (numeroNorm) this.artigoByNumero.set(numeroNorm, { id: artigo.id, ref: artigo });
          }
        }
      }
    }
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

  // Utils: cria um <mark> sem quebrar estrutura
  private highlightHtmlSafe(html: string, query: string, wholeWord: boolean): string {
    if (!html || !query) return html;

    // 1) Parseia para DOM independente
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement;
    if (!root) return html;

    // 2) Prepara regex (sem mexer em atributos)
    const escaped = this.escapeRegExp(query);
    const pattern = wholeWord ? new RegExp(`\\b${escaped}\\b`, 'gi') : new RegExp(escaped, 'gi');

    // 3) Caminha só por TEXT NODES
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: any) => {
        // ignora nós vazios e espaços
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        // evita marcar dentro de <script>, <style> etc.
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style'].includes(tag)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    } as any);

    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    // 4) Para cada text node, troca por fragmento com <mark>
    for (const textNode of textNodes) {
      const text = textNode.nodeValue || '';
      if (!pattern.test(text)) { pattern.lastIndex = 0; continue; }

      pattern.lastIndex = 0;
      const frag = doc.createDocumentFragment();
      let lastIdx = 0;
      let m: RegExpExecArray | null;

      while ((m = pattern.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;

        // trecho antes
        if (start > lastIdx) frag.append(text.substring(lastIdx, start));

        // o match
        const mark = doc.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = m[0];
        frag.append(mark);

        lastIdx = end;
      }
      // resto
      if (lastIdx < text.length) frag.append(text.substring(lastIdx));

      // swap
      textNode.replaceWith(frag);
    }

    return root.innerHTML;
  }

  private checkArtigoMatchByContent(artigoContent: string, q: string): boolean {
    if (!artigoContent || !q) return false;
    const re = new RegExp(`\\bArt\\.?\\s*${this.escapeRegExp(q)}[º°]?\\b`, 'i');
    return re.test(artigoContent);
  }

  async search() {
    if (!this.query || !this.book) { this.clearSearch(); return; }
    
    // Limpar timeout anterior se existir
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }
    
    // Implementar debounce de 300ms para melhorar performance em dispositivos móveis
    this.searchDebounceTimeout = setTimeout(async () => {
      await this.executeSearch();
    }, 300);
  }

  async executeSearch() {
    if (!this.query || !this.book) { this.clearSearch(); return; }
    this.isSearching = true;
    this.saveCurrentPosition();
    this.filteredBook = null;         // mantém árvore inteira visível
    this.searchResults = [];
    this.totalResults = 0;
  
    if (this.searchBy === 'keyword') {
      await this.runKeywordSearch(this.query, this.searchType);
      return;
    }
  
    if (this.searchBy === 'artigo') {
      await this.runArticleSearch(this.query);
      return;
    }
  
    this.isSearching = false;
  }

  /** Busca por palavra-chave: coleta resultados de todos os tipos de conteúdo */
  private async runKeywordSearch(query: string, searchType: 'contains' | 'exact') {
    const q = query.toLowerCase().trim();
    let totalOccurrences = 0;

    const add = (type: string, node: any, path: string, content?: string) => {
      const text = content || node.conteudo;
      const occurrences = this.countOccurrences(text, q, searchType);
      totalOccurrences += occurrences;
      
      this.searchResults.push({ 
        type, 
        id: node.id, 
        content: text, 
        path, 
        position: node.id || 0,
        occurrences: occurrences
      });
    };

    for (const titulo of this.book.titulos || []) {
      // Buscar em títulos
      if (this.matchesText(titulo.conteudo, q, searchType)) {
        add('titulo', titulo, titulo.conteudo);
      }

      for (const capitulo of titulo.capitulos || []) {
        // Buscar em capítulos
        if (this.matchesText(capitulo.conteudo, q, searchType)) {
          add('capitulo', capitulo, `${titulo.conteudo} > ${capitulo.conteudo}`);
        }

        for (const secao of capitulo.secaos || []) {
          // Buscar em seções
          if (this.matchesText(secao.conteudo, q, searchType)) {
            add('secao', secao, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo}`);
          }

          for (const artigo of secao.artigos || []) {
            // Buscar em artigos
            if (this.matchesText(artigo.conteudo, q, searchType)) {
              add('artigo', artigo, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo}`);
            }

            for (const p of artigo.paragrafos || []) {
              // Buscar em parágrafos
              if (this.matchesText(p.conteudo, q, searchType)) {
                add('paragrafo', p, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > ${p.conteudo}`);
              }

              // Buscar em comentários
              for (const comentario of p.comentarios || []) {
                if (this.matchesText(comentario.conteudo, q, searchType)) {
                  add('comentario', comentario, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Comentário`, comentario.conteudo);
                }
              }

              // Buscar em remissões
              for (const remissao of p.remissoes || []) {
                if (this.matchesText(remissao.conteudo, q, searchType)) {
                  add('remissao', remissao, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Remissão`, remissao.conteudo);
                }
              }

              // Buscar em quadros associados aos comentários
              for (const comentario of p.comentarios || []) {
                const quadrosComentario = this.getQuadrosAssociados('comentario', comentario.id);
                
                for (const quadro of quadrosComentario) {
                  
                  if (this.matchesText(quadro.titulo, q, searchType)) {
                    add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                  }
                  // Buscar em headers dos quadros
                  if (quadro.dados?.header) {
                    for (const header of quadro.dados.header) {
                      if (this.matchesText(header, q, searchType)) {
                        add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                      }
                    }
                  }
                  // Buscar em rows dos quadros
                  if (quadro.dados?.rows) {
                    for (const row of quadro.dados.rows) {
                      for (const cell of row) {
                        if (this.matchesText(cell, q, searchType)) {
                          add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                        }
                      }
                    }
                  }
                }
              }

              // Buscar em quadros associados aos parágrafos
              const quadrosParagrafo = this.getQuadrosAssociados('paragrafo', p.id);
              
              for (const quadro of quadrosParagrafo) {
                
                if (this.matchesText(quadro.titulo, q, searchType)) {
                  add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                }
                // Buscar em headers dos quadros
                if (quadro.dados?.header) {
                  for (const header of quadro.dados.header) {
                    if (this.matchesText(header, q, searchType)) {
                      add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                    }
                  }
                }
                // Buscar em rows dos quadros
                if (quadro.dados?.rows) {
                  for (const row of quadro.dados.rows) {
                    for (const cell of row) {
                      if (this.matchesText(cell, q, searchType)) {
                        add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                      }
                    }
                  }
                }
              }

              // Buscar em quadros associados às remissões
              for (const remissao of p.remissoes || []) {
                const quadrosRemissao = this.getQuadrosAssociados('remissao', remissao.id);
                
                for (const quadro of quadrosRemissao) {
                  
                  if (this.matchesText(quadro.titulo, q, searchType)) {
                    add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                  }
                  // Buscar em headers dos quadros
                  if (quadro.dados?.header) {
                    for (const header of quadro.dados.header) {
                      if (this.matchesText(header, q, searchType)) {
                        add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                      }
                    }
                  }
                  // Buscar em rows dos quadros
                  if (quadro.dados?.rows) {
                    for (const row of quadro.dados.rows) {
                      for (const cell of row) {
                        if (this.matchesText(cell, q, searchType)) {
                          add('quadro', quadro, `${titulo.conteudo} > ${capitulo.conteudo} > ${secao.conteudo} > ${artigo.conteudo} > Quadro`, quadro.titulo);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    this.sortSearchResults();
    this.totalResults = totalOccurrences; // Usar o total de ocorrências em vez do número de elementos
    this.isSearching = false;

    // força re-render para aplicar destaque apenas em keyword
    this.contentCache.clear();

    if (this.totalResults > 0) {
      this.currentResultIndex = 0;
      this.navigateToResult(0);
      this.presentToast(`Encontrados ${this.totalResults} resultados para "${query}"`);
      setTimeout(() => this.forceHighlightsRefresh(), 250);
    } else {
      this.presentToast(`Nenhum resultado encontrado para "${query}"`);
    }
  }

  /** Busca por artigo: usa o índice por numero e apenas rola+flash (sem highlight global) */
  private async runArticleSearch(rawQuery: string) {
    const numero = this.normalizeQueryNumero(rawQuery);
    this.isSearching = false;
  
    if (!numero) { this.presentToast('Informe o número do artigo.'); return; }
  
    // guarda o contexto para o highlight e força re-render
    this.articleQueryNumero = numero;
    this.contentCache.clear();
  
    this.forceClearHighlights();
  
    const alvo = this.findArtigoByNumero(numero);
    if (!alvo) { this.presentToast(`Artigo ${numero} não encontrado`); return; }
  
    this.searchResults = [{ type: 'artigo', id: alvo.id, content: '', path: '', position: alvo.id }];
    this.totalResults = 1; this.currentResultIndex = 0;
  
    this.scrollToArtigo(numero, undefined, undefined, false);
  
    // dá um “tapinha” para garantir o estilo do <mark>
    setTimeout(() => this.forceHighlightsRefresh(), 250);
  }  

  private matchesText(text: string, queryLower: string, searchType: 'contains' | 'exact'): boolean {
    if (!text) return false;
    const textLower = text.toLowerCase();
    if (searchType === 'exact') {
      const normalizedText = this.normalizeText(textLower);
      const normalizedQuery = this.normalizeText(queryLower);
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(normalizedQuery)}\\b`, 'i');
      const result = wordBoundaryRegex.test(normalizedText);
      return result;
    }
    
    const result = textLower.includes(queryLower);
    
    return result;
  }

  private countOccurrences(text: string, queryLower: string, searchType: 'contains' | 'exact'): number {
    if (!text) return 0;
    const textLower = text.toLowerCase();
    
    if (searchType === 'exact') {
      const normalizedText = this.normalizeText(textLower);
      const normalizedQuery = this.normalizeText(queryLower);
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(normalizedQuery)}\\b`, 'gi');
      const matches = normalizedText.match(wordBoundaryRegex);
      const count = matches ? matches.length : 0;
      
      return count;
    } else {
      // Para busca "contains", contar todas as ocorrências (incluindo dentro de palavras)
      const regex = new RegExp(this.escapeRegExp(queryLower), 'gi');
      const matches = textLower.match(regex);
      const count = matches ? matches.length : 0;
      return count;
    }
  }

  // Função para ordenar os resultados de forma mais lógica
  private sortSearchResults() {
    // Ordenar por prioridade de tipo e depois por posição no documento
    this.searchResults.sort((a, b) => {
      // Definir prioridade dos tipos (menor número = maior prioridade)
      const typePriority: { [key: string]: number } = {
        'titulo': 1,
        'capitulo': 2,
        'secao': 3,
        'artigo': 4,
        'paragrafo': 5,
        'comentario': 6,
        'remissao': 7,
        'quadro': 8
      };

      const priorityA = typePriority[a.type] || 999;
      const priorityB = typePriority[b.type] || 999;

      // Primeiro ordenar por prioridade de tipo
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Se são do mesmo tipo, ordenar por posição no documento
      const posA = a.position || a.id || 0;
      const posB = b.position || b.id || 0;

      return posA - posB;
    });
  }

  // Método auxiliar para normalizar texto (remover acentos e caracteres especiais)
  private normalizeText(text: string): string {
    const result = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
    return result;
  }

  private normalizeNumero(n: string | undefined | null): string {
    return (n ?? '')
      .toString()
      .trim()
      .replace(/[º°]/g, '')
      .replace(/\s+/g, '')
      .toUpperCase();
  }
  
  private normalizeQueryNumero(q: string): string {
    return this.normalizeNumero(
      q
        .replace(/^(art\.?|artigo|arts\.?|artigos)\s*/i, '')
        .replace(/[^\da-zA-Z-]/g, '')
    );
  }

  highlightAndSanitize(text: string): SafeHtml {
    const cacheKey = `${text}_${this.query}_${this.searchType}_${this.searchBy}_${this.articleQueryNumero ?? ''}`;
    if (this.contentCache.has(cacheKey)) return this.contentCache.get(cacheKey)!;
  
    let html = this.formatNotas(text);
    html = this.processInlineRemissoes(html);
  
    if (this.query?.trim()) {
      if (this.searchBy === 'keyword') {
        const wholeWord = this.searchType === 'exact';
        html = this.highlightHtmlSafe(html, this.query.trim(), wholeWord);
      } else if (this.searchBy === 'artigo' && this.articleQueryNumero) {
        // Destaca apenas rótulos de artigo: Art. 132 / Artigo 132 / Arts. 132 / Artigos 132
        const num = this.articleQueryNumero.replace(/[º°]/g, '');
        const rx = new RegExp(`\\b(?:Art\\.?|Artigo|Arts\\.?|Artigos)\\s*${this.escapeRegExp(num)}[º°]?\\b`, 'gi');
        html = this.highlightHtmlSafeRegex(html, rx);
      }
    }
  
    const safe = this.sanitizer.bypassSecurityTrustHtml(html);
    this.contentCache.set(cacheKey, safe);
    return safe;
  }  
  /** Aplica <mark> usando um RegExp global/ignorando caixa, caminhando só por TextNodes */
  private highlightHtmlSafeRegex(html: string, pattern: RegExp): string {
    if (!html || !pattern) return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement;
    if (!root) return html;

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: any) => {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement; if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName.toLowerCase();
        if (['script', 'style'].includes(tag)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    } as any);

    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    for (const textNode of textNodes) {
      const text = textNode.nodeValue || '';
      pattern.lastIndex = 0;
      if (!pattern.test(text)) continue;

      pattern.lastIndex = 0;
      const frag = doc.createDocumentFragment();
      let lastIdx = 0;
      let m: RegExpExecArray | null;

      while ((m = pattern.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (start > lastIdx) frag.append(text.substring(lastIdx, start));

        const mark = doc.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = m[0];
        frag.append(mark);

        lastIdx = end;
        if (pattern.lastIndex === m.index) pattern.lastIndex++; // evita loop com grupos vazios
      }
      if (lastIdx < text.length) frag.append(text.substring(lastIdx));
      textNode.replaceWith(frag);
    }

    return root.innerHTML;
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

  openExternalLink(url: string) {
    window.open(url, '_blank');
  }

  handleRemissaoContent(remissaoElement: HTMLElement, event: Event) {
    const conteudo = remissaoElement.textContent || '';
    const remissaoId = remissaoElement.getAttribute('data-remissao-id');
    const remissaoType = remissaoElement.getAttribute('data-remissao-type');

    // Verificação rápida: se não começa com "Art.", ignora
    if (!conteudo.trim().startsWith('Art')) {
      return;
    }

    // Salva posição antes de navegar
    this.content.getScrollElement().then(scrollElement => {
      const currentPosition = scrollElement.scrollTop;

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
    const key = this.normalizeNumero(numeroArtigo);
    const hit = this.artigoByNumero.get(key);
    return hit?.ref ?? null;
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
      return '';
    }
    const notaRegex = /###nota\s*(\d+)\s*###/gi;
    return content.replace(notaRegex, (_, num) => {
      return `
        <sup
          class="nota-ref"
          data-nota-id="${num}"
          role="link"
          tabindex="0"
          style="
            margin: 0 3px;
            color: #007bff;
            line-height: 1.71;
            cursor: pointer;
            font-size: 0.79em;
            user-select: none;
            vertical-align: super;
            text-decoration: underline;
          "
        >
          ${num}
        </sup>`;    
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

  // Método para escapar caracteres especiais em expressões regulares
  escapeRegExp(string: string): string {
    const result = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result;
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
    
    // Calcular qual elemento e qual ocorrência dentro desse elemento
    let currentIndex = 0;
    let targetElement: any = null;
    let targetOccurrence = 0;
    
    for (const result of this.searchResults) {
      if (currentIndex + result.occurrences > index) {
        targetElement = result;
        targetOccurrence = index - currentIndex;
        break;
      }
      currentIndex += result.occurrences;
    }
    
    if (!targetElement) {
      return;
    }

    // Encontrar o elemento baseado no tipo e ID
    let element: HTMLElement | null = null;

    switch (targetElement.type) {
      case 'titulo':
        element = document.querySelector(`h2.titulo`);
        break;
      case 'capitulo':
        element = document.querySelector(`h3.capitulo`);
        break;
      case 'secao':
        element = document.querySelector(`h4.secao`);
        break;
      case 'artigo':
        element = document.getElementById(`artigo-${targetElement.id}`);
        break;
      case 'paragrafo':
        element = document.getElementById(`paragrafo-${targetElement.id}`);
        break;
      case 'comentario':
        // Para comentários, precisamos encontrar o container do comentário
        element = document.querySelector(`[data-comentario-id="${targetElement.id}"]`) as HTMLElement;
        if (!element) {
          // Fallback: procurar por elementos que contenham o conteúdo do comentário
          const allElements = document.querySelectorAll('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            if (el.textContent && el.textContent.includes(targetElement.content.substring(0, 50))) {
              element = el as HTMLElement;
              break;
            }
          }
        }
        break;
      case 'remissao':
        // Para remissões, procurar pelo elemento com data-remissao-id
        element = document.querySelector(`[data-remissao-id="${targetElement.id}"]`) as HTMLElement;
        break;
      case 'quadro':
        // Para quadros, procurar pelo elemento com data-quadro-id ou pelo título
        element = document.querySelector(`[data-quadro-id="${targetElement.id}"]`) as HTMLElement;
        if (!element) {
          // Fallback: procurar por elementos com classe quadro-titulo que contenham o título
          const quadroTitulos = document.querySelectorAll('.quadro-titulo');
          for (let i = 0; i < quadroTitulos.length; i++) {
            const titulo = quadroTitulos[i];
            if (titulo.textContent && titulo.textContent.includes(targetElement.content.substring(0, 50))) {
              element = titulo as HTMLElement;
              break;
            }
          }
        }
        break;
    }

    if (element) {
      // Garantir que o elemento está visível
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Adicionar destaque visual
      element.classList.add('result-focus');
      
      // Remover destaque após um tempo
      setTimeout(() => {
        element?.classList.remove('result-focus');
      }, 2000);

      // Se for um comentário, expandir automaticamente
      if (targetElement.type === 'comentario') {
        this.expandedComments.add(String(targetElement.id));
      }
    } else {
      
      // Fallback: tentar encontrar por highlights
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
  async loadSearchHistory() {
    const history = await this.storage.get<string[]>('searchHistory');
    if (history) {
      this.searchHistory = history;
    }
  }

  async addToSearchHistory(query: string) {
    if (!this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      if (this.searchHistory.length > 10) {
        this.searchHistory.pop();
      }
      await this.storage.set('searchHistory', this.searchHistory);
    }
  }

  useHistoryItem(query: string) {
    this.query = query;
    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.value = query;
    }
    this.search();
  }

  async clearSearchHistory() {
    this.searchHistory = [];
    await this.storage.remove('searchHistory');
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'middle'
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
        type: type,
        bookId: this.bookId,
      },
    });
    return await modal.present();
  }

  async openPdfDirectly(pdfName: string) {
    const url = `/pdf-viewer/${pdfName}?remote=false`;
    window.location.href = url;
  }

  toggleComment(commentId: string | number) {
    const id = String(commentId);
    if (this.expandedComments.has(id)) {
      this.expandedComments.delete(id);
    } else {
      this.expandedComments.add(id);
    }
  }
  
  toggleAllComments() {
    this.allCommentsExpanded = !this.allCommentsExpanded;
    if (this.allCommentsExpanded) {
      this.expandedComments = new Set(this.getAllCommentIds().map(id => String(id)));
    } else {
      this.expandedComments.clear();
    }
  }
  
  isCommentExpanded(commentId: string | number): boolean {
    if (this.allCommentsExpanded) return true;
    return this.expandedComments.has(String(commentId));
  }

  getAllCommentIds(): Array<string | number> {
    const ids: Array<string | number> = [];
    const iterate = (book: any) => {
      book?.titulos?.forEach((titulo: any) => {
        titulo.capitulos?.forEach((capitulo: any) => {
          capitulo.secaos?.forEach((secao: any) => {
            secao.artigos?.forEach((artigo: any) => {
              artigo.paragrafos?.forEach((paragrafo: any) => {
                paragrafo.comentarios?.forEach((comentario: any) => {
                  if (comentario?.id != null) ids.push(comentario.id);
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
  /** Opcional: remove <p> “embrulho” único no início/fim, se existir */
  private stripSingleOuterP(html: string): string {
    const trimmed = html.trim();
    // remove um <p> externo simples (mantém <p> internos)
    return trimmed
      .replace(/^<p([^>]*)>\s*/i, '<div$1>')
      .replace(/\s*<\/p>\s*$/i, '</div>');
  }
  
  safeHtml(html: string): SafeHtml {
    // Se não quiser trocar <p> externo, basta sanitizar direto:
    // return this.sanitizer.bypassSecurityTrustHtml(html);
  
    // Se quiser normalizar para evitar um <p> externo extra:
    const normalized = this.stripSingleOuterP(html || '');
    return this.sanitizer.bypassSecurityTrustHtml(normalized);
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
  
  async showDestinationChoiceModal(destinos: RemissaoDestino[]) {
    const alert = await this.alertController.create({
      header: 'Escolha o destino',
      inputs: destinos.map((destino, index) => ({
        type: 'radio',
        label: this.formatDestinoLabel(destino),
        value: String(index),
        handler: () => {
          // Navega imediatamente
          this.scrollToArtigo(destino.artigo, destino.paragrafo, destino.inciso, true);
  
          // Fecha o modal logo após selecionar
          setTimeout(() => alert.dismiss(), 100);
        }
      })),
      buttons: [{ text: 'Cancelar', role: 'cancel' }]
    });
  
    await alert.present();
  }
  
  // helper só pra montar label bonitinha
  private formatDestinoLabel(destino: RemissaoDestino): string {
    if (destino.artigo === 'contexto') {
      if (destino.paragrafo && destino.inciso) return `§ ${destino.paragrafo}, inciso ${destino.inciso} (no artigo atual)`;
      if (destino.paragrafo) return `§ ${destino.paragrafo} (no artigo atual)`;
      if (destino.inciso) return `Inciso ${destino.inciso} (no artigo atual)`;
      return '(no artigo atual)';
    }
    let label = `Art. ${destino.artigo}`;
    if (destino.paragrafo) label += `, § ${destino.paragrafo}`;
    if (destino.inciso) label += `, inciso ${destino.inciso}`;
    return label;
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
    return apiDestinos.map(d => {
      const numero = this.normalizeNumero(d.artigo?.numero) || this.extractArtigoNumber(d.artigo?.conteudo) || String(d.artigo?.id || '');
      let paragrafo: string | undefined;
      if (d.paragrafo?.conteudo) {
        const m = d.paragrafo.conteudo.match(/§\s*(\d+)[º°]?/i);
        paragrafo = m ? m[1] : undefined;
      }
  
      let inciso: string | undefined;
      if (d.paragrafo?.tipo) {
        const mi = d.paragrafo.tipo.match(/^([IVX]+)\s*[-–]/i);
        inciso = mi ? mi[1] : undefined;
      }
  
      return { artigo: numero, paragrafo, inciso, origem: { text: d.artigo.conteudo } };
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
    this.remissoesCache.clear();
  }
  // Método para processar quadros
  private processQuadros(quadros: any) {
    if (!quadros) {
      return;
    }
    
    this.quadrosCache.clear();
    
    // Processar cada categoria de quadros
    Object.keys(quadros).forEach(key => {
      const quadroList = quadros[key];
      if (Array.isArray(quadroList)) {
        quadroList.forEach(quadro => {
          try {
            // Parse do conteúdo JSON
            const conteudoParsed = JSON.parse(quadro.conteudo);
            const quadroProcessado = {
              ...quadro,
              titulo: conteudoParsed.titulo,
              dados: conteudoParsed.dados
            };
            
            // Armazenar no cache usando a chave de associação
            const cacheKey = `${quadro.associado_a}_${quadro.associado_id}`;
            if (!this.quadrosCache.has(cacheKey)) {
              this.quadrosCache.set(cacheKey, []);
            }
            this.quadrosCache.get(cacheKey)!.push(quadroProcessado);
          } catch (error) {
          }
        });
      }
    });
  }

  // Método para obter quadros associados a um comentário, parágrafo, remissão ou outros tipos
  getQuadrosAssociados(tipo: string, id: number): any[] {
    const cacheKey = `${tipo}_${id}`;
    const result = this.quadrosCache.get(cacheKey) || [];
    
    return result;
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
    
    if (this.quadrosCache.size > 50) {
      this.quadrosCache.clear();
    }
  }
}
