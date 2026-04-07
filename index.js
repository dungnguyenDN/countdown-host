require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

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
  StreamType,
  NoSubscriberBehavior,
  entersState,
  VoiceConnectionStatus,
} = require('@discordjs/voice');

// --- 1. KHỞI TẠO CLIENT TRƯỚC ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const player = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Play },
});

// --- 2. HÀM TẠO GIAO DIỆN (Bây giờ đã có thể dùng client) ---
const buildInterface = (statusText = "Ready to start", currentSec = null, isDisabled = false) => {
  const embed = new EmbedBuilder()
    .setColor(isDisabled ? '#FF4500' : '#FFD700')
    .setTitle(`✨ Irene wishes you a great game! 😉`)
    .setDescription(`**Status:** ${statusText}\n${currentSec ? `**Running:** \`${currentSec} seconds\` 🏃‍♂️` : '👉 *Select a button below to start*'}`)
    .setTimestamp()
    .setFooter({ 
        text: 'LuluBebe', 
        // Sử dụng optional chaining (?.) để tránh lỗi nếu bot chưa kịp login
        iconURL: client.user?.displayAvatarURL() || null 
    });

  const createRow = (btns) => {
    return new ActionRowBuilder().addComponents(
      btns.map(b => new ButtonBuilder()
        .setCustomId(b.id)
        .setLabel(b.label)
        .setEmoji(b.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isDisabled)
      )
    );
  };

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

// --- 3. XỬ LÝ EVENT ---
client.once(Events.ClientReady, () => console.log(`✅ BOT ONLINE: ${client.user.tag}`));

client.on(Events.InteractionCreate, async interaction => {
  // SLASH COMMAND
  if (interaction.isChatInputCommand() && interaction.commandName === 'countdown') {
    try {
      await interaction.deferReply();
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) return interaction.editReply('❌ Please join a voice channel first!');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      
      connection.subscribe(player);
      await interaction.editReply(buildInterface());
    } catch (error) {
      console.error("Slash Error:", error);
    }
  }

  // BUTTONS
  if (interaction.isButton()) {
    try {
      const voiceChannel = interaction.member.voice.channel;
      let connection = getVoiceConnection(interaction.guild.id);

      if (!connection && voiceChannel) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
        connection.subscribe(player);
      }

      if (interaction.customId.startsWith('count')) {
        const number = interaction.customId.replace('count', '');
        const filePath = path.resolve(__dirname, 'audio', `${number}to0.mp3`);

        if (!fs.existsSync(filePath)) {
          return interaction.reply({ content: `❌ Missing: ${number}s.mp3`, ephemeral: true });
        }

        await interaction.update(buildInterface("🔴 COUNTDOWN IN PROGRESS...", number, true));

        try {
          if (connection) await entersState(connection, VoiceConnectionStatus.Ready, 2000);
          const resource = createAudioResource(filePath, { inputType: StreamType.Arbitrary });
          player.play(resource);

          player.removeAllListeners(AudioPlayerStatus.Idle);
          player.once(AudioPlayerStatus.Idle, async () => {
            try {
              await interaction.editReply(buildInterface(`✅ Finished ${number}s!`, null, false));
            } catch (err) { }
          });
        } catch (e) {
          await interaction.editReply(buildInterface("❌ Voice Error.", null, false));
        }
      }

      if (interaction.customId === 'stop') {
        player.stop();
        await interaction.update(buildInterface("⏹️ Countdown Stopped.", null, false));
      }
      
      if (interaction.customId === 'leave') {
        if (connection) connection.destroy();
        await interaction.update(buildInterface("👋 Irene has left.", null, false));
      }
    } catch (error) {
      if (error.code !== 10062) console.error("Button Error:", error);
    }
  }
});

// --- 4. KHỞI CHẠY ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Port: ${PORT}`);
  client.login(process.env.TOKEN);
});