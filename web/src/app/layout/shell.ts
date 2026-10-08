import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** The signed-in frame. The top bar, keyline and navigation arrive in 3.8. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet],
  template: '<main class="shell-content"><router-outlet /></main>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {}
