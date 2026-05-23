require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const { DisTube } = require("distube");
const ffmpeg = require("ffmpeg-static");

console.log("BOT STARTING...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🎧 DisTube clean
const distube = new DisTube(client, {
  emitNewSongOnly: true,
  ffmpeg
});

// =====================
// 🎵 PREFIX COMMAND +mp
// =====================
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // command: +mp
  if (!message.content.startsWith("+mp")) return;

  const voiceChannel = message.member.voice.channel;

  if (!voiceChannel) {
    return message.reply("❌ دخل للvoice first");
  }

  const args = message.content.split(" ");
  const link = args.slice(1).join(" ");

  if (!link) {
    return message.reply("❌ كتب link أو اسم الأغنية");
  }

  try {
    await distube.play(voiceChannel, link, {
      member: message.member,
      textChannel: message.channel
    });

    message.reply("🎵 Started playing");
  } catch (err) {
    console.log(err);
    message.reply("❌ Music error");
  }
});

// =====================
// 🎧 EVENTS
// =====================
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

// =====================
// 🔐 LOGIN
// =====================
client.login(process.env.TOKEN);
