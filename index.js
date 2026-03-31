require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ FFmpeg fix cho Render - ÉP ĐƯỜNG DẪN HỆ THỐNG
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
  StreamType, // Thêm cái này để giải mã mp3
} = require('@discordjs/voice');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const player = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Play },
});

// ✅ Bắt lỗi player để không bị crash
player.on('error', (error) => {
  console.error('Player error:', error.message);
});

// 🎨 UI (Giữ nguyên logic của thầy, tối ưu hiển thị)
function buildInterface(statusText, currentSec, isDisabled) {
  if (!statusText) statusText = "Ready to start";

  let desc = "**Status:** " + statusText + "\n";
  desc += currentSec ? "**Running:** `" + currentSec + " seconds` 🏃‍♂️" : "👉 *Select a button below*";

  const embed = new EmbedBuilder()
    .setColor(isDisabled ? '#FF4500' : '#FFD700')
    .setTitle("✨ Irene wishes you a great game! 😉")
    .setDescription(desc)
    .setTimestamp()
    .setFooter({
      text: 'Whiteout Survival Assistant',
      iconURL: client.user ? client.user.displayAvatarURL() : null,
    });

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

  return {
    embeds: [embed],
    components: [
      createRow([{ id: 'count5', label: '5s', emoji: '⏲️' }, { id: 'count10', label: '10s', emoji: '⏲️' }, { id: 'count15', label: '15s', emoji: '⏲️' }]),
      createRow([{ id: 'count20', label: '20s', emoji: '⌛' }, { id: 'count25', label: '25s', emoji: '⌛' }, { id: 'count30', label: '30s', emoji: '⌛' }]),
      createRow([{ id: 'count35', label: '35s', emoji: '🔥' }, { id: 'count40', label: '40s', emoji: '🔥' }, { id: 'count45', label: '45s', emoji: '🔥' }]),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('stop').setLabel('Stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('leave').setLabel('Leave').setEmoji('👋').setStyle(ButtonStyle.Secondary)
      )
    ],
  };
}

client.once(Events.ClientReady, () => {
  console.log("✅ BOT ONLINE: " + client.user.tag);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // COMMAND /COUNTDOWN
    if (interaction.isChatInputCommand() && interaction.commandName === 'countdown') {
      await interaction.deferReply().catch(() => {});

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) return interaction.editReply('❌ Join voice first!');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      // Tăng timeout lên 30s cho Render
      await entersState(connection, VoiceConnectionStatus.Ready, 30000).catch(() => {});
      connection.subscribe(player);
      
      await interaction.editReply(buildInterface());
    }

    // BUTTONS
    if (interaction.isButton()) {
      const voiceChannel = interaction.member.voice.channel;
      let connection = getVoiceConnection(interaction.guild.id);

      if (!connection && voiceChannel) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
          selfDeaf: false,
        });
        connection.subscribe(player);
      }

      if (interaction.customId.startsWith('count')) {
        const number = interaction.customId.replace('count', '');
        const filePath = path.resolve(__dirname, 'audio', number + "to0.mp3");

        if (!fs.existsSync(filePath)) return console.error("Missing:", filePath);

        // Update UI ngay lập tức
        await interaction.update(buildInterface("🔴 COUNTDOWN IN PROGRESS...", number, true)).catch(() => {});

        // Đảm bảo kết nối sẵn sàng trước khi phát
        if (connection.state.status !== VoiceConnectionStatus.Ready) {
            await entersState(connection, VoiceConnectionStatus.Ready, 30000).catch(() => {});
        }

        // PHÁT NHẠC: Ép luồng stream để FFmpeg trên Render giải mã mp3
        const resource = createAudioResource(fs.createReadStream(filePath), {
          inputType: StreamType.Arbitrary,
          inlineVolume: true
        });
        
        resource.volume?.setVolume(0.9);
        player.play(resource);

        player.removeAllListeners(AudioPlayerStatus.Idle);
        player.once(AudioPlayerStatus.Idle, async () => {
          try {
            await interaction.editReply(buildInterface("✅ Finished " + number + "s", null, false));
          } catch (err) {}
        });
      }

      if (interaction.customId === 'stop') {
        player.stop();
        await interaction.update(buildInterface("⏹️ Stopped", null, false)).catch(() => {});
      }

      if (interaction.customId === 'leave') {
        const conn = getVoiceConnection(interaction.guild.id);
        if (conn) conn.destroy();
        await interaction.update(buildInterface("👋 Bye!", null, false)).catch(() => {});
      }
    }
  } catch (error) {
    console.error("Global Error:", error.message);
  }
});

app.get('/', (req, res) => res.send('Bot is alive'));

app.listen(PORT, '0.0.0.0', () => {
  console.log("🌐 Server running on port " + PORT);
  client.login(process.env.TOKEN);
});
