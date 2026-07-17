export class RssParser {
  constructor(cache) {
    this.cache = cache;
  }

  async parse(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      const items = this.parseXML(xml);
      
      // Add source information
      const sourceName = new URL(url).hostname.replace('www.', '');
      return items.map(item => ({
        ...item,
        source: sourceName,
        id: this.generateId(item),
        collectedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error(`RSS parse error for ${url}:`, error);
      throw error;
    }
  }

  parseXML(xml) {
    // Simple XML parsing (in production, use a proper XML parser)
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const item = {
        title: this.extractTag(itemXml, 'title'),
        link: this.extractTag(itemXml, 'link'),
        pubDate: this.extractTag(itemXml, 'pubDate'),
        description: this.extractTag(itemXml, 'description'),
        guid: this.extractTag(itemXml, 'guid')
      };

      if (item.title && item.link) {
        items.push(item);
      }
    }

    return items;
  }

  extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, 's');
    const match = regex.exec(xml);
    return match ? this.cleanText(match[1]) : '';
  }

  cleanText(text) {
    return text.replace(/<[^>]*>/g, '')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&amp;/g, '&')
               .replace(/&quot;/g, '"')
               .replace(/&apos;/g, "'")
               .trim();
  }

  generateId(item) {
    const text = item.title + item.link;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'news_' + Math.abs(hash).toString(36);
  }
}
