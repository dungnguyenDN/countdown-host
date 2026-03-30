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

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
} = require('@discordjs/voice');

// ===== DEBUG =====
console.log("🚀 Starting bot...");
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);

// ===== CHECK TOKEN =====
if (!process.env.TOKEN) {
  console.error("❌ TOKEN MISSING");
  process.exit(1);
}

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// ===== LOGIN NGAY (QUAN TRỌNG) =====
client.login(process.env.TOKEN)
  .then(() => console.log("✅ LOGIN SUCCESS"))
  .catch(err => console.error("❌ LOGIN FAILED:", err));

// ===== READY =====
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== PLAYER =====
const player = createAudioPlayer();

// ===== BUTTON DATA =====
const countdownButtons = [
  { id: 'count5', label: '5️⃣' },
  { id: 'count10', label: '🔟' },
  { id: 'count15', label: '1️⃣5️⃣' },
  { id: 'count20', label: '2️⃣0️⃣' },
  { id: 'count25', label: '2️⃣5️⃣' },
  { id: 'count30', label: '3️⃣0️⃣' },
  { id: 'count35', label: '3️⃣5️⃣' },
  { id: 'count40', label: '4️⃣0️⃣' },
  { id: 'count45', label: '4️⃣5️⃣' },
];

// ===== BUILD BUTTON =====
function buildButtons() {
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

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('stop').setLabel('⏹ Stop').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('leave').setLabel('👋 Leave').setStyle(ButtonStyle.Secondary)
    )
  );

  return rows;
}

// ===== INTERACTION =====
client.on(Events.InteractionCreate, async interaction => {
  try {

    console.log("🔥 Interaction received");

    // ===== SLASH COMMAND =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'countdown') {
      return interaction.reply({
        content: '🔊 Choose countdown:',
        components: buildButtons(),
      });
    }

    // ===== BUTTON =====
    if (interaction.isButton()) {

      await interaction.deferReply(); // FIX timeout

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.editReply('❌ Join voice first');
      }

      let connection = getVoiceConnection(interaction.guild.id);

      if (!connection) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
      }

      connection.subscribe(player);

      // ===== COUNT =====
      if (interaction.customId.startsWith('count')) {
        const number = interaction.customId.replace('count', '');
        const file = `${number}to0.mp3`;
        const filePath = path.join(__dirname, 'audio', file);

        if (!fs.existsSync(filePath)) {
          return interaction.editReply(`❌ Missing: ${file}`);
        }

        const resource = createAudioResource(filePath);

        player.stop();
        player.play(resource);

        await interaction.editReply(`▶️ Playing ${file}`);

        player.removeAllListeners(AudioPlayerStatus.Idle);
        player.once(AudioPlayerStatus.Idle, async () => {
          try {
            await interaction.channel.send({
              content: '🔁 Again?',
              components: buildButtons(),
            });
          } catch (err) {
            console.error(err);
          }
        });
      }

      // ===== STOP =====
      if (interaction.customId === 'stop') {
        player.stop();
        return interaction.editReply('⏹ Stopped');
      }

      // ===== LEAVE =====
      if (interaction.customId === 'leave') {
        const conn = getVoiceConnection(interaction.guild.id);
        if (conn) conn.destroy();
        return interaction.editReply('👋 Left voice');
      }
    }

  } catch (err) {
    console.error("❌ ERROR:", err);

    if (interaction.deferred || interaction.replied) {
      interaction.editReply('❌ Error').catch(() => {});
    } else {
      interaction.reply({ content: '❌ Error', ephemeral: true }).catch(() => {});
    }
  }
});

// ===== EXPRESS (KEEP ALIVE) =====
const app = express();

app.get('/', (req, res) => {
  res.send('Bot running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on ${PORT}`);
});
