import {
  type APIApplicationCommandOption,
  type APIApplicationCommandChannelOption,
  ApplicationCommandOptionType,
  ChannelType,
  GuildMember
} from "discord.js";

import { chain, range } from "lodash";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandlers } from "../types";
import { fetchCommandVoiceChannels, mentionChannels, mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'move-all',
  description: 'Move all users from a voice channel into a new voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: (() => {
    const froms = range(0, 5)
      .map<APIApplicationCommandChannelOption>(i => ({
        name: `from${i + 1}`,
        description: `Voice channel ${i + 1}`,
        type: ApplicationCommandOptionType.Channel,
        channel_types: [ChannelType.GuildVoice],
        required: i === 0
      }));

    return [
      froms[0],
      {
        name: 'to',
        description: 'The designated voice channel',
        type: ApplicationCommandOptionType.Channel,
        channel_types: [ChannelType.GuildVoice],
        required: true
      },
      ...froms.slice(1),
      {
        name: 'with-bot',
        description: 'Include bot users',
        type: ApplicationCommandOptionType.Boolean,
        required: false
      }
    ];
  })()
}

const handlers: InteractionHandlers = {
  command: async (interaction) => {
    const channels = await fetchCommandVoiceChannels(
      interaction,
      [
        ...range(0, 5).map(i => `from${i + 1}`),
        'to'
      ]
    );

    const fromChannels = chain(channels)
      .slice(0, -1)
      .filter(c => !!c)
      .uniqBy(c => c.id)
      .value();

    const toChannel = channels.at(-1);

    if (fromChannels.length <= 0 || !toChannel) {
      interaction.reply('Invalid channel');
      return;
    }

    if (fromChannels.length === 1 && fromChannels[0].id === toChannel.id) {
      interaction.reply('Channels are identical');
      return;
    }

    const withBot = interaction.options.getBoolean('with-bot') ?? false;

    const members = chain(fromChannels)
      .reject(c => c.id === toChannel.id)
      .flatMap(c => Array.from(c.members.values()))
      .filter(m => withBot || !m.user.bot)
      .shuffle()
      .sortBy(orderGuildMembers({
        issuer: interaction.user,
        reverse: false
      }))
      .value();

    if (members.length === 0) {
      interaction.reply(`No users in ${mentionChannels(fromChannels).join('\n')}`);
      return;
    }

    await interaction.deferReply();

    const results: Array<GuildMember> = [];

    for (const member of members) {
      if (!member.voice.channelId || member.voice.channelId === toChannel.id) {
        continue;
      }

      const moved = await member.voice.setChannel(
        toChannel,
        `Demanded by ${interaction.user.username}`
      ).catch((e) => {
        console.error(`Error moving ${member.displayName} into ${toChannel.name}: ${e.message}`);
        return false as const;
      });

      if (moved !== false) {
        results.push(moved);
      }
    }

    interaction.editReply([
      `Moved ${pluralize('user', results.length, true)}`,
      ...mentionUsers(results)
    ].join('\n'));
  }
}

const descriptor: CommandDescriptor = {
  declaration,
  handlers
}

export default descriptor;
