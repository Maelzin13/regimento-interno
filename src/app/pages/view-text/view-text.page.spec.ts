import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewTextPage } from './view-text.page';

describe('ViewTextPage', () => {
  let component: ViewTextPage;
  let fixture: ComponentFixture<ViewTextPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewTextPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
