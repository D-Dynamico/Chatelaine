import { TestBed } from '@angular/core/testing';
import { NoticeStore } from './notice-store';

describe('NoticeStore', () => {
  it('hands messages out once each, oldest first', () => {
    const notices = TestBed.inject(NoticeStore);

    notices.post('first');
    notices.post('second');

    expect(notices.take()).toBe('first');
    expect(notices.take()).toBe('second');
    expect(notices.take()).toBeUndefined();
    expect(notices.pending()).toEqual([]);
  });
});
