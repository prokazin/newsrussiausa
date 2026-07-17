export class AdminService {
  constructor(password) {
    this.password = password;
  }

  async handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Check authentication
    const auth = request.headers.get('Authorization');
    if (!auth || !this.verifyAuth(auth)) {
      return this.renderLoginPage();
    }

    if (path === '/admin') {
      return this.renderAdminPage();
    } else if (path === '/admin/api/stats') {
      return this.handleStatsAPI(request);
    } else if (path === '/admin/api/cache') {
      return this.handleCacheAPI(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  verifyAuth(auth) {
    const [type, token] = auth.split(' ');
    if (type !== 'Bearer') return false;
    return token === this.password;
  }

  renderLoginPage() {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Login</title>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #1a1a1a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #fff;
          }
          .login {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 20px;
            width: 320px;
          }
          h1 {
            text-align: center;
            margin-bottom: 30px;
            font-weight: 300;
          }
          input {
            width: 100%;
            padding: 15px;
            margin-bottom: 20px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            color: #fff;
            font-size: 16px;
            box-sizing: border-box;
          }
          input:focus {
            outline: none;
            border-color: #007AFF;
          }
          button {
            width: 100%;
            padding: 15px;
            background: #007AFF;
            border: none;
            border-radius: 12px;
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          }
          button:hover {
            background: #0055CC;
          }
        </style>
      </head>
      <body>
        <div class="login">
          <h1>🔐 Admin Panel</h1>
          <form id="loginForm">
            <input type="password" id="password" placeholder="Enter password" required>
            <button type="submit">Login</button>
          </form>
        </div>
        <script>
          document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const auth = btoa(':' + password);
            fetch('/admin', {
              headers: {
                'Authorization': 'Bearer ' + password
              }
            }).then(r => {
              if (r.ok) {
                window.location.href = '/admin';
              } else {
                alert('Invalid password');
              }
            });
          });
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 401
    });
  }

  renderAdminPage() {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Dashboard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: #1a1a1a;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            min-height: 100vh;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
          }
          .header h1 {
            font-weight: 300;
          }
          .logout-btn {
            padding: 10px 20px;
            background: #FF3B30;
            border: none;
            border-radius: 10px;
            color: #fff;
            cursor: pointer;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(20px);
            padding: 20px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .stat-value {
            font-size: 32px;
            font-weight: 700;
            margin: 10px 0;
          }
          .stat-label {
            opacity: 0.5;
          }
          .actions {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
          }
          .actions h2 {
            margin-bottom: 20px;
            font-weight: 300;
          }
          .action-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
          }
          .action-btn {
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 10px;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          .action-btn:hover {
            background: rgba(255,255,255,0.2);
          }
          .logs {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 15px;
          }
          .logs h2 {
            margin-bottom: 20px;
            font-weight: 300;
          }
          .log-item {
            padding: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-family: monospace;
            font-size: 13px;
          }
          .log-time {
            opacity: 0.5;
            margin-right: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Admin Dashboard</h1>
            <button class="logout-btn" onclick="logout()">Logout</button>
          </div>

          <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
              <div class="stat-label">Total News</div>
              <div class="stat-value" id="totalNews">0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Upcoming Events</div>
              <div class="stat-value" id="upcomingEvents">0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Cache Size</div>
              <div class="stat-value" id="cacheSize">0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Uptime</div>
              <div class="stat-value" id="uptime">0</div>
            </div>
          </div>

          <div class="actions">
            <h2>⚙️ Actions</h2>
            <div class="action-grid">
              <button class="action-btn" onclick="clearCache()">🗑️ Clear Cache</button>
              <button class="action-btn" onclick="updateNews()">🔄 Update News</button>
              <button class="action-btn" onclick="updateCalendar()">📅 Update Calendar</button>
              <button class="action-btn" onclick="exportData()">📤 Export Data</button>
            </div>
          </div>

          <div class="logs">
            <h2>📋 Recent Logs</h2>
            <div id="logsContainer">
              <div class="log-item">
                <span class="log-time">${new Date().toLocaleString()}</span>
                System initialized
              </div>
            </div>
          </div>
        </div>

        <script>
          async function loadStats() {
            try {
              const response = await fetch('/admin/api/stats');
              const stats = await response.json();
              
              document.getElementById('totalNews').textContent = stats.news.total || 0;
              document.getElementById('upcomingEvents').textContent = stats.events.upcoming || 0;
              document.getElementById('cacheSize').textContent = stats.cache.size || 'N/A';
              document.getElementById('uptime').textContent = Math.round(stats.system.uptime / 3600) + 'h';
            } catch (error) {
              console.error('Failed to load stats:', error);
            }
          }

          async function clearCache() {
            if (confirm('Are you sure you want to clear the cache?')) {
              try {
                await fetch('/admin/api/cache', { method: 'DELETE' });
                alert('Cache cleared successfully');
                loadStats();
              } catch (error) {
                alert('Failed to clear cache');
              }
            }
          }

          async function updateNews() {
            if (confirm('Update news now?')) {
              try {
                await fetch('/admin/api/update/news', { method: 'POST' });
                alert('News update triggered');
              } catch (error) {
                alert('Failed to update news');
              }
            }
          }

          async function updateCalendar() {
            if (confirm('Update calendar now?')) {
              try {
                await fetch('/admin/api/update/calendar', { method: 'POST' });
                alert('Calendar update triggered');
              } catch (error) {
                alert('Failed to update calendar');
              }
            }
          }

          function exportData() {
            window.location.href = '/admin/api/export';
          }

          function logout() {
            window.location.href = '/admin';
          }

          loadStats();
          setInterval(loadStats, 60000);
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  async handleStatsAPI(request) {
    // Implementation for stats API
    return new Response(JSON.stringify({
      news: { total: 150 },
      events: { upcoming: 12 },
      cache: { size: '2.3 MB' },
      system: { uptime: 86400 }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleCacheAPI(request) {
    if (request.method === 'DELETE') {
      // Clear cache implementation
      return new Response(JSON.stringify({ success: true }));
    }
    return new Response('Method not allowed', { status: 405 });
  }
}
