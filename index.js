const {
    Client,
    GatewayIntentBits
} = require('discord.js');
const {
    discordToken
} = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});


client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('Nexus Mods');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    const { commandName } = interaction;

    if (commandName === 'nexus') {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'help') {
            await interaction.reply('helping');
        } else {
            await interaction.reply('nex');
        }
    }
});

client.login(discordToken);