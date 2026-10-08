import { Directive } from '@angular/core';
import { type RecordItem } from '../../core/models/service-request';

/**
 * Material's table types each template row as `any`. Matching the same attributes as
 * `matCellDef` and `matRowDef`, this tells the template compiler the row is a
 * `RecordItem`, so strict templates check every cell. It adds no behaviour at runtime.
 */
// It must match Material's own attributes to type their templates, so it cannot be "app".
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[matCellDef], [matRowDef]' })
export class RecordRowTyping {
  static ngTemplateContextGuard(
    _directive: RecordRowTyping,
    _context: unknown,
  ): _context is { $implicit: RecordItem } {
    return true;
  }
}
