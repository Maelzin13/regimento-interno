import { Component, OnInit } from '@angular/core';
import { PagamentosService } from 'src/app/services/pagamentos.service'; 

@Component({
  selector: 'app-pagamento',
  templateUrl: './pagamento.page.html',
  styleUrls: ['./pagamento.page.scss'],
})
export class PagamentoPage implements OnInit {
  pagamentos: any[] = []; 
  constructor(private pagamentosService: PagamentosService) {}

  ngOnInit() {
    
    this.pagamentosService.getPagamentos().then((data) => {
      this.pagamentos = data;
    }).catch(error => {
      console.error('Erro ao carregar pagamentos:', error);
    });
  }
}
