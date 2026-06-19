const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const fs = require('fs');
const { keep_alive, app } = require("./keep_alive");
keep_alive();

let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);
var pi = 3.14159;
var moveinterval = 2;
var maxrandom = 5;
var actions = ['forward', 'back', 'left', 'right'];
var host = data["ip"];
var port = parseInt(data["port"]) || 25565;
var username = data["name"];
var version = data["version"] || "1.20.1";
var botActive = false;
var bot;

// Türkiye saati (UTC+3)
function getTurkeyTime() {
    var now = new Date(Date.now() + 3 * 60 * 60000);
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes() };
}

// 00:30 - 12:30 arası bot kapalı olmalı
function isOffWindow() {
    var t = getTurkeyTime();
    var totalMinutes = t.hour * 60 + t.minute;
    var offStart = 0 * 60 + 30;  // 00:30
    var offEnd = 9 * 60 + 0;   // 12:30
    return totalMinutes >= offStart && totalMinutes < offEnd;
}

function createBot() {
    if (botActive) return;
    botActive = true;
    var lasttime = -1;
    var moving = 0;
    var connected = 0;
    var lastaction;

    bot = mineflayer.createBot({ host: host, port: port, username: username, version: version });

    bot.on('login', function () {
        console.log("Logged In");
    });

    bot.on('spawn', function () {
        connected = 1;
        
        // 1. ADIM: Sunucuya ilk girdiğinde anında bu komut çalışır
        bot.chat('/register nexaria nexaria');
        
        // 2. ADIM: Giriş yaptıktan 3 saniye sonra bu komut çalışır
        setTimeout(function() {
            bot.chat('/register nexaria');
        }, 3000);
        
        // 3. ADIM: İkinci komuttan 3 saniye sonra (toplamda 6. saniyede) bu komut çalışır
        setTimeout(function() {
            bot.chat('/login nexaria');
        }, 6000);
    });

    bot.on('time', function () {
        if (connected < 1) return;
        if (lasttime < 0) {
            lasttime = bot.time.age;
        } else {
            var randomadd = Math.random() * maxrandom * 20;
            var interval = moveinterval * 20 + randomadd;
            if (bot.time.age - lasttime > interval) {
                if (moving == 1) {
                    bot.setControlState(lastaction, false);
                    moving = 0;
                    lasttime = bot.time.age;
                } else {
                    var yaw = Math.random() * pi - (0.5 * pi);
                    var pitch = Math.random() * pi - (0.5 * pi);
                    bot.look(yaw, pitch, false);
                    lastaction = actions[Math.floor(Math.random() * actions.length)];
                    bot.setControlState(lastaction, true);
                    moving = 1;
                    lasttime = bot.time.age;
                    bot.activateItem();
                }
            }
        }
    });

    bot.on('error', function (err) {
        console.log('Bot error:', err.message);
    });

    bot.on('end', function () {
        botActive = false;
        connected = 0;
        console.log('Bot ayrıldı. Hemen tekrar kontrol ediliyor...');
        setTimeout(checkAndConnect, 5000);
    });
}

function stopBot() {
    if (!botActive) return;
    console.log('Bot durduruluyor...');
    try { bot.quit(); } catch (e) {}
    botActive = false;
}

function pingServer(callback) {
    mc.ping({ host: host, port: port, closeTimeout: 8000 }, function(err, result) {
        callback(!err);
    });
}

// Her 1 dakikada sunucuyu kontrol et
function checkAndConnect() {
    var t = getTurkeyTime();
    var timeStr = t.hour + ':' + (t.minute < 10 ? '0' : '') + t.minute;

    if (isOffWindow()) {
        // Kapalı pencere: 00:30 - 12:30
        if (botActive) {
            console.log('[' + timeStr + '] Kapalı saat (00:30-12:30), bot çıkıyor...');
            stopBot();
        }
        return;
    }

    // Açık pencere: bot bağlı değilse ping at
    if (!botActive) {
        pingServer(function(online) {
            if (online) {
                console.log('[' + timeStr + '] Sunucu açık! Bot bağlanıyor...');
                createBot();
            } else {
                console.log('[' + timeStr + '] Sunucu kapalı, 1 dk sonra tekrar kontrol.');
            }
        });
    }
}

// Başlangıçta hemen kontrol et
checkAndConnect();

// Her 1 dakikada bir kontrol et
setInterval(checkAndConnect, 60 * 1000);

// API endpoint'leri
app.get('/api/status', function(req, res) {
    res.json({ active: botActive });
});

app.post('/api/start', function(req, res) {
    if (botActive) {
        return res.json({ message: 'Bot zaten aktif!' });
    }
    if (isOffWindow()) {
        return res.json({ message: 'Kapalı saat (00:30-12:30), başlatılamaz.' });
    }
    pingServer(function(online) {
        if (online) {
            createBot();
            res.json({ message: 'Bot başlatıldı!' });
        } else {
            res.json({ message: 'Sunucu kapalı, bot bağlanamıyor.' });
        }
    });
});

app.post('/api/stop', function(req, res) {
    if (!botActive) {
        return res.json({ message: 'Bot zaten kapalı!' });
    }
    stopBot();
    res.json({ message: 'Bot durduruldu.' });
});
