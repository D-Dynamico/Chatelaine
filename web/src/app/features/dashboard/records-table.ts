import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatSortModule, type Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import {
  type AdminRecordItem,
  CATEGORY_LABELS,
  RECORD_SORT_FIELDS,
  type RecordItem,
  type RecordSortField,
} from '../../core/models/service-request';
import { type SortOrder } from '../../core/models/paging';
import { AccessChip } from '../../shared/ui/access-chip';
import { PriorityMark } from '../../shared/ui/priority-mark';
import { RelativeTime } from '../../shared/ui/relative-time';
import { StatusChip } from '../../shared/ui/status-chip';
import { type RecordsPage } from './dashboard-strategies';
import { accessDisplay, priorityDisplay, statusDisplay } from './record-display';
import { RecordRowTyping } from './record-row-typing';

/** The columns a General User sees (§23). Nothing else is ever rendered for them. */
export const GENERAL_COLUMNS = ['id', 'title', 'category', 'priority', 'status', 'updatedAt'];
/** An Admin also sees who owns it, its access level and who handles it, and the note. */
export const ADMIN_COLUMNS = [
  'expand',
  'id',
  'title',
  'owner',
  'category',
  'priority',
  'status',
  'access',
  'assignee',
  'updatedAt',
];

export interface TableSort {
  readonly field: RecordSortField;
  readonly order: SortOrder;
}

function isAdminItem(item: RecordItem): item is AdminRecordItem {
  return 'ownerId' in item;
}

/**
 * Service requests as a table. Presentational: the panel owns the query and the data. The
 * admin columns are chosen by `isAdmin`, not by whatever keys an item happens to carry, so
 * even a leaked field would never be drawn for a General User (§37).
 */
@Component({
  selector: 'app-records-table',
  imports: [
    AccessChip,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    PriorityMark,
    RecordRowTyping,
    RelativeTime,
    StatusChip,
  ],
  templateUrl: './records-table.html',
  styleUrl: './records-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsTable {
  readonly page = input.required<RecordsPage>();
  readonly isAdmin = input.required<boolean>();
  readonly sort = input.required<TableSort>();
  /** The current time, from the container's clock, for relative times. */
  readonly now = input.required<Date>();
  readonly sortChange = output<TableSort | null>();
  readonly pageChange = output<number>();

  protected readonly columns = computed(() => (this.isAdmin() ? ADMIN_COLUMNS : GENERAL_COLUMNS));
  protected readonly rows = computed(() => this.page().items);
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly categories = CATEGORY_LABELS;
  protected readonly status = statusDisplay;
  protected readonly priority = priorityDisplay;
  protected readonly access = accessDisplay;

  /** The default order (newest first) has no column, so no header shows it as active. */
  protected readonly activeSort = computed(() => {
    const { field } = this.sort();
    return field === 'createdAt' ? '' : field;
  });

  /** Only admins' rows carry a note, so General Users never get a detail row at all. */
  protected readonly hasNote = (_index: number, row: RecordItem): boolean =>
    this.isAdmin() && isAdminItem(row) && row.internalNote !== null;

  protected adminView(row: RecordItem): AdminRecordItem | null {
    return this.isAdmin() && isAdminItem(row) ? row : null;
  }

  protected isExpanded(id: string): boolean {
    return this.expanded().has(id);
  }

  protected toggle(id: string): void {
    this.expanded.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** A cleared sort (third click) goes back to the default order. */
  protected onSort(event: Sort): void {
    const field = RECORD_SORT_FIELDS.find((known) => known === event.active);
    if (event.direction === '' || field === undefined) {
      this.sortChange.emit(null);
      return;
    }
    this.sortChange.emit({ field, order: event.direction });
  }

  protected onPage(event: PageEvent): void {
    this.pageChange.emit(event.pageIndex + 1);
  }
}
