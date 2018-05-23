const Discord = require('discord.js');
const bot = new Discord.Client();
const ytdl = require('ytdl-core');
const request = require('request');
const fs = require('fs');
const getYouTubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');

// just a few variables
var isPlaying = false;
var queue = [];
var dispatcher = null;
let channel;
var currentsong = null;
var ableToPlayMusic = true;
var counter = 1;

// get the whole information of settings.json
var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));
const yt_api_key = config.yt_api_key;
const bot_controller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;

// read the information from presence.json
var presence = JSON.parse(fs.readFileSync('./presence.json', 'utf-8'));
const game = presence.game;
const status = presence.status;
var volume = presence.volume;

// read some other guild information
var utils = JSON.parse(fs.readFileSync('./utils.json', 'utf-8'));
const verified_role = utils.verified_role;
const member_role = utils.member_role;

bot.on('ready', (ready) => {
    bot.user.setPresence({ game: { name: game, type: 3 }, status: status })
    console.log(`Logged in as ${bot.user.tag}!`)
    //bot.channels.find("name", "global").send('Hello guys')

    channel = bot.channels.find("name", "Music")

    channel.join()
        .then(connection => console.log('Connected'))
        .catch(console.error);
});

bot.on('guildMemberAdd', function (member) {
    member.addRole(member.guild.roles.find("name", member_role))
        .then(console.log(member.displayName + ', joined the server.'));
    member.sendMessage('welcome to the server. Have a nice time. :wink:');
});

bot.on('message', function (message) {
    const msg = message.content.toLowerCase();                  // entire message
    const args = message.content.split(' ').slice(1).join(" "); // splits at the first blank space
    const member = message.author.id;                           // author of the message
    const youtube = bot.emojis.find("name", "youtube");         // youtube emoji

    // role = Verified
    if (message.channel.name == 'bot' && message.member.roles.has('270940160366084097')) {
        // Play a song
        // Or if currently playing a song
        // add to the queue
        if (msg.startsWith(prefix + 'play')) {
            if (ableToPlayMusic) {
                // If a song is current playing the bot will save it to the queue
                if (queue.length > 0 || isPlaying == true) {
                    if (args.indexOf('wwww.youtube.com')) {
                        getID(args, function (id) {
                            add_to_queue(id);
                            embed(id, message);
                            console.log(queue.length + '');
                        });
                    }
                    else {
                        message.reply('unknown youtube link!');
                    }
                }
                // Else if no song is current playing the bot starts with the song
                else {
                    if (args.indexOf('wwww.youtube.com')) {
                        isPlaying = true;
                        getID(args, function (id) {
                            queue.push("placeholder");
                            setTimeout(() => playMusic(id, message), 200);
                            fetchVideoInfo(id).then(function (videoInfo) {
                                message.channel.send('**Playing: ** :notes: `' + videoInfo.title + '` - Now!');
                            });
                        });
                        console.log(queue.length + '');
                    }
                    else {
                        message.reply('unknown youtube link!');
                    }
                }
            } else {
                message.reply('I am not able to play some music... ehhhckr!');
            }
        }
        // The bot send you an embed where you can see the whole queue
        // within the titles 
        else if (msg.startsWith(prefix + 'queue')) {
            // Would be filled when we have a database
            message.reply('we, the server team, are working on a database. If we are finished this function does work!');
        }
        // Skip the current song
        // Or
        // Skip the stream
        else if (msg.startsWith(prefix + 'skip')) {
            if (message.member.voiceChannel.equals(channel)) {
                skip_song(message);
            }
            else {
                message.reply('you are not in the same voice channel!');
            }
        }
        // Stop the queue
        // Or
        // Stop the stream
        else if (msg.startsWith(prefix + 'stop')) {
            stop_song();
            message.channel.send(':x: **Stopped the stream!**');
        }
        // Move the Bot to your channel or in the channel you wrote right next to !move
        // If you are not in a channel, the bot doesn't move
        // and you get a info-message
        else if (msg.startsWith(prefix + 'move')) {
            if (isPlaying != true) {
                if (msg.length > 5 && message.member.voiceChannel != null) {
                    try {
                        var target = message.guild.channels.find("name", args).id;
                        channel = message.guild.channels.get(target);
                        channel.join()
                            .then(connection => console.log('Moved'))
                            .catch(console.error);
                    }
                    catch (error) {
                        message.reply("can't find this channel!");
                    }
                }
                else if (message.member.voiceChannel != null) {
                    channel = message.member.voiceChannel;
                    channel.join()
                        .then(connection => console.log('Moved'))
                        .catch(console.error);
                }
                else {
                    message.reply('you are not in a voice channel!');
                }
            }
            else {
                message.reply('sry, but I am playing music atm!');
            }
        }
        // Shows you the info of the current playing song
        // There are information like e.g: Title, Owner, Duration, Views, etc.
        else if (msg.startsWith(prefix + 'info')) {
            if (isPlaying == true) {
                embed(currentsong, message);
            }
            else {
                message.reply("I don't play a song atm");
            }
        }
        // Pause the current stream
        // means if you ar playing a song atm it pauses
        else if (msg.startsWith(prefix + "pause")) {
            dispatcher.pause();
        }
        // if there's a pause then there must be resume
        // so this is it
        else if (msg.startsWith(prefix + "resume")) {
            dispatcher.resume();
        }
        // change volume
        else if (msg.startsWith(prefix + "volume")) {
            if (msg.length > 7) {
                volume = args / 10;
            } else {
                message.reply('Type what volume do you want!');
            }
            console.log(volume);
            message.channel.send('Volume set to _' + volume * 100 + '%_ :muscle:');
        }
        // Delete as much messages as you want
        // Just for Owner
        else if (msg.startsWith(prefix + "del")) {
            if (member == bot_controller) {
                var msgtodel = parseInt(args) + 1;
                let messagecount = parseInt(msgtodel);
                message.channel.fetchMessages({ limit: messagecount }).then(messages => message.channel.bulkDelete(messages));
                console.log(msgtodel + ' messages has been deleted');
            }
            else {
                message.reply('you do not have permission to do that!');
                console.log(message.author.username + ' tried to delete messages!');
            }
        }
        // Just a test command to handle some wip functions
        else if (msg.startsWith(prefix + "test")) {
            if (message.member.id != bot_controller) { message.channel.send('Successful!').then(console.log('Test successfully executed!')); }
            else { message.reply("you don't have the permission to do that!"); }
        }
    }
    // Bot reacts on messages in the support channel
    // If the message on which the bot is reacting is written by a Supporter
    // the bot reacts with another emoji then if the message is written by a "normal" rank user
    else if (message.channel.name == 'support') {
        var rand = Boolean(Math.round(Math.random()));
        if (message.author.id == bot.users.find('discriminator', '4198') || message.author.id == bot.users.find('discriminator', '0639')) {
            message.react('👍');
        }
        else if (rand == true) {
            message.react('😋');
        }
    }
    // register
    else if (message.channel.name == 'global') {
        // register
        if (msg.startsWith(prefix + "register")) {
            if (!message.member.roles.has(message.guild.roles.find("name", verified_role).id)) {
                //insertIntoDB(message.author);
                message.member.addRole(message.guild.roles.find("name", verified_role))
                    .then(console.log('Role "Verified" given to ' + message.member.displayName));
                message.channel.send('You are now verified!');
            } else if (message.member.roles.has(message.guild.roles.find("name", verified_role).id)) {
                message.reply('you are already verified! :money_mouth:');
            }
        }
    }
});

