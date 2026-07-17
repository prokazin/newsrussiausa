export class Deduplicator {
  constructor(cache) {
    this.cache = cache;
    this.similarityThreshold = 0.85;
  }

  async deduplicate(items) {
    const unique = [];
    const processedIds = new Set();

    for (const item of items) {
      // Check by ID first
      const stored = await this.cache.getNewsItem(item.id);
      if (stored) {
        continue;
      }

      // Check for duplicates in current batch
      let isDuplicate = false;
      for (const existing of unique) {
        if (this.areSimilar(item, existing)) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        unique.push(item);
        processedIds.add(item.id);
      }
    }

    return unique;
  }

  areSimilar(item1, item2) {
    // Compare titles
    const title1 = this.normalizeText(item1.title);
    const title2 = this.normalizeText(item2.title);
    
    const similarity = this.calculateSimilarity(title1, title2);
    return similarity >= this.similarityThreshold;
  }

  normalizeText(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  calculateSimilarity(text1, text2) {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = new Set([...words1, ...words2]);
    
    return intersection.length / union.size;
  }

  async checkDuplicateInHistory(item) {
    const recentNews = await this.cache.getRecentNews(7);
    for (const stored of recentNews) {
      if (this.areSimilar(item, stored)) {
        return true;
      }
    }
    return false;
  }
}
