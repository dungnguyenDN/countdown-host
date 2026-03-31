```js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ FIX FFmpeg cho Render
const ffmpeg = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpeg;

const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
  NoSubscriberBehavior,
  entersState,
  VoiceConnectionStatus,
} = require('@discordjs/voice');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const player = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Play },
});

// ✅ Log lỗi player
player.on('error', (error) => {
  console.error('❌ Player error:', error);
});

// --- 🎨 UI ---
const buildInterface = (statusText = "Ready to start", currentSec = null, isDisabled = false) => {
  const embed = new EmbedBuilder()
    .setColor(isDisabled ? '#FF4500' : '#FFD700')
    .setTitle(`✨ Irene wishes you a great game! 😉`)
    .setDescription(`**Status:** ${statusText}\n${currentSec ? `**Running:** \`${currentSec} seconds\`` : '👉 Select a button below'}`)
    .setTimestamp()
    .setFooter({ text: 'LuluBebe', iconURL: client.user.displayAvatarURL() });

  const createRow = (btns) =>
    new ActionRowBuilder().addComponents(
      btns.map(b =>
        new ButtonBuilder()
          .setCustomId(b.id)
          .setLabel(b.label)
          .setEmoji(b.emoji)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(isDisabled)
      )
    );

  const row1 = createRow([
    { id: 'count5', label: '5s', emoji: '⏲️' },
    { id: 'count10', label: '10s', emoji: '⏲️' },
    { id: 'count15', label: '15s', emoji: '⏲️' }
  ]);

  const row2 = createRow([
    { id: 'count20', label: '20s', emoji: '⌛' },
    { id: 'count25', label: '25s', emoji: '⌛' },
    { id: 'count30', label: '30s', emoji: '⌛' }
  ]);

  const row3 = createRow([
    { id: 'count35', label: '35s', emoji: '🔥' },
    { id: 'count40', label: '40s', emoji: '🔥' },
    { id: 'count45', label: '45s', emoji: '🔥' }
  ]);

  const rowActions = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('stop').setLabel('Stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('leave').setLabel('Leave').setEmoji('👋').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2, row3, rowActions] };
};

// --- READY ---
client.once(Events.ClientReady, () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);
});

// --- INTERACTIONS ---
client.on(Events.InteractionCreate, async interaction => {

  // ===== COMMAND =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'countdown') {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.editReply('❌ Join voice first!');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    // ✅ Debug connection
    connection.on('stateChange', (oldState, newState) => {
      console.log(`🔊 Connection: ${oldState.status} -> ${newState.status}`);
    });

    try {
      // ✅ FIX timeout (20s cho Render)
      await entersState(connection, VoiceConnectionStatus.Ready, 20000);
      connection.subscribe(player);
    } catch (err) {
      console.error('❌ Voice connection error:', err);
      return interaction.editReply('❌ Cannot connect to voice!');
    }

    await interaction.editReply(buildInterface());
  }

  // ===== BUTTON =====
  if (interaction.isButton()) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return;

    let connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20000);
        connection.subscribe(player);
      } catch (err) {
        console.error(err);
        return;
      }
    }

    // ===== PLAY =====
    if (interaction.customId.startsWith('count')) {
      const number = interaction.customId.replace('count', '');
      const filePath = path.resolve(__dirname, 'audio', `${number}to0.mp3`);

      if (!fs.existsSync(filePath)) {
        console.error(`❌ Missing file: ${filePath}`);
        return;
      }

      try {
        await interaction.update(buildInterface("🔴 COUNTDOWN IN PROGRESS...", number, true));

        await entersState(connection, VoiceConnectionStatus.Ready, 20000);

        const resource = createAudioResource(filePath); // ✅ FIX

        player.play(resource);

        player.removeAllListeners(AudioPlayerStatus.Idle);

        player.once(AudioPlayerStatus.Idle, async () => {
          try {
            await interaction.editReply(buildInterface(`✅ Finished ${number}s!`, null, false));
          } catch (err) {
            console.error(err);
          }
        });

      } catch (err) {
        console.error(err);
        await interaction.editReply(buildInterface("❌ Error playing audio", null, false));
      }
    }

    // ===== STOP =====
    if (interaction.customId === 'stop') {
      player.stop();
      await interaction.update(buildInterface("⏹️ Stopped", null, false));
    }

    // ===== LEAVE =====
    if (interaction.customId === 'leave') {
      if (connection) connection.destroy();
      await interaction.update(buildInterface("👋 Left channel", null, false));
    }
  }
});

// --- KEEP ALIVE (Render) ---
app.get('/', (req, res) => res.send('Bot is alive!'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server running on port ${PORT}`);
  client.login(process.env.TOKEN);
});
```
