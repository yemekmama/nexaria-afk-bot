const express = require('express');
const app = express();
const port = 5000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NexariaAFK Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #1a1a2e;
            color: #eee;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .card {
            background: #16213e;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            width: 320px;
        }
        h1 { font-size: 1.5rem; margin-bottom: 8px; color: #e94560; }
        .server { font-size: 0.85rem; color: #888; margin-bottom: 30px; }
        .status {
            display: inline-block;
            padding: 6px 18px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: bold;
            margin-bottom: 30px;
        }
        .status.online { background: #1a472a; color: #4ade80; }
        .status.offline { background: #4a1a1a; color: #f87171; }
        .btn {
            display: block;
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.2s;
            margin-bottom: 12px;
        }
        .btn:hover { opacity: 0.85; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-start { background: #4ade80; color: #1a1a2e; }
        .btn-stop { background: #f87171; color: #1a1a2e; }
        .msg { font-size: 0.8rem; color: #888; margin-top: 10px; min-height: 20px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>⛏️ NexariaAFK Bot</h1>
        <div class="server">nexariacraft.aternos.me</div>
        <div id="status" class="status offline">Kontrol ediliyor...</div>
        <button class="btn btn-start" id="btnStart" onclick="controlBot('start')">▶ Botu Başlat</button>
        <button class="btn btn-stop" id="btnStop" onclick="controlBot('stop')">⏹ Botu Durdur</button>
        <div class="msg" id="msg"></div>
    </div>
    <script>
        function updateStatus() {
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    var el = document.getElementById('status');
                    el.textContent = data.active ? '🟢 Bot Aktif' : '🔴 Bot Kapalı';
                    el.className = 'status ' + (data.active ? 'online' : 'offline');
                });
        }
        function controlBot(action) {
            var msg = document.getElementById('msg');
            msg.textContent = action === 'start' ? 'Başlatılıyor...' : 'Durduruluyor...';
            fetch('/api/' + action, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    msg.textContent = data.message;
                    setTimeout(updateStatus, 1500);
                });
        }
        updateStatus();
        setInterval(updateStatus, 5000);
    </script>
</body>
</html>`);
});

function keep_alive() {
    app.listen(port, '0.0.0.0', () => console.log('Afk bot is listening on http://0.0.0.0:' + port));
}

module.exports = { keep_alive, app };
