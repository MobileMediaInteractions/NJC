const memory = new Map<string, string>();
export const deviceStorage = {
  async getItem(key: string) { return typeof localStorage === 'undefined' ? memory.get(key) ?? null : localStorage.getItem(key); },
  async setItem(key: string, value: string) { if (typeof localStorage === 'undefined') memory.set(key, value); else localStorage.setItem(key, value); },
  async removeItem(key: string) { if (typeof localStorage === 'undefined') memory.delete(key); else localStorage.removeItem(key); },
};
