import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'highlight'
})
export class HighlightPipe implements PipeTransform {
  transform(text: string, search: string, searchType: 'contains' | 'exact' = 'contains'): any {
    if (!search || !text) return text;

    const query = search.trim();
    if (!query) return text;

    let regex: RegExp;
    if (searchType === 'exact') {
      regex = new RegExp(`\\b${this.escapeRegExp(query)}\\b`, 'gi');
    } else {
      regex = new RegExp(this.escapeRegExp(query), 'gi');
    }
    // Aplica apenas no texto plano, preservando tags html (não recomenda para HTML já sanitizado)
    return text.replace(regex, (match) =>
      `<mark class="search-highlight">${match}</mark>`
    );
  }
  escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}