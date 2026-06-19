const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const fs = require('fs');
const { keep_alive, app } = require("./keep_alive");
keep_alive();

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
    var movementTimeout = null;

    bot = mineflayer.createBot({ host: host, port: port, username: username, version: version });

    function stopAllMovement() {
        ['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint'].forEach(ctrl => {
            try { bot.setControlState(ctrl, false); } catch(e) {}
        });
    }

    function randomMovement() {
        if (!botActive || connected === 0) return;

        // 8-20 saniye arası bekle (daha insani aralık)
        var waitTime = Math.floor(Math.random() * 12000) + 8000;

        movementTimeout = setTimeout(() => {
            if (!botActive || connected === 0) return;

            // Yumuşak bakış açısı değişimi
            var currentYaw = bot.entity.yaw;
            var currentPitch = bot.entity.pitch;
            var targetYaw = currentYaw + (Math.random() * 1.5) - 0.75;  // küçük açı değişimi
            var targetPitch = (Math.random() * 0.6) - 0.3;

            bot.look(targetYaw, targetPitch, false); // false = smooth look

            // %30 ihtimalle hiç hareket etme (sadece bak)
            if (Math.random() < 0.3) {
                randomMovement();
                return;
            }

            // Hareket süresi: 1.5-4 saniye arası (daha doğal)
            var moveDuration = Math.floor(Math.random() * 2500) + 1500;

            var actions = ['forward', 'forward', 'forward', 'back', 'left', 'right'];
            // forward ağırlıklı (gerçek oyuncular çoğunlukla ileri gider)
            var action = actions[Math.floor(Math.random() * actions.length)];

            // %40 ihtimalle sprint ekle
            var willSprint = Math.random() < 0.4;
            if (action === 'forward' && willSprint) {
                bot.setControlState('sprint', true);
            }

            bot.setControlState(action, true);

            // Hareket sırasında ara ara yön değiştir (gerçekçi görünüm)
            var midLookTimeout = setTimeout(() => {
                if (!botActive || connected === 0) return;
                var midYaw = targetYaw + (Math.random() * 0.4) - 0.2;
                bot.look(midYaw, targetPitch, false);
            }, moveDuration / 2);

            movementTimeout = setTimeout(() => {
                clearTimeout(midLookTimeout);
                stopAllMovement();
                randomMovement();
            }, moveDuration);

        }, waitTime);
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

        setTimeout(() => {
            connected = 1;
            console.log("Giriş başarılı, hareketler başlatıldı!");
            randomMovement();
        }, 7000);
    });

    bot.on('error', function (err) {
        console.log('Hata oluştu:', err.message);
    });

    bot.on('end', () => {
        botActive = false;
        connected = 0;
        if (movementTimeout) clearTimeout(movementTimeout);
        stopAllMovement();
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

checkAndConnect();
setInterval(checkAndConnect, 60000);

app.get('/api/status', (req, res) => res.json({ active: botActive }));
app.post('/api/start', (req, res) => { if (!botActive) { createBot(); res.json({ message: 'Başlatıldı' }); } else { res.json({ message: 'Zaten aktif' }); } });
app.post('/api/stop', (req, res) => { if(bot) { bot.quit(); botActive = false; res.json({ message: 'Durduruldu' }); } else { res.json({ message: 'Bot yok' }); } });
