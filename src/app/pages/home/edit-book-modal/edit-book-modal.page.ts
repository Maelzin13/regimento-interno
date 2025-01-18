import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-edit-book-modal',
  templateUrl: './edit-book-modal.page.html',
  styleUrls: ['./edit-book-modal.page.scss'],
})
export class EditBookModalPage implements OnInit {
  @Input() bookId: number | undefined;
  livro: any;
  editorContent: string = '';

  ngOnInit() {
    if (this.bookId !== undefined) {
      this.apiService
        .getBookById(this.bookId)
        .then((data) => {
          this.livro = data;

          console.log('Livro:', this.livro);
        })
        .catch((error) => {
          console.error('Erro ao carregar o livro:', error);
        });
    } else {
      console.error('bookId is undefined');
    }
  }

  constructor(
    private modalController: ModalController,
    private apiService: ApiService
  ) {}

  dismiss() {
    this.modalController.dismiss();
  }

  editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'], // Basic text styles
      [{ header: 1 }, { header: 2 }], // Headers
      [{ list: 'ordered' }, { list: 'bullet' }], // Lists
      [{ script: 'sub' }, { script: 'super' }], // Sub/Superscript
      [{ indent: '-1' }, { indent: '+1' }], // Indent
      [{ direction: 'rtl' }], // Text direction
      [{ size: ['small', false, 'large', 'huge'] }], // Font sizes
      [{ color: [] }, { background: [] }], // Colors
      [{ font: [] }],
      [{ align: [] }],
      ['link', 'image', 'video'], // Media
      ['table'],
    ],
  };

  getEditorContent() {
    console.log('Editor Content:', this.editorContent);
  }

  saveChanges() {
    // this.apiService.updateBook(this.book.id, this.book).then(() => {
    //   this.dismiss();
    // });
  }
}
