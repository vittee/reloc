import { ApplicationCommandOptionType, type APIApplicationCommandOption, time as formatTime } from "discord.js";
import { random } from "lodash";
import type { CommandDescriptor, InteractionHandlers } from "../../types";
import { addProtection, cleanProtections } from "./protection";

const commandHandler: InteractionHandlers['command'] = async (interaction) => {
  if (!interaction.guild) {
    interaction.reply('Not in a guild');
    return;
  }

  const timeout = random(1, 12 + 1) * 5;

  const expires = Date.now() + (timeout * 60 * 1000);
  const until = Math.ceil(expires / 1000);

  await interaction.reply({
    content: `You're now under my protection until ${formatTime(until, 'T')}`,
    ephemeral: true
  });

  addProtection(interaction.client, {
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    expires
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
