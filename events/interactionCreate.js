const db = require('../database/db');
const config = require('../config/config');
const embeds = require('../utils/embeds');
const cooldownHandler = require('../handlers/cooldownHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // --- 1. CHAT INPUT COMMANDS (SLASH COMMANDS) ---
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Permission Checks
      if (command.userPermissions && command.userPermissions.length > 0) {
        const missingPermissions = [];
        for (const perm of command.userPermissions) {
          if (!interaction.member.permissions.has(perm)) {
            missingPermissions.push(perm);
          }
        }

        if (missingPermissions.length > 0) {
          const errEmbed = embeds.error(
            "Permission Denied",
            `You require the following permission(s) to execute this command:\n${missingPermissions.map(p => `\`${p}\``).join(', ')}`,
            client
          );
          return interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }

      // Cooldown Checks
      const timeLeft = cooldownHandler.checkCooldown(interaction, command);
      if (timeLeft > 0) {
        const waitEmbed = embeds.warning(
          "Cooldown Active",
          `Slow down! You are command-throttled. Please wait **${timeLeft.toFixed(1)}s** before calling \`/${command.name}\` again.`,
          client
        );
        return interaction.reply({ embeds: [waitEmbed], ephemeral: true });
      }

      // Slash Execution
      try {
        if (typeof command.slashExecute === 'function') {
          await command.slashExecute(interaction, client);
        } else {
          await interaction.reply({ 
            embeds: [embeds.error("Slash Command Error", "This command does not support slash command usage.", client)],
            ephemeral: true
          });
        }
      } catch (error) {
        console.error(`[Interaction] Error executing slash command "/${interaction.commandName}":`, error);
        
        const payload = { 
          embeds: [embeds.error("Execution Error", "An error occurred while executing this command.", client)], 
          ephemeral: true 
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    }

    // --- 2. BUTTON INTERACTIONS ---
    if (interaction.isButton()) {
      const [customId, data1, data2] = interaction.customId.split('_');

      // TICKET SYSTEM BUTTONS
      if (customId === 'ticket') {
        const ticketModule = require('../commands/ticket/ticket');
        if (data1 === 'create') {
          await ticketModule.handleCreateTicket(interaction, client);
        } else if (data1 === 'close') {
          await ticketModule.handleCloseTicket(interaction, client);
        } else if (data1 === 'claim') {
          await ticketModule.handleClaimTicket(interaction, client);
        }
      }

      // GIVEAWAY ENTRY BUTTON
      if (customId === 'giveaway') {
        if (data1 === 'join') {
          const giveawayModule = require('../commands/giveaway/giveaway');
          await giveawayModule.handleJoinGiveaway(interaction, client, data2);
        }
      }
    }

    // --- 3. MODAL SUBMISSIONS ---
    if (interaction.isModalSubmit()) {
      const [customId, data1] = interaction.customId.split('_');

      // PAYMENT CONFIRMATION MODAL
      if (customId === 'paymentConfirmModal') {
        const doneModule = require('../commands/payment/done');
        await doneModule.handleModalSubmit(interaction, client);
      }
    }
  }
};
