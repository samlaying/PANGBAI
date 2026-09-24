/**
 * ClientStorage
 * 前端存储层：封装 LocalStorage / IndexedDB 容错读写，独立底层，不知上层业务。
 */
export class ClientStorage {
  private prefix: string;

  constructor(prefix = "pb_store_") {
    this.prefix = prefix;
  }

  getItem<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(`${this.prefix}${key}`);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("ClientStorage setItem failed:", e);
    }
  }

  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(`${this.prefix}${key}`);
    } catch (e) {
      console.warn("ClientStorage removeItem failed:", e);
    }
  }
}

export const clientStorage = new ClientStorage();
