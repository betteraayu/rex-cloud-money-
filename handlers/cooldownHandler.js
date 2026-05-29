const { Collection } = require('discord.js');
const config = require('../config/config');

// Collection structure: commandName -> Collection(userId -> timestamp)
const cooldowns = new Collection();

module.exports = {
  cooldowns,
  
  checkCooldown(messageOrInteraction, command) {
    const { author, user } = messageOrInteraction;
    const currentUser = author || user;
    
    if (!cooldowns.has(command.name)) {
      cooldowns.set(command.name, new Collection());
    }
    
    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || config.cooldownDefault) * 1000;
    
    if (timestamps.has(currentUser.id)) {
      const expirationTime = timestamps.get(currentUser.id) + cooldownAmount;
      
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return timeLeft;
      }
    }
    
    timestamps.set(currentUser.id, now);
    setTimeout(() => timestamps.delete(currentUser.id), cooldownAmount);
    return 0;
  }
};
