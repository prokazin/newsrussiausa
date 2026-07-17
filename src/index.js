import { BotService } from './bot.js';
import { ApiService } from './api.js';
import { AdminService } from './admin.js';
import { AppService } from './app.js';
import { RssParser } from './services/rss-parser.js';
import { Translator } from './services/translator.js';
import { CalendarService } from './services/calendar.js';
import { Deduplicator } from './services/deduplicator.js';
import { CacheManager } from './utils/cache.js';
import { Logger } from './utils/logger.js';

const logger = new Logger();

// Initialize services with environment variables
let cache, rssParser, translator, calendar, deduplicator, bot, api, admin, app;

export default {
  async fetch(request, env, ctx) {
    // Initialize services on first request
    if (!cache) {
      cache = new CacheManager(env.NEWS_KV);
      rssParser = new RssParser(cache);
      translator = new Translator(cache);
      calendar = new CalendarService(cache);
      deduplicator = new Deduplicator(cache);
      bot = new BotService(env.TELEGRAM_BOT_TOKEN);
      api = new ApiService(bot, cache);
      admin = new AdminService(env.ADMIN_PASSWORD);
      app = new AppService(bot, cache);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Webhook for Telegram
    if (path === '/webhook') {
      return await bot.handleWebhook(request);
    }

    // Mini-app main page
    if (path === '/') {
      return await app.renderApp(request);
    }

    // API endpoints
    if (path.startsWith('/api/')) {
      return await api.handleRequest(request);
    }

    // Admin panel
    if (path === '/admin' || path.startsWith('/admin/')) {
      return await admin.handleRequest(request);
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    // Initialize services for scheduled tasks
    if (!cache) {
      cache = new CacheManager(env.NEWS_KV);
      rssParser = new RssParser(cache);
      translator = new Translator(cache);
      calendar = new CalendarService(cache);
      deduplicator = new Deduplicator(cache);
      bot = new BotService(env.TELEGRAM_BOT_TOKEN);
    }

    try {
      logger.info('Starting scheduled tasks...');
      
      // Collect news every 3 hours
      await collectNews(env);
      
      // Update calendar daily
      await calendar.updateEvents();
      
      // Cleanup old data
      await cleanupOldData();
      
      logger.info('Scheduled tasks completed');
    } catch (error) {
      logger.error('Scheduled tasks failed:', error);
      await notifyAdmin(error, env);
    }
  }
};

async function collectNews(env) {
  const sources = [
    'https://www.ukrinform.ua/rss',
    'https://www.bbc.com/ukrainian/feed',
    'https://www.nytimes.com/section/world/europe/feed',
    'https://www.washingtonpost.com/rss/world/europe',
    'https://www.politico.eu/feed',
    'https://www.euronews.com/rss'
  ];

  let allNews = [];
  
  for (const source of sources) {
    try {
      const news = await rssParser.parse(source);
      allNews = allNews.concat(news);
    } catch (error) {
      logger.error(`Failed to parse ${source}:`, error);
    }
  }

  // Deduplicate
  const uniqueNews = await deduplicator.deduplicate(allNews);

  // Translate to Russian
  const translatedNews = [];
  for (const item of uniqueNews) {
    try {
      const translated = await translator.translate(item);
      translatedNews.push(translated);
    } catch (error) {
      logger.error('Translation failed:', error);
      translatedNews.push(item);
    }
  }

  // Store in KV
  await cache.storeNews(translatedNews);

  // Publish to Telegram channel
  await bot.publishNews(translatedNews);

  return translatedNews;
}

async function cleanupOldData() {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await cache.cleanupOldNews(sevenDaysAgo);
}

async function notifyAdmin(error, env) {
  const bot = new BotService(env.TELEGRAM_BOT_TOKEN);
  await bot.sendMessage(
    env.ADMIN_CHAT_ID,
    `⚠️ Error in news aggregator:\n${error.message}`
  );
}
