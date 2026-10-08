import { TestBed } from '@angular/core/testing';
import { type AccessTone, RoleBadge } from './role-badge';

function render(tone: AccessTone, label: string): HTMLElement {
  const fixture = TestBed.createComponent(RoleBadge);
  fixture.componentRef.setInput('tone', tone);
  fixture.componentRef.setInput('label', label);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RoleBadge', () => {
  it('always carries its text, so color is never the only signal', () => {
    expect(render('general', 'General User').textContent.trim()).toBe('General User');
  });

  it('switches to brass for admin access', () => {
    expect(render('general', 'General User').classList).not.toContain('admin');
    expect(render('admin', 'Admin').classList).toContain('admin');
  });
});
