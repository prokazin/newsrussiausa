export class ApiService {
  constructor(bot, cache) {
    this.bot = bot;
    this.cache = cache;
  }

  async handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      let data;
      
      if (path === '/api/news') {
        data = await this.getNews();
      } else if (path === '/api/calendar') {
        data = await this.getCalendar();
      } else if (path === '/api/stats') {
        data = await this.getStats();
      } else {
        return new Response(JSON.stringify({ error: 'Not found' }), { 
          status: 404, 
          headers 
        });
      }

      return new Response(JSON.stringify(data), { headers });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers
      });
    }
  }

  async getNews() {
    const news = await this.cache.getRecentNews(7);
    return news.slice(0, 20);
  }

  async getCalendar() {
    const events = await this.cache.getEvents();
    const now = Date.now();
    const monthAhead = now + 30 * 24 * 60 * 60 * 1000;
    
    return events
      .filter(event => {
        const date = new Date(event.date).getTime();
        return date >= now && date <= monthAhead;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  async getStats() {
    const newsCount = await this.cache.getNewsCount();
    const eventsCount = await this.cache.getEventsCount();
    
    return {
      news: {
        total: newsCount,
        lastUpdate: new Date().toISOString()
      },
      events: {
        total: eventsCount,
        upcoming: await this.getUpcomingEventsCount()
      },
      system: {
        uptime: process.uptime ? process.uptime() : 0,
        memory: process.memoryUsage ? process.memoryUsage() : null
      }
    };
  }

  async getUpcomingEventsCount() {
    const events = await this.cache.getEvents();
    const now = Date.now();
    const monthAhead = now + 30 * 24 * 60 * 60 * 1000;
    
    return events.filter(event => {
      const date = new Date(event.date).getTime();
      return date >= now && date <= monthAhead;
    }).length;
  }
}
