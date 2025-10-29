import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stripHtml',
  standalone: true
})
export class StripHtmlPipe implements PipeTransform {

  transform(value: string): string {
    if (!value) return '';
    
    // Remove todas as tags HTML
    const stripped = value.replace(/<[^>]*>/g, '');
    
    // Decodifica entidades HTML comuns
    const decoded = stripped
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // Remove espaços extras e quebras de linha desnecessárias
    return decoded.trim().replace(/\s+/g, ' ');
  }
}
