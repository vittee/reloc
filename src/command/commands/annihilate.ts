import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  GuildMember,
  type VoiceBasedChannel
} from "discord.js";

import { chain } from "lodash";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandlers } from "../../command/types";
import { mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'annihilate',
  description: 'Disconnect all users from all voice channels',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'reason',
      description: 'Reason',
      type: ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: 'with-bot',
      description: 'Include bot users',
      type: ApplicationCommandOptionType.Boolean,
      required: false
    }
  ]
}

const handlers: InteractionHandlers = {
  command: async (interaction) => {
    if (!interaction.guild) {
      interaction.reply('Not in a guild');
      return;
    }

    const withBot = interaction.options.getBoolean('with-bot') ?? false;

    const allChannels = await interaction.guild.channels.fetch().then(all => Array.from(all.values()));

    const members = chain(allChannels)
      .filter((c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false)
      .flatMap(c => Array.from(c.members.values()))
      .filter(m => withBot || !m.user.bot)
      .shuffle()
      .sortBy(orderGuildMembers({
        issuer: interaction.user,
        reverse: true
      }))
      .value();

    const reason = interaction.options.getString('reason');
    const logMessage = reason || `Demanded by ${interaction.user.username}`;

    await interaction.deferReply();

    const results: Array<GuildMember> = [];

    for (const member of members) {
      const disconnected = await member.voice.disconnect(logMessage).catch(() => false as const);

      if (disconnected !== false) {
        results.push(disconnected);
      }
    }

    interaction.editReply([
      `Disconnected ${pluralize('user', results.length, true)}${reason ? ` (Reason: ${reason})`: ''}`,
      ...mentionUsers(results)
    ].join('\n'));
  }
}

const descriptor: CommandDescriptor = {
  declaration,
  handlers
}

export default descriptor;
