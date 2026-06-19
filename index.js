const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const fs = require('fs');
const { keep_alive, app } = require("./keep_alive");
keep_alive();

// Config dosyasını oku
let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

var host = data["ip"];
var port = parseInt(data["port"]) || 25565;
var username = data["name"];
var version = data["version"] || "1.20.1";
var botActive = false;
var bot;

function createBot() {
    if (botActive) return;
    botActive = true;
    var connected = 0;

    bot = mineflayer.createBot({ host: host, port: port, username: username, version: version });

    // Hareket döngüsünü başlatan fonksiyon
    function randomMovement() {
        if (!botActive || connected === 0) return;

        // 5 ile 15 saniye arasında rastgele bekle
        var nextMove = Math.floor(Math.random() * 10000) + 5000;
        
        setTimeout(() => {
            if (!botActive || connected === 0) return;
            
            // Rastgele yön ve bakış
            var yaw = (Math.random() * 6) - 3;
            var pitch = (Math.random() * 2) - 1;
            bot.look(yaw, pitch, true);
            
            // Rastgele hareket
            var actions = ['forward', 'back', 'left', 'right'];
            var action = actions[Math.floor(Math.random() * actions.length)];
            
            bot.setControlState(action, true);
            
            // 1 saniye yürü ve dur
            setTimeout(() => {
                bot.setControlState(action, false);
                randomMovement(); // Döngüyü tekrarla
            }, 1000);
        }, nextMove);
    }

    bot.on('login', function () {
        console.log("Sunucuya giriş yapıldı.");
    });

    bot.on('spawn', function () {
        connected = 0;
        console.log("Spawn olundu, kayıt/giriş yapılıyor...");
        
        bot.chat('/register nexaria nexaria');
        
        setTimeout(() => {
            bot.chat('/login nexaria');
        }, 5000);
        
        // 7 saniye sonra hareketleri başlat
        setTimeout(() => { 
            connected = 1; 
            console.log("Giriş başarılı, hareketler başlatıldı!");
            randomMovement(); // <-- Hareket döngüsü burada tetikleniyor
        }, 7000);
    });

    bot.on('error', function (err) {
        console.log('Hata oluştu:', err.message);
    });

    bot.on('end', () => { 
        botActive = false; 
        connected = 0; 
        console.log("Bot düştü, 5 saniye sonra tekrar bağlanıyor...");
        setTimeout(checkAndConnect, 5000); 
    });
}

function checkAndConnect() {
    if (!botActive) {
        mc.ping({ host: host, port: port, closeTimeout: 8000 }, (err) => {
            if (!err) createBot();
            else console.log("Sunucu kapalı, bekleniyor...");
        });
    }
}

// Başlangıç kontrolü
checkAndConnect();
// Her dakika sunucu kontrolü
setInterval(checkAndConnect, 60000);

// API endpointleri (Railway için)
app.get('/api/status', (req, res) => res.json({ active: botActive }));
app.post('/api/start', (req, res) => { if (!botActive) { createBot(); res.json({ message: 'Başlatıldı' }); } else { res.json({ message: 'Zaten aktif' }); } });
app.post('/api/stop', (req, res) => { if(bot) { bot.quit(); botActive = false; res.json({ message: 'Durduruldu' }); } else { res.json({ message: 'Bot yok' }); } });
