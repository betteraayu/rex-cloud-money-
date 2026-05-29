const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  ButtonStyle, 
  ButtonBuilder, 
  ActionRowBuilder 
} = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'ticket',
  description: 'Deploy support ticketing panel or configure setups (Staff/Admin Only).',
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.Administrator],
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Deploy support ticketing panel or configure setups (Staff/Admin Only).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => 
      sub.setName('setup')
        .setDescription('Deploy the support ticket creator panel.')
        .addChannelOption(opt => 
          opt.setName('channel')
            .setDescription('Channel to post the support panel in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))),

  async execute(message, args, client) {
    if (args.length === 0 || args[0].toLowerCase() !== 'setup') {
      return message.reply({
        embeds: [embeds.error("Invalid Syntax", "Correct Usage: `r!ticket setup <#channel>`", client)]
      });
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply({
        embeds: [embeds.error("Invalid Channel", "Please mention a valid text channel to deploy the panel.", client)]
      });
    }

    await this.deployTicketPanel(channel, client);
    message.reply({ embeds: [embeds.success("Panel Deployed", `Ticket desk setup complete in ${channel}!`, client)] });
  },

  async slashExecute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const channel = interaction.options.getChannel('channel');

      await this.deployTicketPanel(channel, client);
      interaction.reply({ embeds: [embeds.success("Panel Deployed", `Ticket desk setup complete in ${channel}!`, client)], ephemeral: true });
    }
  },

  // Panel Deploy
  async deployTicketPanel(channel, client) {
    const embed = embeds.base("Rex Cloud Support Desk", null, client)
      .setDescription(
        "Need assistance with a hosting issue, billing inquiries, or general cloud queries?\n\n" +
        "⚡ Click the button below to spawn a private support session. A staff member will join shortly."
      );

    const openBtn = new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("Open Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(openBtn);
    await channel.send({ embeds: [embed], components: [row] });
  },

  // --- BUTTON CLICKS HANDLERS ---

  async handleCreateTicket(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    // Check if user already has an open ticket in the server database
    const tickets = db.isSqlite 
      ? require('better-sqlite3')(require('path').join(__dirname, '../../database/database.db')).prepare("SELECT * FROM tickets WHERE user_id = ? AND status = 'open'").all(interaction.user.id)
      : Object.values(require('../../database/db').getTicket || {}).filter(t => t.user_id === interaction.user.id && t.status === 'open');

    // Wait, let's look for active channel to double check
    if (tickets && tickets.length > 0) {
      const existingChannel = await interaction.guild.channels.fetch(tickets[0].channel_id).catch(() => null);
      if (existingChannel) {
        return interaction.editReply({
          embeds: [embeds.error("Duplicate Ticket", `You already have an open support channel: ${existingChannel}`, client)]
        });
      }
    }

    // Create private channel
    const channelName = `ticket-${interaction.user.username.replace(/\s+/g, '-').toLowerCase()}`;
    const newChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        }
      ]
    });

    // Save ticket state
    db.saveTicket({
      channel_id: newChannel.id,
      guild_id: interaction.guild.id,
      user_id: interaction.user.id,
      status: 'open',
      claimed_by: null
    });

    // Welcome Embed
    const welcomeEmbed = embeds.base("Support Session Initiated", null, client)
      .setDescription(
        `Welcome ${interaction.user} to your secure billing and support portal.\n\n` +
        `📝 **Instructions:** Please describe your issue in detail. If you are uploading a screenshot, attach it directly.\n` +
        `💼 **Staff Response:** Rex Cloud Support agents will claim this ticket shortly.`
      );

    const claimBtn = new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Claim Ticket")
      .setEmoji("🙋")
      .setStyle(ButtonStyle.Success);

    const closeBtn = new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);
    await newChannel.send({ content: `${interaction.user} • Rex Cloud Staff`, embeds: [welcomeEmbed], components: [row] });

    await interaction.editReply({
      embeds: [embeds.success("Ticket Created", `Your support session has spawned: ${newChannel}`, client)]
    });
  },

  async handleClaimTicket(interaction, client) {
    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: "❌ Database records for this channel are missing.", ephemeral: true });
    }

    if (ticket.claimed_by) {
      return interaction.reply({ content: `❌ Ticket is already claimed by <@${ticket.claimed_by}>`, ephemeral: true });
    }

    // Update DB
    ticket.claimed_by = interaction.user.id;
    db.saveTicket(ticket);

    // Alert Channel
    const claimEmbed = embeds.success(
      "Ticket Claimed",
      `Rex Cloud Staff Member ${interaction.user} has claimed this ticket and will be assisting you.`,
      client
    );

    // Disable claim button in the original message
    const welcomeMessage = await interaction.channel.messages.fetch({ limit: 50 }).then(messages => 
      messages.find(m => m.embeds.length > 0 && m.embeds[0].title === "Support Session Initiated")
    ).catch(() => null);

    if (welcomeMessage) {
      const closeBtn = new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);

      const claimDisabledBtn = new ButtonBuilder()
        .setCustomId("ticket_claimed_btn")
        .setLabel(`Claimed by ${interaction.user.username}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true);

      const updatedRow = new ActionRowBuilder().addComponents(claimDisabledBtn, closeBtn);
      await welcomeMessage.edit({ components: [updatedRow] }).catch(() => {});
    }

    await interaction.reply({ embeds: [claimEmbed] });
  },

  async handleCloseTicket(interaction, client) {
    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) {
      // Just close standard channel if db corrupt
      await interaction.reply({ content: "🔒 Database record missing. Deleting channel in 5s..." });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      return;
    }

    ticket.status = 'closed';
    db.saveTicket(ticket);

    await interaction.reply({
      embeds: [embeds.warning("Closing Ticket", "Support ticket has been closed by staff. Deleting channel in **5 seconds**...", client)]
    });

    setTimeout(async () => {
      const guild = interaction.guild;
      const channelId = interaction.channel.id;
      
      // Attempt to log ticket closure
      const guildConfig = db.getGuildConfig(guild.id);
      if (guildConfig && guildConfig.log_channel_id) {
        const logChannel = await guild.channels.fetch(guildConfig.log_channel_id).catch(() => null);
        if (logChannel) {
          const logEmbed = embeds.warning(
            "Ticket Closed Log",
            null,
            client
          )
          .addFields(
            { name: "Ticket Channel", value: `\`ticket-${client.users.cache.get(ticket.user_id)?.username || 'user'}\``, inline: true },
            { name: "Opened By", value: `<@${ticket.user_id}>`, inline: true },
            { name: "Closed By", value: `${interaction.user}`, inline: true },
            { name: "Claimed By", value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : "*Unclaimed*", inline: true }
          );

          logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      await interaction.channel.delete().catch(() => {});
    }, 5000);
  }
};
