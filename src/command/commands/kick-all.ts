import {
  type APIApplicationCommandChannelOption,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ChannelType,
  GuildMember,
  userMention
} from "discord.js";

import { chain, range } from "lodash";
import { uniqBy } from "lodash/fp";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandlers } from "../../command/types";
import { fetchCommandVoiceChannels, mentionChannels, mentionUsers, orderGuildMembers } from "../../utils";
import { isProtected } from "./protect";

const declaration: APIApplicationCommandOption = {
  name: 'kick-all',
  description: 'Disconnect all users from a voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    ...range(0, 5)
      .map<APIApplicationCommandChannelOption>(i => ({
        name: `channel${i + 1}`,
        description: `Voice channel ${i + 1}`,
        type: ApplicationCommandOptionType.Channel,
        channel_types: [ChannelType.GuildVoice],
        required: i === 0
      })),
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
    const channels = await fetchCommandVoiceChannels(interaction,range(0, 5).map(i => `channel${i + 1}`))
      .then(all => all.filter(c => !!c))
      .then(uniqBy(c => c.id))

    if (channels.length <= 0) {
      interaction.reply('Invalid channel');
      return;
    }

    const withBot = interaction.options.getBoolean('with-bot') ?? false;

    const [protectedMembers, members] = chain(channels)
      .flatMap(c => Array.from(c.members.values()))
      .filter(m => withBot || !m.user.bot)
      .shuffle()
      .sortBy(orderGuildMembers({
        issuer: interaction.user,
        reverse: true
      }))
      .partition(m => isProtected(m.guild.id, m.user.id))
      .value();

    if ((members.length + protectedMembers.length) === 0) {
      interaction.reply(`No users in ${mentionChannels(channels).join(' ')}`);
      return;
    }

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

    await interaction.editReply([
      `Disconnected ${pluralize('user', results.length, true)}${reason ? ` (Reason: ${reason})`: ''}`,
      ...mentionUsers(results)
    ].join('\n'));

    if (protectedMembers.length) {
      interaction.followUp([
        `The following ${pluralize('user', protectedMembers.length)} ${protectedMembers.length === 1 ? 'is' : 'are' } being protected`,
        protectedMembers.map(m => userMention(m.id)).join('')
      ].join('\n'));
    }
  }
}

const descriptor: CommandDescriptor = {
  declaration,
  handlers
}

export default descriptor;
