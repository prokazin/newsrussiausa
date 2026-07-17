export class CacheManager {
  constructor(kv) {
    this.kv = kv;
    this.prefix = {
      news: 'news:',
      translation: 'trans:',
      events: 'events:',
      stats: 'stats:'
    };
  }

  async storeNews(newsItems) {
    if (!this.kv) {
      console.error('KV storage not available');
      return [];
    }
    
    const key = this.getNewsKey();
    const existing = await this.getNewsItems() || [];
    const merged = this.mergeNews(existing, newsItems);
    await this.kv.put(key, JSON.stringify(merged));
    return merged;
  }

  async getNewsItems() {
    if (!this.kv) return [];
    
    const key = this.getNewsKey();
    const data = await this.kv.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getRecentNews(days) {
    const items = await this.getNewsItems() || [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return items.filter(item => new Date(item.pubDate).getTime() > cutoff);
  }

  async getNewsItem(id) {
    const items = await this.getNewsItems() || [];
    return items.find(item => item.id === id);
  }

  mergeNews(existing, newItems) {
    const map = new Map();
    
    // Add existing items
    if (existing) {
      existing.forEach(item => map.set(item.id, item));
    }
    
    // Add new items (override duplicates)
    newItems.forEach(item => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    
    // Sort by date and limit to 1000 items
    const sorted = Array.from(map.values())
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 1000);
    
    return sorted;
  }

  async storeTranslation(id, translated) {
    if (!this.kv) return;
    
    const key = this.prefix.translation + id;
    await this.kv.put(key, JSON.stringify(translated));
  }

  async getTranslation(id) {
    if (!this.kv) return null;
    
    const key = this.prefix.translation + id;
    const data = await this.kv.get(key);
    return data ? JSON.parse(data) : null;
  }

  async storeEvents(events) {
    if (!this.kv) return;
    
    const key = this.prefix.events + 'all';
    await this.kv.put(key, JSON.stringify(events));
  }

  async getEvents() {
    if (!this.kv) return [];
    
    const key = this.prefix.events + 'all';
    const data = await this.kv.get(key);
    return data ? JSON.parse(data) : [];
  }

  getNewsKey() {
    return this.prefix.news + 'all';
  }

  async cleanupOldNews(cutoff) {
    const items = await this.getNewsItems() || [];
    const filtered = items.filter(item => 
      new Date(item.pubDate).getTime() > cutoff
    );
    await this.storeNews(filtered);
    return filtered;
  }

  async getNewsCount() {
    const items = await this.getNewsItems() || [];
    return items.length;
  }

  async getEventsCount() {
    const items = await this.getEvents() || [];
    return items.length;
  }

  async clearCache() {
    if (!this.kv) return;
    
    const keys = await this.kv.list();
    for (const key of keys.keys) {
      await this.kv.delete(key.name);
    }
  }
}
