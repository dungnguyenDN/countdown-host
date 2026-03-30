const fs = require('fs');
const path = require('path');
const express = require('express');

const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

// const {
//   joinVoiceChannel,
//   createAudioPlayer,
//   createAudioResource,
//   AudioPlayerStatus,
//   getVoiceConnection,
// } = require('@discordjs/voice');
let player = {};

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

let player = createAudioPlayer();

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== BUTTON DATA =====
const countdownButtons = [
  { id: 'count5', label: '5️⃣ Countdown 5 to 0' },
  { id: 'count10', label: '🔟 Countdown 10 to 0' },
  { id: 'count15', label: '1️⃣5️⃣ Countdown 15 to 0' },
  { id: 'count20', label: '2️⃣0️⃣ Countdown 20 to 0' },
  { id: 'count25', label: '2️⃣5️⃣ Countdown 25 to 0' },
  { id: 'count30', label: '3️⃣0️⃣ Countdown 30 to 0' },
  { id: 'count35', label: '3️⃣5️⃣ Countdown 35 to 0' },
  { id: 'count40', label: '4️⃣0️⃣ Countdown 40 to 0' },
  { id: 'count45', label: '4️⃣5️⃣ Countdown 45 to 0' },
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

// ===== INTERACTION =====
client.on(Events.InteractionCreate, async interaction => {
  try {

    // ===== SLASH COMMAND =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'countdown') {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ You must join a voice channel first.',
          ephemeral: true,
        });
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

      return interaction.reply({
        content: '🔊 Choose a countdown option:',
        components: buildButtonRows(),
      });
    }

    // ===== BUTTON =====
    if (interaction.isButton()) {

      await interaction.deferReply(); // 🔥 FIX CHÍNH

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.editReply({
          content: '❌ You must be in a voice channel.',
        });
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

      // ===== COUNTDOWN =====
      if (interaction.customId.startsWith('count')) {
        const number = interaction.customId.replace('count', '');
        const file = `${number}to0.mp3`;
        const filePath = path.join(__dirname, 'audio', file);

        if (!fs.existsSync(filePath)) {
          return interaction.editReply({
            content: `❌ File not found: ${file}`,
          });
        }

        const resource = createAudioResource(filePath);
        player.stop();
        player.play(resource);

        await interaction.editReply({
          content: `▶️ Playing: ${file}`,
        });

        player.removeAllListeners(AudioPlayerStatus.Idle);
        player.once(AudioPlayerStatus.Idle, async () => {
          try {
            await interaction.channel.send({
              content: '✅ irene is so strong, cute, pretty, smart, tolerant, helpful = super woman??',
              components: buildButtonRows(),
            });
          } catch (err) {
            console.error('Send button error:', err);
          }
        });
      }

      // ===== STOP =====
      if (interaction.customId === 'stop') {
        player.stop();
        return interaction.editReply({
          content: '⏹ Countdown stopped.',
        });
      }

      // ===== LEAVE =====
      if (interaction.customId === 'leave') {
        const conn = getVoiceConnection(interaction.guild.id);
        if (conn) {
          conn.destroy();
          return interaction.editReply({
            content: '👋 Bot has left the voice channel.',
          });
        } else {
          return interaction.editReply({
            content: '❌ Bot is not connected.',
          });
        }
      }
    }

  } catch (err) {
    console.error('❌ Interaction error:', err);

    if (interaction.deferred || interaction.replied) {
      interaction.editReply({ content: '❌ Error occurred!' }).catch(() => {});
    } else {
      interaction.reply({ content: '❌ Error occurred!', ephemeral: true }).catch(() => {});
    }
  }
});

// ===== LOGIN =====
console.log("TOKEN:", process.env.TOKEN);

client.login(process.env.TOKEN)
  .then(() => console.log("✅ LOGIN SUCCESS"))
  .catch(err => console.error("❌ LOGIN FAIL:", err));

// ===== GLOBAL ERROR =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ===== KEEP ALIVE (RENDER) =====
const app = express();

app.get('/', (req, res) => {
  res.send('🤖 Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server is running on port ${PORT}`);
});
