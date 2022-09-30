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
        //console.log(interaction);
        //console.log(interaction.options);
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        if (group === null) {
            if (subcommand === 'help') {
                await interaction.reply('helping');
            }
        } else if (group === 'auth') {
            if (subcommand === 'help') {
                await interaction.reply('helping with authentication');
            } else if (subcommand === 'check') {
                await interaction.reply('checking authentication');
            } else if (subcommand === 'set') {
                let token = interaction.options.getString('token');
                await interaction.reply(`setting token to ${token}`);
            }
        }
    }
});

client.login(discordToken);