console.log("🚀 Starting bot...");
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);

const express = require('express');

async function startBot() {
  try {
    const fs = require('fs');
    const path = require('path');

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

    console.log("📦 Modules loaded");

    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    const player = createAudioPlayer();
    console.log("🔊 Audio player created");

    client.once(Events.ClientReady, () => {
      console.log(`✅ Logged in as ${client.user.tag}`);
    });

    await client.login(process.env.TOKEN);
    console.log("✅ LOGIN SUCCESS");

    // ===== INTERACTION TEST =====
    client.on(Events.InteractionCreate, async interaction => {
      console.log("🔥 Interaction received");

      if (interaction.isChatInputCommand()) {
        await interaction.reply("✅ Bot is working!");
      }
    });

  } catch (err) {
    console.error("💥 CRASH:", err);
  }
}

startBot();

// ===== KEEP ALIVE =====
const app = express();

app.get('/', (req, res) => {
  res.send('Bot running');
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server running");
});
