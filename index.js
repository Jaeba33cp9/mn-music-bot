require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const { DisTube } = require("distube");
const ffmpeg = require("ffmpeg-static");

console.log("BOT STARTING...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ✅ CLEAN DisTube (no plugins)
const distube = new DisTube(client, {
  emitNewSongOnly: true,
  ffmpeg
});

client.once("ready", async () => {
  console.log(`${client.user.tag} ONLINE`);

  const commands = [
    new SlashCommandBuilder()
      .setName("mp")
      .setDescription("Join voice"),

    new SlashCommandBuilder()
      .setName("play")
      .setDescription("Play music")
      .addStringOption(option =>
        option.setName("link")
          .setDescription("YouTube link or search")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("skip")
      .setDescription("Skip song"),

    new SlashCommandBuilder()
      .setName("stop")
      .setDescription("Stop music"),

    new SlashCommandBuilder()
      .setName("queue")
      .setDescription("Show queue")
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("Slash commands loaded");
  } catch (err) {
    console.log(err);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.reply({
      content: "❌ Dkhoul l voice first",
      ephemeral: true
    });
  }

  try {
    // ▶️ PLAY
    if (interaction.commandName === "play") {
      const link = interaction.options.getString("link");

      await interaction.deferReply();

      await distube.play(voiceChannel, link, {
        member: interaction.member,
        textChannel: interaction.channel
      });

      return interaction.editReply("🎵 Added to queue");
    }

    // ⏭ SKIP
    if (interaction.commandName === "skip") {
      distube.skip(interaction.guild);
      return interaction.reply("⏭️ Skipped");
    }

    // 🛑 STOP
    if (interaction.commandName === "stop") {
      distube.stop(interaction.guild);
      return interaction.reply("🛑 Stopped");
    }

    // 📜 QUEUE
    if (interaction.commandName === "queue") {
      const queue = distube.getQueue(interaction.guild);

      if (!queue || !queue.songs.length) {
        return interaction.reply("❌ Queue empty");
      }

      return interaction.reply(
        "📜 Queue:\n" +
        queue.songs.map((s, i) => `${i + 1}. ${s.name}`).join("\n")
      );
    }

  } catch (err) {
    console.log(err);
    return interaction.reply("❌ Music error");
  }
});

// 🎧 EVENTS
distube
  .on("playSong", (queue, song) => {
    queue.textChannel.send(`🎶 Playing: **${song.name}**`);
  })
  .on("addSong", (queue, song) => {
    queue.textChannel.send(`➕ Added: **${song.name}**`);
  })
  .on("finish", queue => {
    queue.textChannel.send("✅ Queue finished");
  })
  .on("error", (channel, err) => {
    console.log(err);
    if (channel) channel.send("❌ Music error");
  });

client.login(process.env.TOKEN);
