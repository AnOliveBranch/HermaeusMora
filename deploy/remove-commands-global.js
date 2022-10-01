// THIS SCRIPT HAS NOT BEEN UPDATED AND IS LIKELY NONFUNCTIONAL

const {
    discordToken
} = require('../config.json');

const {
    Client,
    Intents
} = require('discord.js');

const client = new Client({
    //intents: [Intents.FLAGS.GUILDS]
    intents: []
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.application.commands.fetch().then(commands => {
        commands.forEach(function (command) {
            client.application.commands.delete(command.id).then(function () {
                console.log(`Deleted command ${command.id} (${command.name}) globally`);
            }).catch(function (err) {
                console.log(err);
            });
        });
    });
});

client.login(discordToken);