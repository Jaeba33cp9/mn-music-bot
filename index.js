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

const distube = new DisTube(client, {
  emitNewSongOnly: true,
  ffmpeg
});

client.once("ready", async () => {
  console.log(`${client.user.tag} ONLINE`);

  const commands = [
    new SlashCommandBuilder()
      .setName("pm")
      .setDescription("Play music")
      .addStringOption(opt =>
        opt.setName("link")
          .setDescription("YouTube link or song name")
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("Slash command loaded");
  } catch (err) {
    console.log(err);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "pm") {

    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Enter voice first",
        ephemeral: true
      });
    }

    const link = interaction.options.getString("link");

    try {
      await interaction.deferReply();

      await distube.play(voiceChannel, link, {
        member: interaction.member,
        textChannel: interaction.channel
      });

      return interaction.editReply("🎵 Playing...");
    } catch (err) {
      console.log("🔥 INTERACTION ERROR:", err);
      return interaction.editReply("❌ Music error: " + err.message);
    }
  }
});

// 🎧 EVENTS + DEBUG FIX
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
    console.log("🔥 FULL ERROR:", err);

    if (channel) {
      channel.send("❌ Music error: " + err.message);
    }
  });

client.login(process.env.TOKEN);
