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

    bot = mineflayer.createBot({ 
        host: host, 
        port: port, 
        username: username, 
        version: version,
        physicsEnabled: true
    });

    // Grim için physics patch - her tick'te onGround'u zorla
    function applyGroundPatch() {
        if (!bot || !bot.entity) return;
        if (bot.entity.velocity.y === 0 || bot.entity.onGround) {
            bot.entity.onGround = true;
            bot.entity.velocity.x = 0;
            bot.entity.velocity.y = 0;
            bot.entity.velocity.z = 0;
        }
    }

    function stopAllMovement() {
        ['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint'].forEach(ctrl => {
            try { bot.setControlState(ctrl, false); } catch(e) {}
        });
    }

    function randomMovement() {
        if (!botActive || connected === 0) return;

        var waitTime = Math.floor(Math.random() * 12000) + 8000;

        movementTimeout = setTimeout(() => {
            if (!botActive || connected === 0) return;

            var currentYaw = bot.entity.yaw;
            var targetYaw = currentYaw + (Math.random() * 1.5) - 0.75;
            var targetPitch = (Math.random() * 0.6) - 0.3;

            bot.look(targetYaw, targetPitch, false);

            if (Math.random() < 0.3) {
                randomMovement();
                return;
            }

            var moveDuration = Math.floor(Math.random() * 2500) + 1500;
            var actions = ['forward', 'forward', 'forward', 'back', 'left', 'right'];
            var action = actions[Math.floor(Math.random() * actions.length)];

            if (action === 'forward' && Math.random() < 0.4) {
                bot.setControlState('sprint', true);
            }

            bot.setControlState(action, true);

            var midLookTimeout = setTimeout(() => {
                if (!botActive || connected === 0) return;
                bot.look(targetYaw + (Math.random() * 0.4) - 0.2, targetPitch, false);
            }, moveDuration / 2);

            movementTimeout = setTimeout(() => {
                clearTimeout(midLookTimeout);
                stopAllMovement();
                randomMovement();
            }, moveDuration);

        }, waitTime);
    }

    function waitForGround() {
        if (!bot || !bot.entity) return;
        applyGroundPatch();
        if (bot.entity.onGround) {
            connected = 1;
            console.log("Yerde, hareketler başlatıldı!");
            randomMovement();
        } else {
            setTimeout(waitForGround, 500);
        }
    }

    bot.on('login', function () {
        console.log("Sunucuya giriş yapıldı.");
    });

    bot.on('spawn', function () {
        connected = 0;
        console.log("Spawn olundu, kayıt/giriş yapılıyor...");

        // Velocity sıfırla
        bot.entity.velocity.x = 0;
        bot.entity.velocity.y = 0;
        bot.entity.velocity.z = 0;
        bot.entity.onGround = true;

        bot.chat('/register nexaria nexaria');

        setTimeout(() => {
            bot.chat('/login nexaria');
        }, 5000);

        setTimeout(waitForGround, 7000);
    });

    // Her physics tick'te ground patch uygula
    bot.on('physicsTick', function () {
        if (connected === 0) return;
        applyGroundPatch();
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
