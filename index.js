// index.js (Anticheat için en son ve en 'gevşek' versiyon)
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

    bot = mineflayer.createBot({ host: host, port: port, username: username, version: version });

    bot.on('spawn', function () {
        connected = 0;
        bot.chat('/register nexaria nexaria');
        setTimeout(() => bot.chat('/login nexaria'), 5000);
        setTimeout(() => { connected = 1; console.log("Bot aktif."); }, 7000);
    });

    // DAHA İNSANSI HAREKET: Sabit döngü yerine rastgele zamanlayıcı
    function randomMovement() {
        if (!botActive || connected === 0) return;

        // Rastgele 5 ile 15 saniye arası bekle
        var nextMove = Math.floor(Math.random() * 10000) + 5000;
        
        setTimeout(() => {
            if (!botActive) return;
            
            // Rastgele yön ve hareket
            var yaw = (Math.random() * 6) - 3;
            var pitch = (Math.random() * 2) - 1;
            bot.look(yaw, pitch, true);
            
            var actions = ['forward', 'back', 'left', 'right'];
            var action = actions[Math.floor(Math.random() * actions.length)];
            
            bot.setControlState(action, true);
            setTimeout(() => {
                bot.setControlState(action, false);
                randomMovement(); // Döngüyü sürdür
            }, 1000); // 1 saniye yürü ve dur
        }, nextMove);
    }

    randomMovement();

    bot.on('end', () => { botActive = false; connected = 0; setTimeout(checkAndConnect, 5000); });
}

function checkAndConnect() {
    if (!botActive) {
        mc.ping({ host: host, port: port, closeTimeout: 8000 }, (err) => {
            if (!err) createBot();
        });
    }
}

checkAndConnect();
setInterval(checkAndConnect, 60000);

