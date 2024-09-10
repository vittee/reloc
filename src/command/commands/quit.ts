import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType
} from "discord.js";

import type { CommandDescriptor, InteractionHandler } from "../../command/types";
import { mentionUsers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'quit',
  description: 'Disconnect yourself',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'reason',
      description: 'Reason',
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ]
}

const commandHandler: InteractionHandler = async (interaction) => {
  if (!interaction.guild) {
    interaction.reply('Not in a guild');
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user);

  if (!member) {
    interaction.reply(`Could not find you`);
    return;
  }

  if (!member.voice.channel) {
    interaction.reply(`You are not in a voice channel`);
    return;
  }

  const reason = interaction.options.getString('reason');

  await interaction.deferReply();

  const disconnected = await member.voice.disconnect(reason ?? `Demanded by ${interaction.user.username}`).catch(() => false as const);

  if (disconnected !== false) {


    interaction.editReply(`${mentionUsers([member])} has quited${reason ? ` (Reason: ${reason})`: ''}`);
  }
}

const descriptor: CommandDescriptor = {
  declaration,
  commandHandler
}

export default descriptor;
