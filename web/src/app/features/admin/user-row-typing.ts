import { Directive } from '@angular/core';
import { type UserView } from '../../core/models/user';

/**
 * Material's table types each template row as `any`. Matching the same attributes as
 * `matCellDef` and `matRowDef`, this tells the template compiler the row is a `UserView`,
 * so strict templates check every cell. It adds no behaviour at runtime.
 */
// It must match Material's own attributes to type their templates, so it cannot be "app".
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[matCellDef], [matRowDef]' })
export class UserRowTyping {
  static ngTemplateContextGuard(
    _directive: UserRowTyping,
    _context: unknown,
  ): _context is { $implicit: UserView } {
    return true;
  }
}
