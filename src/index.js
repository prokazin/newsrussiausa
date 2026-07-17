async fetch(request, env, ctx) {
  try {
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

    if (path === '/webhook') {
      return await bot.handleWebhook(request);
    }

    if (path === '/') {
      return await app.renderApp(request);
    }

    if (path.startsWith('/api/')) {
      return await api.handleRequest(request);
    }

    if (path === '/admin' || path.startsWith('/admin/')) {
      return await admin.handleRequest(request);
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return new Response(`Error: ${error.message}\n\nStack:\n${error.stack}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
},
