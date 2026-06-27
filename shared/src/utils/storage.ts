// Shared storage utility for the AI Workplace Desktop App

export interface StorageOptions {
  prefix?: string;
  serializer?: StorageSerializer;
  encrypt?: boolean;
  encryptionKey?: string;
}

export interface StorageSerializer {
  serialize<T>(value: T): string;
  deserialize<T>(value: string): T;
}

export const defaultSerializer: StorageSerializer = {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
};

export class Storage {
  private storage: Storage;
  private prefix: string;
  private serializer: StorageSerializer;

  constructor(storage: Storage, options: StorageOptions = {}) {
    this.storage = storage;
    this.prefix = options.prefix || '';
    this.serializer = options.serializer || defaultSerializer;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set<T>(key: string, value: T): void {
    try {
      const serialized = this.serializer.serialize(value);
      this.storage.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error(`Storage set error for key "${key}":`, error);
      throw error;
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (item === null) return null;
      return this.serializer.deserialize<T>(item);
    } catch (error) {
      console.error(`Storage get error for key "${key}":`, error);
      return null;
    }
  }

  getOrDefault<T>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);
    return value !== null ? value : defaultValue;
  }

  remove(key: string): void {
    this.storage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => this.storage.removeItem(key));
  }

  has(key: string): boolean {
    return this.storage.getItem(this.getKey(key)) !== null;
  }

  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }

  size(): number {
    return this.keys().length;
  }

  // Watch for changes (using storage event)
  watch(key: string, callback: (value: unknown) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key === this.getKey(key)) {
        const newValue = event.newValue 
          ? this.serializer.deserialize(event.newValue)
          : null;
        callback(newValue);
      }
    };

    window.addEventListener('storage', handler);
    
    return () => window.removeEventListener('storage', handler);
  }
}

// LocalStorage wrapper
export const localStorageWrapper = new Storage(window.localStorage, {
  prefix: 'ai-workplace:',
});

// SessionStorage wrapper
export const sessionStorageWrapper = new Storage(window.sessionStorage, {
  prefix: 'ai-workplace:',
});

// IndexedDB wrapper for larger data
export interface IndexedDBOptions {
  name: string;
  version: number;
  stores: IndexedDBStoreConfig[];
}

export interface IndexedDBStoreConfig {
  name: string;
  keyPath: string | string[];
  indexes?: IndexedDBIndexConfig[];
}

export interface IndexedDBIndexConfig {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private options: IndexedDBOptions;

  constructor(options: IndexedDBOptions) {
    this.options = options;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.name, this.options.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        for (const storeConfig of this.options.stores) {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath });
            
            if (storeConfig.indexes) {
              for (const indexConfig of storeConfig.indexes) {
                store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
              }
            }
          }
        }
      };
    });
  }

  async set<T>(storeName: string, value: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(storeName: string, key: IDBValidKey): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async query<T>(storeName: string, indexName: string, key: IDBValidKey | IDBKeyRange): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Pre-configured IndexedDB for conversations
export const conversationDB = new IndexedDBStorage({
  name: 'ai-workplace-conversations',
  version: 1,
  stores: [
    {
      name: 'conversations',
      keyPath: 'id',
      indexes: [
        { name: 'updated_at', keyPath: 'updated_at' },
        { name: 'user_id', keyPath: 'user_id' },
      ],
    },
    {
      name: 'messages',
      keyPath: 'id',
      indexes: [
        { name: 'conversation_id', keyPath: 'conversation_id' },
        { name: 'created_at', keyPath: 'created_at' },
      ],
    },
  ],
});

// Pre-configured IndexedDB for files
export const fileDB = new IndexedDBStorage({
  name: 'ai-workplace-files',
  version: 1,
  stores: [
    {
      name: 'files',
      keyPath: 'id',
      indexes: [
        { name: 'path', keyPath: 'path' },
        { name: 'workspace_id', keyPath: 'workspace_id' },
        { name: 'created_at', keyPath: 'created_at' },
      ],
    },
  ],
});

// Settings storage with defaults
export const settingsStorage = new Storage(window.localStorage, {
  prefix: 'ai-workplace:settings:',
  serializer: defaultSerializer,
});

export const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  language: 'en',
  auto_start: false,
  minimize_to_tray: true,
  close_to_tray: false,
  global_shortcut: 'CmdOrCtrl+Shift+A',
  backend_url: 'http://localhost:8080',
  backend_auto_start: true,
  notifications_enabled: true,
  sound_enabled: true,
} as const;

export function getSettings(): typeof DEFAULT_SETTINGS {
  return settingsStorage.getOrDefault('app', DEFAULT_SETTINGS);
}

export function setSettings(settings: Partial<typeof DEFAULT_SETTINGS>): void {
  const current = getSettings();
  settingsStorage.set('app', { ...current, ...settings });
}

// Secure storage for sensitive data (API keys, tokens)
export class SecureStorage {
  private storage: Storage;
  private encryptionKey: CryptoKey | null = null;

  constructor(storage: Storage, encryptionKey?: string) {
    this.storage = storage;
    if (encryptionKey) {
      this.initEncryption(encryptionKey);
    }
  }

  private async initEncryption(password: string): Promise<void> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('ai-workplace-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoder.encode(data)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(data: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    
    const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    const encrypted = await this.encrypt(serialized);
    this.storage.set(key, encrypted);
  }

  async get<T>(key: string): Promise<T | null> {
    const encrypted = this.storage.get<string>(key);
    if (!encrypted) return null;
    
    try {
      const decrypted = await this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    this.storage.remove(key);
  }
}

// Create secure storage instance
export const secureStorage = new SecureStorage(
  new Storage(window.localStorage, { prefix: 'ai-workplace:secure:' }),
  // In production, derive this from user password or device key
  'default-encryption-key-change-in-production'
);