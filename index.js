const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const fs = require('fs');
const { keep_alive, app } = require("./keep_alive");
keep_alive();

let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);
var pi = 3.14159;
// Anticheat'i kandırmak için süreleri biraz daha esnettim
var moveinterval = 4; 
var maxrandom = 8;    
var actions = ['forward', 'back', 'left', 'right'];
var host = data["ip"];
var port = parseInt(data["port"]) || 25565;
var username = data["name"];
var version = data["version"] || "1.20.1";
var botActive = false;
var bot;

function getTurkeyTime() {
    var now = new Date(Date.now() + 3 * 60 * 60000);
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes() };
}

function isOffWindow() {
    var t = getTurkeyTime();
    var totalMinutes = t.hour * 60 + t.minute;
    var offStart = 0 * 60 + 30;
    var offEnd = 9 * 60 + 0;
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
        connected = 0;
        
        bot.chat('/register nexaria nexaria');
        
        setTimeout(function() {
            bot.chat('/register nexaria');
        }, 3000);
        
        setTimeout(function() {
            bot.chat('/login nexaria');
            
            setTimeout(function() {
                connected = 1;
                console.log("Giriş tamamlandı, bot hareketleri başladı.");
            }, 1000);
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
                    // Hareketleri ayırarak anticheat'in şüphelenmesini engelle
                    var yaw = Math.random() * pi - (0.5 * pi);
                    var pitch = Math.random() * pi - (0.5 * pi);
                    bot.look(yaw, pitch, false);
                    
                    lastaction = actions[Math.floor(Math.random() * actions.length)];
                    bot.setControlState(lastaction, true);
                    moving = 1;
                    lasttime = bot.time.age;
                    
                    // activateItem işlemine ufak bir gecikme ekleyerek "insansı" yapıyoruz
                    setTimeout(() => {
                        bot.activateItem();
                    }, 400); 
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
        console.log('Bot ayrıldı. Yeniden deneniyor...');
        setTimeout(checkAndConnect, 5000);
    });
}

function stopBot() {
    if (!botActive) return;
    try { bot.quit(); } catch (e) {}
    botActive = false;
}

function pingServer(callback) {
    mc.ping({ host: host, port: port, closeTimeout: 8000 }, function(err, result) {
        callback(!err);
    });
}

function checkAndConnect() {
    var t = getTurkeyTime();
    if (isOffWindow()) {
        if (botActive) stopBot();
        return;
    }

    if (!botActive) {
        pingServer(function(online) {
            if (online) createBot();
        });
    }
}

checkAndConnect();
setInterval(checkAndConnect, 60 * 1000);

app.get('/api/status', function(req, res) { res.json({ active: botActive }); });
app.post('/api/start', function(req, res) { 
    if (!botActive && !isOffWindow()) { createBot(); res.json({ message: 'Başlatıldı' }); }
    else { res.json({ message: 'Zaten aktif veya kapalı saat' }); }
});
app.post('/api/stop', function(req, res) { stopBot(); res.json({ message: 'Durduruldu' }); });
