export class Translator {
  constructor(cache) {
    this.cache = cache;
    this.services = [
      this.translateWithLibreTranslate.bind(this),
      this.translateWithMyMemory.bind(this),
      this.translateWithYandex.bind(this)
    ];
    this.dailyLimit = 1000000; // Characters per day
    this.usedToday = 0;
  }

  async translate(item) {
    // Check cache first
    const cached = await this.cache.getTranslation(item.id);
    if (cached) {
      return cached;
    }

    // Check daily limit
    if (this.usedToday >= this.dailyLimit) {
      throw new Error('Daily translation limit exceeded');
    }

    let lastError = null;
    for (const service of this.services) {
      try {
        const translated = await service(item);
        const charCount = this.countCharacters(translated);
        this.usedToday += charCount;
        
        // Cache the result
        await this.cache.storeTranslation(item.id, translated);
        
        return translated;
      } catch (error) {
        lastError = error;
        console.warn('Translation service failed, trying next...', error);
      }
    }

    throw new Error(`All translation services failed: ${lastError.message}`);
  }

  async translateWithLibreTranslate(item) {
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: item.title + '\n' + (item.description || ''),
        source: 'en',
        target: 'ru',
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error('LibreTranslate API error');
    }

    const data = await response.json();
    const [title, ...description] = data.translatedText.split('\n');
    
    return {
      ...item,
      title: title.trim(),
      description: description.join('\n').trim(),
      translated: true
    };
  }

  async translateWithMyMemory(item) {
    const text = encodeURIComponent(item.title + '\n' + (item.description || ''));
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${text}&langpair=en|ru`
    );

    if (!response.ok) {
      throw new Error('MyMemory API error');
    }

    const data = await response.json();
    const [title, ...description] = data.responseData.translatedText.split('\n');

    return {
      ...item,
      title: title.trim(),
      description: description.join('\n').trim(),
      translated: true
    };
  }

  async translateWithYandex(item) {
    // Implementation for Yandex Translate API
    // Requires API key
    throw new Error('Yandex Translate not configured');
  }

  countCharacters(obj) {
    let count = 0;
    for (const key of ['title', 'description']) {
      if (obj[key]) {
        count += obj[key].length;
      }
    }
    return count;
  }

  resetDailyLimit() {
    this.usedToday = 0;
  }
}
