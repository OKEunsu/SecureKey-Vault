import { DB_KEY } from '../constants';
import { CredentialItem, StoredDatabase } from '../types';
import {
  decryptData,
  deriveKey,
  encryptData,
  generateSalt,
  hashPassword,
  isLegacyVerificationHash,
  verifyPassword
} from './cryptoService';

export class DBService {
  private masterKey: string | null = null;

  constructor() { }

  private canUseSecureStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.secureVaultStorage !== 'undefined';
  }

  private parseDatabase(raw: string): StoredDatabase | null {
    try {
      const parsed = JSON.parse(raw) as StoredDatabase;
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.salt !== 'string' || typeof parsed.verificationHash !== 'string') return null;
      if (!Array.isArray(parsed.items)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async readRawDatabase(): Promise<string | null> {
    if (this.canUseSecureStorage()) {
      const secureRaw = await window.secureVaultStorage!.get();
      if (secureRaw) {
        return secureRaw;
      }

      // One-time migration path from legacy localStorage.
      const legacyRaw = localStorage.getItem(DB_KEY);
      if (legacyRaw) {
        try {
          await window.secureVaultStorage!.set(legacyRaw);
          localStorage.removeItem(DB_KEY);
        } catch {
          return legacyRaw;
        }
        return legacyRaw;
      }

      return null;
    }

    return localStorage.getItem(DB_KEY);
  }

  private async writeRawDatabase(raw: string): Promise<void> {
    if (this.canUseSecureStorage()) {
      await window.secureVaultStorage!.set(raw);
      localStorage.removeItem(DB_KEY);
      return;
    }

    localStorage.setItem(DB_KEY, raw);
  }

  private async removeRawDatabase(): Promise<void> {
    if (this.canUseSecureStorage()) {
      await window.secureVaultStorage!.remove();
      localStorage.removeItem(DB_KEY);
      return;
    }

    localStorage.removeItem(DB_KEY);
  }

  // Initialize or check if DB exists
  async hasDatabase(): Promise<boolean> {
    return !!(await this.readRawDatabase());
  }

  // Set the master key for the session (expects the derived key)
  setMasterKey(derivedKey: string | null) {
    this.masterKey = derivedKey;
  }

  // Create a new database with a master password
  async initDatabase(password: string): Promise<void> {
    const salt = generateSalt();
    const verificationHash = await hashPassword(password, salt);
    const emptyDB: StoredDatabase = {
      version: 2,
      verificationHash,
      salt,
      items: []
    };
    await this.writeRawDatabase(JSON.stringify(emptyDB));

    // Set the derived key for current session
    const derivedKey = await deriveKey(password, salt);
    this.setMasterKey(derivedKey);
  }

  // Get the database info (salt and hash)
  async getDatabaseInfo(): Promise<{ salt: string, verificationHash: string } | null> {
    const raw = await this.readRawDatabase();
    if (!raw) return null;
    const db = this.parseDatabase(raw);
    if (!db) return null;
    return { salt: db.salt, verificationHash: db.verificationHash };
  }

  async unlockDatabase(password: string): Promise<string | null> {
    const raw = await this.readRawDatabase();
    if (!raw) return null;

    const db = this.parseDatabase(raw);
    if (!db) return null;

    if (isLegacyVerificationHash(db.verificationHash)) {
      throw new Error("UnsupportedBackupFormat");
    }

    const valid = await verifyPassword(password, db.salt, db.verificationHash);
    if (!valid) return null;

    return deriveKey(password, db.salt);
  }

  // Get all items decrypted
  async getAllItems(): Promise<CredentialItem[]> {
    if (!this.masterKey) throw new Error("Database locked");

    const raw = await this.readRawDatabase();
    if (!raw) return [];

    const db = this.parseDatabase(raw);
    if (!db) throw new Error("Corrupted database");
    const items: CredentialItem[] = [];

    for (const encryptedItem of db.items) {
      const decrypted = await decryptData<CredentialItem>(encryptedItem.ciphertext, this.masterKey);
      if (decrypted) {
        items.push(decrypted);
      }
    }

    // Sort by created date desc
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Save an item (Add or Update)
  async saveItem(item: CredentialItem): Promise<void> {
    if (!this.masterKey) throw new Error("Database locked");

    const raw = await this.readRawDatabase();
    if (!raw) throw new Error("Database not initialized");
    const db = this.parseDatabase(raw);
    if (!db) throw new Error("Corrupted database");

    // Encrypt the item
    const ciphertext = await encryptData(item, this.masterKey);

    // Check if update or insert
    const existingIndex = db.items.findIndex(i => i.id === item.id);

    if (existingIndex >= 0) {
      db.items[existingIndex] = { id: item.id, ciphertext };
    } else {
      db.items.push({ id: item.id, ciphertext });
    }

    await this.writeRawDatabase(JSON.stringify(db));
  }

  // Delete an item
  async deleteItem(id: string): Promise<void> {
    if (!this.masterKey) throw new Error("Database locked");

    const raw = await this.readRawDatabase();
    if (!raw) return;
    const db = this.parseDatabase(raw);
    if (!db) throw new Error("Corrupted database");

    db.items = db.items.filter(i => i.id !== id);
    await this.writeRawDatabase(JSON.stringify(db));
  }

  // Nuke DB
  async clearDatabase(): Promise<void> {
    await this.removeRawDatabase();
    this.masterKey = null;
  }

  // Export Data (Backup)
  async exportData(): Promise<string> {
    const raw = await this.readRawDatabase();
    return raw || "{}";
  }

  // Import database JSON from backup and overwrite current DB
  async importData(raw: string): Promise<void> {
    const db = this.parseDatabase(raw);
    if (!db) throw new Error("Invalid database format");

    if (isLegacyVerificationHash(db.verificationHash)) {
      throw new Error("UnsupportedBackupFormat");
    }

    await this.writeRawDatabase(raw);
    this.masterKey = null;
  }
}

export const dbService = new DBService();
