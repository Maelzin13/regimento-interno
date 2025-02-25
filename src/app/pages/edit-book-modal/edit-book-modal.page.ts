import {
  ModalController,
  ToastController,
  LoadingController,
} from '@ionic/angular';
import { Component, Input, OnInit } from '@angular/core';
import { BookService } from 'src/app/services/book.service';

@Component({
  selector: 'app-edit-book-modal',
  templateUrl: './edit-book-modal.page.html',
  styleUrls: ['./edit-book-modal.page.scss'],
})
export class EditBookModalPage implements OnInit {
  @Input() itemId!: number;
  @Input() itemType!: string;

  item: any = {};
  editorContent: string = '';
  isLoading: boolean = false;
  isEditingContent: boolean = false;

  constructor(
    private bookService: BookService,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadItem();
  }

  async loadItem() {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Carregando...',
    });
    await loading.present();

    try {
      let data;
      switch (this.itemType) {
        case 'titulo':
          data = await this.bookService.getTituloById(this.itemId);
          console.log(data);
          break;
        case 'capitulo':
          data = await this.bookService.getCapituloById(this.itemId);
          break;
        case 'secao':
          data = await this.bookService.getSecaoById(this.itemId);
          break;
        case 'artigo':
          data = await this.bookService.getArtigoById(this.itemId);
          break;
        case 'paragrafo':
          data = await this.bookService.getParagrafos(this.itemId);
          break;
        default:
          throw new Error('Tipo inválido');
      }

      this.item = data;
      console.log(this.item);
      this.editorContent = this.item.conteudo || '';
      console.log(this.editorContent);
    } catch (error) {
      console.error('Erro ao carregar o item:', error);
      this.presentToast('Erro ao carregar o conteúdo.');
    } finally {
      loading.dismiss();
      this.isLoading = false;
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  async salvarConteudo() {
    if (!this.editorContent.trim()) {
      this.presentToast('O conteúdo não pode estar vazio.');
      return;
    }

    try {
      let updateData = { conteudo: this.editorContent };

      // switch (this.itemType) {
      //   case 'titulo':
      //     await this.bookService.updateTitulo(this.itemId, updateData);
      //     break;
      //   case 'capitulo':
      //     await this.bookService.updateCapitulo(this.itemId, updateData);
      //     break;
      //   case 'secao':
      //     await this.bookService.updateSecao(this.itemId, updateData);
      //     break;
      //   case 'artigo':
      //     await this.bookService.updateArtigo(this.itemId, updateData);
      //     break;
      // }

      this.presentToast('Alterações salvas com sucesso.');
      this.dismiss();
    } catch (error) {
      this.presentToast('Erro ao salvar alterações.');
    }
  }
}
