require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const { DisTube } = require("distube");
const { YouTubePlugin } = require("@distube/youtube");
const ffmpeg = require("ffmpeg-static");

console.log("BOT STARTING...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// 🎧 DisTube
const distube = new DisTube(client, {
  emitNewSongOnly: true,
  ffmpeg,
  plugins: [new YouTubePlugin()],
  volume: 100
});

// =====================
// READY + SLASH COMMANDS
// =====================
client.once("ready", async () => {
  console.log(`${client.user.tag} ONLINE`);

  const commands = [
    new SlashCommandBuilder()
      .setName("play")
      .setDescription("Play music")
      .addStringOption(opt =>
        opt.setName("link")
          .setDescription("YouTube link or song name")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("stop")
      .setDescription("Stop music"),

    new SlashCommandBuilder()
      .setName("next")
      .setDescription("Skip to next song")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log("Slash commands loaded");
});

// =====================
// INTERACTIONS
// =====================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const voiceChannel = interaction.member.voice.channel;

  // ❌ no voice
  if (!voiceChannel && interaction.commandName !== "stop") {
    return interaction.reply({
      content: "❌ Enter voice first",
      ephemeral: true
    });
  }

  try {

    // 🎵 PLAY
    if (interaction.commandName === "play") {

      const link = interaction.options.getString("link");

      await interaction.deferReply();

      await distube.play(voiceChannel, link, {
        member: interaction.member,
        textChannel: interaction.channel
      });

      return interaction.editReply("🎵 Playing...");
    }

    // 🛑 STOP
    if (interaction.commandName === "stop") {
      distube.stop(interaction.guild);
      return interaction.reply("🛑 Stopped music");
    }

    // ⏭ NEXT
    if (interaction.commandName === "next") {
      distube.skip(interaction.guild);
      return interaction.reply("⏭ Skipped to next song");
    }

  } catch (err) {
    console.log("🔥 ERROR:", err);
    return interaction.reply("❌ Music error: " + err.message);
  }
});

// =====================
// EVENTS
// =====================
distube
  .on("playSong", (queue, song) => {
    queue.setVolume(100);
    queue.textChannel.send(`🎶 Playing: **${song.name}**`);
  })
  .on("addSong", (queue, song) => {
    queue.textChannel.send(`➕ Added: **${song.name}**`);
  })
  .on("finish", queue => {
    queue.textChannel.send("✅ Queue finished");
  })
  .on("error", (channel, err) => {
    console.log("🔥 FULL ERROR:", err);
    if (channel) channel.send("❌ Music error: " + err.message);
  });

client.login(process.env.TOKEN);
