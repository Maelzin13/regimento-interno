import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TitlesPage } from './titles.page';

describe('TitlesPage', () => {
  let component: TitlesPage;
  let fixture: ComponentFixture<TitlesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TitlesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
