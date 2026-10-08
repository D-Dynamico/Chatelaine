import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/** "1 to 10 of 18", in the interface's own voice (§23), for every paginated table. */
@Injectable()
export class RangeLabelIntl extends MatPaginatorIntl {
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) return '0 of 0';
    const first = page * pageSize + 1;
    const last = Math.min(length, (page + 1) * pageSize);
    return `${String(first)} to ${String(last)} of ${String(length)}`;
  };
}
