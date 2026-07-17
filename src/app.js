export class AppService {
  constructor(bot, cache) {
    this.bot = bot;
    this.cache = cache;
  }

  async renderApp(request) {
    const html = await this.getAppHTML();
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
  }

  async getAppHTML() {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Новостной агрегатор</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: var(--tg-theme-bg-color, #000);
            color: var(--tg-theme-text-color, #fff);
            min-height: 100vh;
            padding: 20px;
            padding-bottom: 80px;
        }

        .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px;
        }

        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 5px;
        }

        .tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            border: none;
            background: transparent;
            color: var(--tg-theme-hint-color, #888);
            font-size: 16px;
            font-weight: 500;
            border-radius: 12px;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .tab.active {
            background: var(--tg-theme-button-color, #007AFF);
            color: var(--tg-theme-button-text-color, #fff);
            box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
        }

        .news-item {
            margin-bottom: 15px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .news-item:active {
            transform: scale(0.98);
        }

        .news-title {
            font-size: 17px;
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .news-description {
            font-size: 15px;
            opacity: 0.7;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .news-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
            font-size: 13px;
            opacity: 0.5;
        }

        .event-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            margin-bottom: 12px;
        }

        .event-date {
            min-width: 50px;
            text-align: center;
        }

        .event-day {
            font-size: 24px;
            font-weight: 700;
            display: block;
        }

        .event-month {
            font-size: 12px;
            opacity: 0.5;
        }

        .event-content {
            flex: 1;
        }

        .event-title {
            font-weight: 600;
            margin-bottom: 4px;
        }

        .event-description {
            font-size: 14px;
            opacity: 0.6;
        }

        .importance-high {
            border-left: 4px solid #FF3B30;
        }

        .importance-medium {
            border-left: 4px solid #FF9500;
        }

        .loading {
            text-align: center;
            padding: 40px 0;
            opacity: 0.5;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: var(--tg-theme-button-color, #007AFF);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .empty-state {
            text-align: center;
            padding: 40px 0;
            opacity: 0.5;
        }

        .refresh-btn {
            display: inline-block;
            padding: 10px 30px;
            background: var(--tg-theme-button-color, #007AFF);
            color: var(--tg-theme-button-text-color, #fff);
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.3s ease;
        }

        .refresh-btn:active {
            transform: scale(0.95);
        }

        .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge-high {
            background: #FF3B30;
            color: #fff;
        }

        .badge-medium {
            background: #FF9500;
            color: #fff;
        }

        @media (max-width: 600px) {
            body {
                padding: 10px;
                padding-bottom: 70px;
            }
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="glass" style="margin-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 5px;">
                📰 Новостной агрегатор
            </h1>
            <p style="opacity: 0.5; font-size: 14px;">
                Автоматический сбор и перевод новостей
            </p>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="switchTab('news')">📰 Новости</button>
            <button class="tab" onclick="switchTab('calendar')">📅 Календарь</button>
        </div>

        <div id="newsTab">
            <div id="newsContent">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Загрузка новостей...</p>
                </div>
            </div>
        </div>

        <div id="calendarTab" style="display: none;">
            <div id="calendarContent">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Загрузка календаря...</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        let currentTab = 'news';

        function switchTab(tab) {
            currentTab = tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelector(\`.tab[onclick="switchTab('${tab}')"]\`).classList.add('active');
            
            document.getElementById('newsTab').style.display = tab === 'news' ? 'block' : 'none';
            document.getElementById('calendarTab').style.display = tab === 'calendar' ? 'block' : 'none';

            if (tab === 'news') {
                loadNews();
            } else {
                loadCalendar();
            }
        }

        async function loadNews() {
            const container = document.getElementById('newsContent');
            try {
                const response = await fetch('/api/news');
                const news = await response.json();
                
                if (news.length === 0) {
                    container.innerHTML = \`
                        <div class="empty-state">
                            <p>Нет новостей</p>
                            <button class="refresh-btn" onclick="loadNews()">🔄 Обновить</button>
                        </div>
                    \`;
                    return;
                }

                container.innerHTML = news.map(item => \`
                    <div class="glass news-item" onclick="openNews('${item.id}')">
                        <div class="news-title">${item.title}</div>
                        <div class="news-description">${item.description || ''}</div>
                        <div class="news-meta">
                            <span>📌 ${item.source || 'Источник'}</span>
                            <span>🕒 ${new Date(item.pubDate).toLocaleString()}</span>
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                container.innerHTML = \`
                    <div class="empty-state">
                        <p>⚠️ Ошибка загрузки новостей</p>
                        <button class="refresh-btn" onclick="loadNews()">🔄 Попробовать снова</button>
                    </div>
                \`;
            }
        }

        async function loadCalendar() {
            const container = document.getElementById('calendarContent');
            try {
                const response = await fetch('/api/calendar');
                const events = await response.json();
                
                if (events.length === 0) {
                    container.innerHTML = \`
                        <div class="empty-state">
                            <p>Нет событий на ближайший месяц</p>
                        </div>
                    \`;
                    return;
                }

                container.innerHTML = events.map(event => \`
                    <div class="glass event-item importance-${event.importance}">
                        <div class="event-date">
                            <span class="event-day">${new Date(event.date).getDate()}</span>
                            <span class="event-month">${new Date(event.date).toLocaleString('ru', { month: 'short' })}</span>
                        </div>
                        <div class="event-content">
                            <div class="event-title">
                                ${event.title}
                                <span class="badge badge-${event.importance}">${event.importance}</span>
                            </div>
                            <div class="event-description">${event.description}</div>
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                container.innerHTML = \`
                    <div class="empty-state">
                        <p>⚠️ Ошибка загрузки календаря</p>
                    </div>
                \`;
            }
        }

        function openNews(id) {
            tg.showAlert('Открытие новости...');
            // In production, this would open a detailed view
        }

        // Initial load
        loadNews();

        // Auto-refresh every 3 minutes
        setInterval(() => {
            if (currentTab === 'news') {
                loadNews();
            } else {
                loadCalendar();
            }
        }, 180000);
    </script>
</body>
</html>
    `;
  }
}
