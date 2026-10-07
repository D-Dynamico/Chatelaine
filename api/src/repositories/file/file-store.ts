import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Store } from '../contracts.js';
import { FileUserRepository } from './file-user-repository.js';
import {
  emptyDocument,
  parseXmlDocument,
  serializeXmlDocument,
  type XmlDocument,
} from './xml-document.js';

/**
 * Keeps the whole XML document in memory and writes it back after every change (D6).
 * Writes go to a temp file that is renamed into place, so a crash never leaves half a
 * file, and they run one at a time through a promise queue. One process only.
 */
export class FileStore implements Store {
  readonly users: FileUserRepository;
  private document: XmlDocument = emptyDocument();
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly path: string) {
    this.users = new FileUserRepository(this);
  }

  async init(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    if (existsSync(this.path)) {
      this.document = parseXmlDocument(await readFile(this.path, 'utf8'), this.path);
      return;
    }
    await this.replace(emptyDocument());
  }

  async reset(): Promise<void> {
    await this.replace(emptyDocument());
  }

  async close(): Promise<void> {
    await this.writes;
  }

  /** A deep copy, so callers can never change stored data without going through mutate. */
  read(): XmlDocument {
    return structuredClone(this.document);
  }

  /**
   * Applies a change to a copy and keeps it only if the change does not throw, so a
   * rejected operation (a duplicate userId, say) leaves the data untouched. Resolves once
   * the new document is on disk.
   */
  async mutate<T>(change: (draft: XmlDocument) => T): Promise<T> {
    const draft = this.read();
    const result = change(draft);
    await this.replace(draft);
    return result;
  }

  private replace(next: XmlDocument): Promise<void> {
    // Serialise first: if the document cannot be written, memory must not move ahead of disk.
    const xml = serializeXmlDocument(next);
    this.document = next;
    const write = this.writes.then(() => this.writeAtomically(xml));
    // Keep the queue alive after a failed write; the caller still sees the error.
    this.writes = write.catch(() => undefined);
    return write;
  }

  private async writeAtomically(xml: string): Promise<void> {
    const temp = `${this.path}.tmp`;
    await writeFile(temp, xml, 'utf8');
    await rename(temp, this.path);
  }
}
