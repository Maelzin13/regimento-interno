import { TestBed } from '@angular/core/testing';

import { SumarioService } from './sumario.service';

describe('SumarioService', () => {
  let service: SumarioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SumarioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
