// THIS SCRIPT HAS NOT BEEN UPDATED AND IS LIKELY NONFUNCTIONAL

const { discordToken } = require('../config.json');

const { Client } = require('discord.js');

const client = new Client({
	intents: [],
});

client.once('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
	client.application.commands.fetch().then((commands) => {
		commands.forEach((command) => {
			client.application.commands
				.delete(command.id)
				.then(() => {
					console.log(`Deleted command ${command.id} (${command.name}) globally`);
				})
				.catch((err) => {
					console.log(err);
				});
		});
	});
});

client.login(discordToken);
