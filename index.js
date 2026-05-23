require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { DisTube } = require("distube");
const ffmpeg = require("ffmpeg-static");

console.log("PRO BOT STARTING...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// 🎧 DisTube clean
const distube = new DisTube(client, {
  emitNewSongOnly: true,
  ffmpeg
});

// =====================
// 🔥 SLASH COMMAND
// =====================
client.once("ready", async () => {
  console.log(`${client.user.tag} ONLINE`);

  const commands = [
    new SlashCommandBuilder()
      .setName("pm")
      .setDescription("Play music (PRO BOT)")
      .addStringOption(opt =>
        opt.setName("link")
          .setDescription("YouTube link or song name")
          .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log("Slash command loaded");
});

// =====================
// 🎧 INTERACTION
// =====================
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

    await interaction.deferReply();

    await distube.play(voiceChannel, link, {
      member: interaction.member,
      textChannel: interaction.channel
    });

    return interaction.editReply("🎵 Added to queue + joined voice");
  }
});

// =====================
// 🎛 PRO CONTROLS (BUTTONS)
// =====================
function controlPanel(song) {

  const embed = new EmbedBuilder()
    .setTitle("🎧 Now Playing")
    .setDescription(`**${song.name}**`)
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pause")
      .setLabel("⏸ Pause")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("resume")
      .setLabel("▶ Resume")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("skip")
      .setLabel("⏭ Skip")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("stop")
      .setLabel("⛔ Stop")
      .setStyle(ButtonStyle.Danger)
  );

  return { embed, row };
}

// =====================
// 🎧 EVENTS
// =====================
distube
  .on("playSong", (queue, song) => {

    const panel = controlPanel(song);

    queue.textChannel.send({
      embeds: [panel.embed],
      components: [panel.row]
    });
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

// =====================
// 🎛 BUTTON HANDLER
// =====================
client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  const guild = interaction.guild;

  try {

    if (interaction.customId === "pause") {
      distube.pause(guild);
      return interaction.reply({ content: "⏸ Paused", ephemeral: true });
    }

    if (interaction.customId === "resume") {
      distube.resume(guild);
      return interaction.reply({ content: "▶ Resumed", ephemeral: true });
    }

    if (interaction.customId === "skip") {
      distube.skip(guild);
      return interaction.reply({ content: "⏭ Skipped", ephemeral: true });
    }

    if (interaction.customId === "stop") {
      distube.stop(guild);
      return interaction.reply({ content: "⛔ Stopped", ephemeral: true });
    }

  } catch (err) {
    console.log(err);
    interaction.reply({ content: "❌ Error", ephemeral: true });
  }
});

// =====================
// 🔐 LOGIN
// =====================
client.login(process.env.TOKEN);
