export class CalendarService {
  constructor(cache) {
    this.cache = cache;
  }

  async updateEvents() {
    const events = await this.fetchEvents();
    await this.cache.storeEvents(events);
    return events;
  }

  async fetchEvents() {
    // This would typically fetch from an API
    // For now, return mock data
    return [
      {
        id: '1',
        date: new Date(Date.now() + 86400000).toISOString(),
        title: 'Важное событие 1',
        description: 'Описание важного события',
        importance: 'high',
        category: 'military'
      },
      {
        id: '2',
        date: new Date(Date.now() + 172800000).toISOString(),
        title: 'Среднее событие 2',
        description: 'Описание среднего события',
        importance: 'medium',
        category: 'diplomatic'
      }
    ];
  }

  async getEvents(month = 1) {
    const allEvents = await this.cache.getEvents();
    const now = Date.now();
    const monthAhead = now + month * 30 * 24 * 60 * 60 * 1000;

    return allEvents
      .filter(event => {
        const eventDate = new Date(event.date).getTime();
        return eventDate >= now && eventDate <= monthAhead;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  formatEventItem(event) {
    const importanceIcon = event.importance === 'high' ? '🔴' : '🟡';
    const date = new Date(event.date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `${importanceIcon} ${event.title}\n` +
           `📅 ${date}\n` +
           `📝 ${event.description}\n` +
           `🏷️ ${event.category}`;
  }
}