// This function stops the song which is current playing
// Stop song
function stop_song(message) {
    queue = [];
    dispatcher.end();
}

// This function skips the song which is current playing
// If you would stop the stream the bot returns a message which includes that
// you can't skip the stream - same when the current song is the last one in the queue
// Skip song
function skip_song(message) {
    if (queue.length > 0) {
        dispatcher.end();
        message.channel.send(`:fast_forward: **Skipped** :thumbsup:`);
    }
    else {
        dispatcher.end();
        message.reply("there's no song in the queue. So I can't skip the song.");
    }
}

// This function plays the link which you wrote in the text channel
// If the this song is not the last one of the queue 
// the will be continue with the next one automatically
// Play music
function playMusic(id, message) {
    isPlaying = true;
    channel.join()
        .then(console.log('Music'))
        .then(function (connection) {
            stream = ytdl("https://www.youtube.com/watch?v=" + id, {
                filter: 'audioonly'
            });
            currentsong = id;
            dispatcher = connection.playStream(stream);
            dispatcher.setVolume(volume);
            dispatcher.on('end', () => {
                console.log('Finished playing!');
                queue.shift();
                if (queue.length > 0) { playMusic(queue[0], message) }
                else { queue = []; isPlaying = false; }
            });
        })
        .catch(console.error);
}

// Get the ID of the video
function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYouTubeID(str));
    } else {
        search_video(str, function (id) {
            cb(id);
        });

    }

}

// This function adds the song which anyone wrote in the textchannel to the queue
// Note for myself: Would be nice if can at the song to a text file 
// Add to queue
function add_to_queue(strID) {
    if (isYoutube(strID)) {
        queue.push(getYouTubeID(strID));
    } else {
        queue.push(strID);
    }
}

// if args isn't a link 
// it searches the link by checking it with the youtube API
// then returns the videoID
function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" +
        encodeURIComponent(query) + "&key=" + yt_api_key, function (error, response, body) {
            var json = JSON.parse(body);
            console.log('videoId: ' + json.items[0].id.videoId);
            callback(json.items[0].id.videoId);
        });
}

// checks if the song is from youtube
function isYoutube(str) {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}

// Creates an embed 
// fills the embed
// reply with the embed
function embed(song, message) {
    fetchVideoInfo(song).then(function (videoInfo) {
        var embed = new Discord.RichEmbed()
        embed.setTitle("Current playing song!")
        embed.setAuthor("", message.author.avatarURL)
        embed.setColor(0xEC407A)
        embed.setDescription(videoInfo.title)
        embed.setThumbnail(videoInfo.thumbnailUrl)
        embed.addField("Channel", videoInfo.owner, true)
        embed.addField("Duration", (videoInfo.duration / 60).toFixed(2) + " min", true)
        embed.addField("Views", videoInfo.views, true)
        embed.addField("Publishing date", videoInfo.datePublished, true)
        message.channel.send({ embed });
    });
}

// Database
function insertIntoDB(member) {
    var Properties = Java.type("java.util.Properties");
    var Driver = Java.type("org.h2.Driver");

    var driver = new Driver();
    var properties = new Properties();

    properties.setProperty("user", "sa");
    properties.setProperty("password", "");

    try {
        var conn = driver.connect(
            "jdbc:h2:~/member", properties);

        // Database code here
        try {
            var stmt = conn.createStatement("INSERT INTO MEMBER VALUES(" + counter + ", '" + member.username + 
            "', '" + msg.member.discriminator + "', " + msg.member.id);
            var rs = stmt.execute();
        }
        finally {
            if (rs)
                try {
                    rs.close();
                }
                catch(e) {}
         
            if (stmt)
                try {
                    stmt.close();
                }
                catch(e) {}
        }
    }
    finally {
        try {
            if (conn) conn.close();
        } catch (e) { }
    }
}

// This "function" is written for the bot to login into Discord
// It's not really a function but yeah
// Login
bot.login(discord_token);