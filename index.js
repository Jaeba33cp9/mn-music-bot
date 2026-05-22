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

const distube = new DisTube(client, {
  emitNewSongOnly: true,
  ffmpeg: ffmpeg,
  plugins: [new YouTubePlugin()]
});

client.once("ready", async () => {

  console.log(`${client.user.tag} ONLINE`);

  const commands = [

    new SlashCommandBuilder()
      .setName("mp")
      .setDescription("Join voice"),

    new SlashCommandBuilder()
      .setName("play")
      .setDescription("Play YouTube music")
      .addStringOption(option =>
        option
          .setName("link")
          .setDescription("YouTube link")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("skip")
      .setDescription("Skip music"),

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
      content: "❌ DKHOL L VOICE",
      ephemeral: true
    });
  }

  try {

    if (interaction.commandName === "mp") {

      await interaction.deferReply();

      await distube.voices.join(voiceChannel);

      return interaction.editReply("✅ DKHLT L VOICE");
    }

    if (interaction.commandName === "play") {

      const link = interaction.options.getString("link");

      await interaction.deferReply();

      await distube.play(voiceChannel, link, {
        member: interaction.member,
        textChannel: interaction.channel
      });

      return interaction.editReply("🎵 Music Added");
    }

    if (interaction.commandName === "skip") {

      await distube.skip(interaction.guild);

      return interaction.reply("⏭️ Song skipped");
    }

    if (interaction.commandName === "stop") {

      distube.stop(interaction.guild);

      return interaction.reply("🛑 Music stopped");
    }

    if (interaction.commandName === "queue") {

      const queue = distube.getQueue(interaction.guild);

      if (!queue || !queue.songs.length) {
        return interaction.reply("❌ Queue khawya");
      }

      const songs = queue.songs
        .map((song, i) => `${i + 1}. ${song.name}`)
        .join("\n");

      return interaction.reply(`📜 Queue:\n${songs}`);
    }

  } catch (err) {

    console.log(err);

    if (interaction.deferred || interaction.replied) {
      interaction.editReply("❌ Music Error");
    } else {
      interaction.reply("❌ Music Error");
    }
  }

});

distube
  .on("playSong", (queue, song) => {
    queue.textChannel.send(`🎶 Playing: **${song.name}**`);
  })

  .on("addSong", (queue, song) => {
    queue.textChannel.send(`➕ Added: **${song.name}**`);
  })

  .on("finish", queue => {
    queue.textChannel.send("✅ Queue salat");
  })

  .on("error", (channel, err) => {

    console.log(err);

    if (channel) {
      channel.send("❌ Error f music");
    }
  });

client.login(process.env.TOKEN);
