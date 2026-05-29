const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ButtonStyle, 
  ButtonBuilder, 
  ActionRowBuilder 
} = require('discord.js');
const ms = require('ms');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'giveaway',
  description: 'Manage server giveaways (Staff/Admin Only).',
  cooldown: 5,
  aliases: ['gwy', 'g'],
  userPermissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage server giveaways (Staff/Admin Only).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub => 
      sub.setName('start')
        .setDescription('Start a new server giveaway.')
        .addStringOption(opt => opt.setName('duration').setDescription('How long the giveaway lasts (e.g. 10m, 1h, 1d)').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners to draw').setRequired(true))
        .addStringOption(opt => opt.setName('prize').setDescription('The giveaway reward').setRequired(true)))
    .addSubcommand(sub => 
      sub.setName('end')
        .setDescription('Force end an active giveaway.')
        .addStringOption(opt => opt.setName('message-id').setDescription('The giveaway message ID').setRequired(true)))
    .addSubcommand(sub => 
      sub.setName('reroll')
        .setDescription('Reroll winners for a concluded giveaway.')
        .addStringOption(opt => opt.setName('message-id').setDescription('The giveaway message ID').setRequired(true))),

  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply({
        embeds: [embeds.error("Invalid Syntax", "Correct Usage:\n`r!giveaway start <duration> <winners> <prize>`\n`r!giveaway end <message_id>`\n`r!giveaway reroll <message_id>`", client)]
      });
    }

    const action = args[0].toLowerCase();

    if (action === 'start') {
      if (args.length < 4) {
        return message.reply({
          embeds: [embeds.error("Invalid Syntax", "Usage: `r!giveaway start <duration> <winners> <prize...>`", client)]
        });
      }

      const durationStr = args[1];
      const winnersCount = parseInt(args[2]);
      const prize = args.slice(3).join(' ');

      const durationMs = ms(durationStr);
      if (!durationMs || durationMs < 5000) {
        return message.reply({
          embeds: [embeds.error("Invalid Duration", "Please provide a valid time format (e.g. `10m`, `2h`, `1d`). Minimum 5s.", client)]
        });
      }

      if (isNaN(winnersCount) || winnersCount <= 0) {
        return message.reply({
          embeds: [embeds.error("Invalid Winners", "The number of winners must be a positive integer.", client)]
        });
      }

      await this.startGiveawayLogic(message.channel, message.author, durationMs, winnersCount, prize, client);
      await message.delete().catch(() => {});
    } 
    else if (action === 'end') {
      const msgId = args[1];
      if (!msgId) {
        return message.reply({ embeds: [embeds.error("Missing Message ID", "Please specify the giveaway message ID.", client)] });
      }

      const giveaway = db.getGiveaway(msgId);
      if (!giveaway || giveaway.ended) {
        return message.reply({ embeds: [embeds.error("Giveaway Not Found", "No active giveaway found with that ID.", client)] });
      }

      // Force end
      giveaway.end_at = Date.now();
      db.saveGiveaway(giveaway);
      
      const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(msgId).catch(() => null);
        if (msg) {
          await this.endGiveaway(msg, giveaway, client);
          return message.reply({ embeds: [embeds.success("Giveaway Ended", "The giveaway has been concluded.", client)] });
        }
      }
      message.reply({ embeds: [embeds.error("Error", "Failed to force end the giveaway. Message may have been deleted.", client)] });
    }
    else if (action === 'reroll') {
      const msgId = args[1];
      if (!msgId) {
        return message.reply({ embeds: [embeds.error("Missing Message ID", "Please specify the giveaway message ID.", client)] });
      }

      const giveaway = db.getGiveaway(msgId);
      if (!giveaway || !giveaway.ended) {
        return message.reply({ embeds: [embeds.error("Giveaway Concluded Only", "The target giveaway must be completed before rerolling.", client)] });
      }

      await this.rerollGiveaway(message.channel, giveaway, client);
    }
  },

  async slashExecute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'start') {
      const durationStr = interaction.options.getString('duration');
      const winnersCount = interaction.options.getInteger('winners');
      const prize = interaction.options.getString('prize');

      const durationMs = ms(durationStr);
      if (!durationMs || durationMs < 5000) {
        return interaction.reply({
          embeds: [embeds.error("Invalid Duration", "Please provide a valid time format (e.g. `10m`, `2h`, `1d`).", client)],
          ephemeral: true
        });
      }

      if (winnersCount <= 0) {
        return interaction.reply({
          embeds: [embeds.error("Invalid Winners", "Winners count must be at least 1.", client)],
          ephemeral: true
        });
      }

      await interaction.reply({ content: "Launching giveaway...", ephemeral: true });
      await this.startGiveawayLogic(interaction.channel, interaction.user, durationMs, winnersCount, prize, client);
    }
    else if (subcommand === 'end') {
      const msgId = interaction.options.getString('message-id');
      const giveaway = db.getGiveaway(msgId);

      if (!giveaway || giveaway.ended) {
        return interaction.reply({ embeds: [embeds.error("Not Found", "No active giveaway found with that message ID.", client)], ephemeral: true });
      }

      giveaway.end_at = Date.now();
      db.saveGiveaway(giveaway);

      const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(msgId).catch(() => null);
        if (msg) {
          await this.endGiveaway(msg, giveaway, client);
          return interaction.reply({ embeds: [embeds.success("Giveaway Ended", " Concluded active giveaway.", client)], ephemeral: true });
        }
      }
      interaction.reply({ embeds: [embeds.error("Error", "Failed to retrieve the message.", client)], ephemeral: true });
    }
    else if (subcommand === 'reroll') {
      const msgId = interaction.options.getString('message-id');
      const giveaway = db.getGiveaway(msgId);

      if (!giveaway || !giveaway.ended) {
        return interaction.reply({ embeds: [embeds.error("Not Found / Active", "Concluded giveaway not found. Ensure it is ended first.", client)], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const success = await this.rerollGiveaway(interaction.channel, giveaway, client);
      if (success) {
        await interaction.editReply({ embeds: [embeds.success("Success", "Giveaway winners rerolled successfully.", client)] });
      } else {
        await interaction.editReply({ embeds: [embeds.error("Failed", "Unable to reroll winners.", client)] });
      }
    }
  },

  // Business Logic Methods
  async startGiveawayLogic(channel, host, durationMs, winnersCount, prize, client) {
    const endAt = Date.now() + durationMs;

    const embed = embeds.base("Rex Cloud Server Giveaway", null, client)
      .setDescription(
        `🎉 A brand new giveaway has been launched!\n\n` +
        `🏆 **Prize:** \`${prize}\`\n` +
        `👥 **Winners:** \`${winnersCount}\`\n` +
        `⏳ **Ends In:** <t:${Math.floor(endAt / 1000)}:R> (<t:${Math.floor(endAt / 1000)}:f>)\n` +
        `👤 **Hosted By:** ${host}`
      )
      .addFields({ name: "Entries", value: "`0` participants", inline: true });

    // Join Button
    const joinBtn = new ButtonBuilder()
      .setCustomId(`giveaway_join_TEMP`)
      .setLabel("Join Giveaway")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(joinBtn);
    const sentMsg = await channel.send({ embeds: [embed], components: [row] });

    // Re-create button customId with actual message ID to prevent collisons
    const finalJoinBtn = new ButtonBuilder()
      .setCustomId(`giveaway_join_${sentMsg.id}`)
      .setLabel("Join Giveaway")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Primary);

    const finalRow = new ActionRowBuilder().addComponents(finalJoinBtn);
    await sentMsg.edit({ components: [finalRow] });

    // Save in Database
    db.saveGiveaway({
      message_id: sentMsg.id,
      channel_id: channel.id,
      guild_id: channel.guild.id,
      prize: prize,
      winner_count: winnersCount,
      end_at: endAt,
      ended: false,
      participants: []
    });
  },

  async handleJoinGiveaway(interaction, client, messageId) {
    const giveaway = db.getGiveaway(messageId);
    if (!giveaway) {
      return interaction.reply({ content: "❌ No giveaway found.", ephemeral: true });
    }
    if (giveaway.ended) {
      return interaction.reply({ content: "❌ This giveaway has already concluded.", ephemeral: true });
    }

    const userId = interaction.user.id;
    let participants = giveaway.participants || [];

    if (participants.includes(userId)) {
      // Remove them
      participants = participants.filter(id => id !== userId);
      giveaway.participants = participants;
      db.saveGiveaway(giveaway);

      await interaction.reply({ content: "🎟️ You have removed your entry from this giveaway.", ephemeral: true });
    } else {
      // Add them
      participants.push(userId);
      giveaway.participants = participants;
      db.saveGiveaway(giveaway);

      await interaction.reply({ content: "🎉 You have successfully entered the giveaway! Good luck!", ephemeral: true });
    }

    // Update the message
    const embed = embeds.base("Rex Cloud Server Giveaway", null, client)
      .setDescription(
        `🎉 A brand new giveaway has been launched!\n\n` +
        `🏆 **Prize:** \`${giveaway.prize}\`\n` +
        `👥 **Winners:** \`${giveaway.winner_count}\`\n` +
        `⏳ **Ends In:** <t:${Math.floor(giveaway.end_at / 1000)}:R> (<t:${Math.floor(giveaway.end_at / 1000)}:f>)\n` +
        `👤 **Hosted By:** <@${interaction.message.embeds[0].description.split('Hosted By:** ')[1] || interaction.guild.ownerId}>`
      )
      .addFields({ name: "Entries", value: `\`${participants.length}\` participants`, inline: true });

    await interaction.message.edit({ embeds: [embed] });
  },

  async endGiveaway(message, giveaway, client) {
    giveaway.ended = true;
    db.saveGiveaway(giveaway);

    const participants = giveaway.participants || [];
    const winnersCount = giveaway.winner_count;

    // Disable the join button
    const endBtn = new ButtonBuilder()
      .setCustomId("giveaway_ended_btn")
      .setLabel("Giveaway Ended")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const row = new ActionRowBuilder().addComponents(endBtn);

    if (participants.length === 0) {
      const endedEmbed = embeds.error("Giveaway Ended - Cancelled", null, client)
        .setDescription(`🏆 **Prize:** \`${giveaway.prize}\`\n👥 **Winners:** None\n\n*Cancelled: No participants entered.*`);
      
      await message.edit({ embeds: [endedEmbed], components: [row] });
      await message.reply({ content: `📢 The giveaway for **${giveaway.prize}** has ended, but there were no valid entries.` });
      return;
    }

    // Select Winners
    const winners = [];
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(winnersCount, shuffled.length); i++) {
      winners.push(`<@${shuffled[i]}>`);
    }

    const endedEmbed = embeds.success("Giveaway Concluded!", null, client)
      .setDescription(
        `🏆 **Prize:** \`${giveaway.prize}\`\n` +
        `👥 **Winners:** ${winners.join(', ')}\n` +
        `🎟️ **Total Entries:** \`${participants.length}\``
      );

    await message.edit({ embeds: [endedEmbed], components: [row] });
    await message.reply({ 
      content: `🎉 **Congratulations** to ${winners.join(', ')}! You won **${giveaway.prize}**! 🎁` 
    });
  },

  async rerollGiveaway(channel, giveaway, client) {
    const participants = giveaway.participants || [];
    if (participants.length === 0) {
      channel.send({ embeds: [embeds.error("Reroll Failed", "No participants enrolled to select a winner.", client)] });
      return false;
    }

    // Pick random
    const randomIndex = Math.floor(Math.random() * participants.length);
    const winnerId = participants[randomIndex];
    const newWinner = `<@${winnerId}>`;

    channel.send({ 
      content: `🎉 **Reroll Concluded!** New winner drawn for **${giveaway.prize}**: ${newWinner}! 🎁` 
    });
    return true;
  }
};
