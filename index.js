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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const player = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Play },
});

// --- 🎨 HÀM TẠO GIAO DIỆN (FOCUS ON IRENE) ---
const buildInterface = (statusText = "Ready to start", currentSec = null, isDisabled = false) => {
  const embed = new EmbedBuilder()
    .setColor(isDisabled ? '#FF4500' : '#FFD700') // Cam đỏ khi bận, Vàng Gold khi sẵn sàng
    .setTitle(`✨ Irene wishes you a great game! 😉`)
    .setDescription(`**Status:** ${statusText}\n${currentSec ? `**Running:** \`${currentSec} seconds\` 🏃‍♂️` : '👉 *Select a button below to start*'}`)
    .setTimestamp()
    .setFooter({ text: 'LuluBebe', iconURL: client.user.displayAvatarURL() });

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

// --- XỬ LÝ EVENT ---
client.once(Events.ClientReady, () => console.log(`✅ BOT ONLINE: ${client.user.tag}`));

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'countdown') {
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
  }

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
        connection.subscribe(player);
    }

    if (interaction.customId.startsWith('count')) {
      // FIX LỖI: Định nghĩa 'number' TRƯỚC KHI sử dụng
      const number = interaction.customId.replace('count', '');
      const filePath = path.resolve(__dirname, 'audio', `${number}to0.mp3`);

      if (!fs.existsSync(filePath)) return console.error(`❌ Missing: ${filePath}`);

      try {
        // Cập nhật giao diện sang trạng thái bận
        await interaction.update(buildInterface("🔴 COUNTDOWN IN PROGRESS...", number, true));

        await entersState(connection, VoiceConnectionStatus.Ready, 5000);
        const resource = createAudioResource(filePath, { inputType: StreamType.Arbitrary });
        player.play(resource);

        player.removeAllListeners(AudioPlayerStatus.Idle);
        player.once(AudioPlayerStatus.Idle, async () => {
          try {
            // Khi xong, mở lại nút và hiện thông báo hoàn tất
            await interaction.editReply(buildInterface(`✅ Finished ${number}s! Start another?`, null, false));
          } catch (err) { console.error('UI Update Error:', err); }
        });
      } catch (e) { 
        console.error(e);
        await interaction.editReply(buildInterface("❌ Error connecting to voice.", null, false));
      }
    }

    if (interaction.customId === 'stop') {
        player.stop();
        await interaction.update(buildInterface("⏹️ Countdown Stopped.", null, false));
    }
    
    if (interaction.customId === 'leave' && connection) {
        connection.destroy();
        await interaction.update(buildInterface("👋 Bot has left the channel.", null, false));
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Port: ${PORT}`);
  client.login(process.env.TOKEN);
});