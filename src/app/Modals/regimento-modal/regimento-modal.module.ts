import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe'; 
import { RegimentoModalComponent } from './regimento-modal.component';

@NgModule({
  declarations: [
    RegimentoModalComponent,
    SafeUrlPipe
  ],
  imports: [
    CommonModule,
    IonicModule,
    PdfViewerModule
  ],
  exports: [
    RegimentoModalComponent
  ]
})
export class RegimentoModalModule { }
