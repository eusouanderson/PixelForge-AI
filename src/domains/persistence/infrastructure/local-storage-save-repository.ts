import type { GameSaveRepositoryPort, GameSaveSnapshot } from '../types';
import { validateAndMigrateSaveSnapshot } from '../domain/persistence-engine';

export interface KeyValueStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryKeyValueStorage implements KeyValueStorageAdapter {
  private readonly store = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }
}

export function resolveDefaultStorageAdapter(): KeyValueStorageAdapter {
  if (
    typeof window !== 'undefined' &&
    window.localStorage &&
    typeof window.localStorage.getItem === 'function'
  ) {
    return window.localStorage;
  }
  return new MemoryKeyValueStorage();
}

export class LocalStorageGameSaveRepository implements GameSaveRepositoryPort {
  private readonly storageKey: string;
  private readonly storage: KeyValueStorageAdapter;

  constructor(
    storageKey: string = 'pixelforge_virtual_creatures_save_v1',
    storage?: KeyValueStorageAdapter
  ) {
    this.storageKey = storageKey;
    this.storage = storage ?? resolveDefaultStorageAdapter();
  }

  public async loadSave(): Promise<GameSaveSnapshot | null> {
    const raw = this.storage.getItem(this.storageKey);
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      return validateAndMigrateSaveSnapshot(parsed, Date.now());
    } catch {
      return null;
    }
  }

  public async saveSnapshot(snapshot: GameSaveSnapshot): Promise<void> {
    const serialized = JSON.stringify(snapshot);
    this.storage.setItem(this.storageKey, serialized);
  }

  public async clearSave(): Promise<void> {
    this.storage.removeItem(this.storageKey);
  }
}
