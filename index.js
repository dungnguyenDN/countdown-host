const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
} = require('@discordjs/voice');

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

let player = createAudioPlayer();

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

const countdownButtons = [
  { id: 'count5', label: '5️⃣ Countdown 5 to 0' },
  { id: 'count10', label: '🔟 Countdown 10 to 0' },
  { id: 'count15', label: '1️⃣5️⃣ Countdown 15 to 0' },
  { id: 'count20', label: '2️⃣0️⃣ Countdown 20 to 0' },
  { id: 'count25', label: '2️⃣5️⃣ Countdown 25 to 0' },
  { id: 'count30', label: '3️⃣0️⃣ Countdown 30 to 0' },
];

const extraButtons = [
  new ButtonBuilder().setCustomId('stop').setLabel('⏹ Stop').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('leave').setLabel('👋 Leave').setStyle(ButtonStyle.Secondary),
];

function buildButtonRows() {
  const rows = [];
  for (let i = 0; i < countdownButtons.length; i += 5) {
    rows.push(
      new ActionRowBuilder().addComponents(
        countdownButtons.slice(i, i + 5).map(btn =>
          new ButtonBuilder()
            .setCustomId(btn.id)
            .setLabel(btn.label)
            .setStyle(ButtonStyle.Primary)
        )
      )
    );
  }

  rows.push(new ActionRowBuilder().addComponents(extraButtons));
  return rows;
}

// Slash command registration
const commands = [
  new SlashCommandBuilder()
    .setName('countdown')
    .setDescription('Start a countdown in voice channel'),
];

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log('✅ Slash command registered');
  } catch (err) {
    console.error('❌ Error registering command:', err);
  }
})();

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'countdown') {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You must join a voice channel first.', ephemeral: true });
    }

    let connection = getVoiceConnection(interaction.guild.id);
    if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
    }

    connection.subscribe(player);

    await interaction.reply({
      content: '🔊 Choose a countdown option:',
      components: buildButtonRows(),
    });
  }

  if (interaction.isButton()) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You must be in a voice channel.', ephemeral: true });
    }

    let connection = getVoiceConnection(interaction.guild.id);
    if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
    }

    connection.subscribe(player);

    if (interaction.customId.startsWith('count')) {
      const number = interaction.customId.replace('count', '');
      const file = `${number}to0.mp3`;
      const filePath = path.join(__dirname, 'audio', file);

      if (!fs.existsSync(filePath)) {
        return interaction.reply({ content: `❌ File not found: ${file}`, ephemeral: true });
      }

      const resource = createAudioResource(filePath);
      player.stop(); // Stop any existing audio
      player.play(resource);

      await interaction.reply({ content: `▶️ Playing: ${file}` });

      player.removeAllListeners(AudioPlayerStatus.Idle); // prevent stacking
      player.once(AudioPlayerStatus.Idle, async () => {
        try {
          await interaction.channel.send({
            content: '✅ Countdown finished! What do you want to do next?',
            components: buildButtonRows(),
          });
        } catch (err) {
          console.error('❌ Error sending new buttons:', err);
        }
      });
    }

    if (interaction.customId === 'stop') {
      player.stop();
      await interaction.reply({ content: '⏹ Countdown stopped.' });
    }

    if (interaction.customId === 'leave') {
      const conn = getVoiceConnection(interaction.guild.id);
      if (conn) {
        conn.destroy();
        await interaction.reply({ content: '👋 Bot has left the voice channel.' });
      } else {
        await interaction.reply({ content: '❌ Bot is not connected.', ephemeral: true });
      }
    }
  }
});

client.login(token);

// Keep web server alive (for Render free plan)
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('🤖 Discord bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server is running on port ${PORT}`);
});
