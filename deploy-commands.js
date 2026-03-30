const { REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const token = process.env.TOKEN;


// Slash command
const commands = [
  new SlashCommandBuilder()
    .setName('countdown')
    .setDescription('Controls for wos countdown'),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Deploying commands...');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log('✅ Successfully registered commands.');
  } catch (error) {
    console.error(error);
  }
})();
