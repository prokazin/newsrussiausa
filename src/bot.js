export class BotService {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.publishedIds = new Set();
  }

  async handleWebhook(request) {
    try {
      const update = await request.json();
      
      if (update.message) {
        await this.handleMessage(update.message);
      }
      
      if (update.callback_query) {
        await this.handleCallback(update.callback_query);
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Webhook error:', error);
      return new Response('Error', { status: 500 });
    }
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;

    if (text === '/start') {
      await this.sendStartMessage(chatId);
    } else if (text === '/news') {
      await this.sendLatestNews(chatId);
    } else if (text === '/calendar') {
      await this.sendCalendar(chatId);
    } else if (text.startsWith('/admin')) {
      // Admin commands handled elsewhere
    }
  }

  async sendStartMessage(chatId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📰 Открыть приложение', web_app: { url: 'https://your-worker-url.workers.dev/' } },
          { text: '📅 Календарь', callback_data: 'calendar' }
        ],
        [
          { text: '📊 Статистика', callback_data: 'stats' },
          { text: 'ℹ️ Помощь', callback_data: 'help' }
        ]
      ]
    };

    await this.sendMessage(chatId, 
      'Добро пожаловать в агрегатор новостей о войне в Украине!\n\n' +
      '📱 Откройте мини-приложение для просмотра всех новостей\n' +
      '📅 Следите за важными событиями в календаре\n' +
      '🔔 Новости публикуются каждые 3 часа',
      keyboard
    );
  }

  async sendLatestNews(chatId) {
    const news = await this.getLatestNews();
    if (news.length === 0) {
      await this.sendMessage(chatId, 'Нет новых новостей');
      return;
    }

    for (const item of news.slice(0, 5)) {
      const message = this.formatNewsItem(item);
      await this.sendMessage(chatId, message);
    }
  }

  async publishNews(newsItems) {
    const channelId = await this.getChannelId();
    const published = 0;

    for (const item of newsItems) {
      if (this.publishedIds.has(item.id)) continue;
      if (published >= 10) break;

      try {
        const message = this.formatNewsItem(item);
        await this.sendMessage(channelId, message);
        this.publishedIds.add(item.id);
        published++;
      } catch (error) {
        console.error('Failed to publish news:', error);
      }
    }

    return published;
  }

  formatNewsItem(item) {
    return `📰 ${item.title}\n\n` +
           `${item.description || ''}\n\n` +
           `🕒 ${new Date(item.pubDate).toLocaleString()}\n` +
           `📌 ${item.source}\n` +
           `${item.link ? `🔗 ${item.link}` : ''}`;
  }

  async sendMessage(chatId, text, keyboard = null) {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };

    if (keyboard) {
      payload.reply_markup = JSON.stringify(keyboard);
    }

    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  async getChannelId() {
    // Implementation to get channel ID
    return '@your_channel_username';
  }

  async getLatestNews() {
    // Get news from cache
    return [];
  }

  async sendCalendar(chatId) {
    // Send calendar events
  }
}
