// THIS SCRIPT HAS NOT BEEN UPDATED AND IS LIKELY NONFUNCTIONAL

const {
    guildId,
    discordToken
} = require('../config.json');

const {
    Client,
    GatewayIntentBits
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
    //intents: []
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    let guild = client.guilds.cache.get(guildId);
    guild.commands.fetch().then(commands => {
        commands.forEach(function (command) {
            guild.commands.delete(command.id).then(function () {
                console.log(`Deleted command ${command.id} (${command.name}) from ${guildId}`);
            }).catch(function (err) {
                console.log(err);
            });
        });
    });
});

client.login(discordToken);