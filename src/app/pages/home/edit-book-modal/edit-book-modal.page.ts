import { Component, Input, OnInit } from '@angular/core';
import {
  ModalController,
  ToastController,
  LoadingController,
} from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-edit-book-modal',
  templateUrl: './edit-book-modal.page.html',
  styleUrls: ['./edit-book-modal.page.scss'],
})
export class EditBookModalPage implements OnInit {
  @Input() bookId!: number;
  livro: any = {};
  editorContent: string = '';
  isLoading: boolean = false;
  selectedTab: string = 'prefacio';
  prefacios: any[] = [];
  novoConteudo: any = { tipo: '', conteudo: '' };
  isEditingContent: boolean = false;

  constructor(
    private modalController: ModalController,
    private apiService: ApiService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadBook();
  }

  async loadBook() {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Carregando livro...',
    });
    await loading.present();

    this.apiService
      .getBookById(this.bookId)
      .then((data) => {
        this.livro = data;
        this.prefacios = data.prefacios.map((p: any) => ({
          ...p,
          isEditing: false,
        }));
        this.editorContent = this.livro.conteudo || '';

        // Garantindo que títulos, capítulos e seções sejam carregados
        if (this.livro.titulos) {
          this.livro.titulos = this.livro.titulos.map((titulo: any) => ({
            ...titulo,
            isEditing: false,
            capitulos:
              titulo.capitulos?.map((capitulo: any) => ({
                ...capitulo,
                isEditing: false,
                secoes:
                  capitulo.secoes?.map((secao: any) => ({
                    ...secao,
                    isEditing: false,
                  })) || [],
              })) || [],
          }));
        }

        loading.dismiss();
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Erro ao carregar o livro:', error);
        loading.dismiss();
        this.presentToast('Erro ao carregar o livro.');
        this.isLoading = false;
      });
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

  salvarPrefacios() {
    // this.apiService
    //   .updatePrefacios(this.bookId, this.prefacios)
    //   .then(() => {
    //     this.presentToast('Prefácios salvos com sucesso.');
    //     this.prefacios.forEach((p) => (p.isEditing = false));
    //   })
    //   .catch(() => {
    //     this.presentToast('Erro ao salvar os prefácios.');
    //   });
  }

  salvarConteudo() {
    if (!this.livro || !this.editorContent.trim()) {
      this.presentToast('O conteúdo não pode estar vazio.');
      return;
    }
    this.apiService
      .updateBook(this.bookId, { conteudo: this.editorContent })
      .then(() => {
        this.presentToast('Alterações salvas com sucesso.');
        this.isEditingContent = false;
      })
      .catch(() => {
        this.presentToast('Erro ao salvar alterações.');
      });
  }

  adicionarConteudo() {
    if (!this.novoConteudo.tipo || !this.novoConteudo.conteudo.trim()) {
      this.presentToast('Preencha todos os campos para adicionar conteúdo.');
      return;
    }
    // this.apiService
    //   .addContent(this.bookId, this.novoConteudo)
    //   .then(() => {
    //     this.presentToast('Conteúdo adicionado com sucesso.');
    //     this.dismiss();
    //   })
    //   .catch(() => {
    //     this.presentToast('Erro ao adicionar conteúdo.');
    //   });
  }
}
