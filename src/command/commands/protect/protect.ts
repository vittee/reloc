import { ApplicationCommandOptionType, type APIApplicationCommandOption, time as formatTime } from "discord.js";
import pluralize from 'pluralize';
import type { CommandDescriptor, InteractionHandlers } from "../../types";
import { addProtection, cleanProtections } from "./protection";

const commandHandler: InteractionHandlers['command'] = async (interaction) => {
  if (!interaction.guild) {
    interaction.reply('Not in a guild');
    return;
  }

  const protection = addProtection(interaction.client, interaction.guildId!, interaction.user.id);
  const until = Math.ceil(protection.expires / 1000);

  await interaction.reply({
    content: `You're now under my protection until ${formatTime(until, 'T')}, with ${pluralize('credit', protection.credits, true)}`,
    ephemeral: true
  });
}

setInterval(cleanProtections, 1e3);

const declaration: APIApplicationCommandOption = {
  name: 'protect',
  description: '🛡',
  type: ApplicationCommandOptionType.Subcommand
}

const descriptor: CommandDescriptor = {
  declaration,
  handlers: {
    command: commandHandler
  }
}

export default descriptor;
