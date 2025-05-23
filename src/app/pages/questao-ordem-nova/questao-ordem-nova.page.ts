import { Component, OnInit } from '@angular/core';
import { QuestoesOrdemService } from 'src/app/services/questoes-ordem.service';

@Component({
  selector: 'app-questao-ordem-nova',
  templateUrl: './questao-ordem-nova.page.html',
  styleUrls: ['./questao-ordem-nova.page.scss'],
})
export class QuestaoOrdemNovaPage implements OnInit {
  listQuestoes: any;

  constructor(private questoesOrdemService: QuestoesOrdemService) {}

  ngOnInit() {
    this.questoesOrdemService.getAllQuestoesOrdem().then((questoes: any) => {
      this.listQuestoes = questoes;
    });
  }
}
