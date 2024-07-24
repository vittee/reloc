import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ChannelType,
  channelMention,
  GuildMember
} from "discord.js";

import { chain } from "lodash";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandler } from "../types";
import { mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'move-all',
  description: 'Move all users from a voice channel into a new voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'from',
      description: 'The voice channel to move users from',
      type: ApplicationCommandOptionType.Channel,
      channel_types: [ChannelType.GuildVoice],
      required: true
    },
    {
      name: 'to',
      description: 'The designated voice channel',
      type: ApplicationCommandOptionType.Channel,
      channel_types: [ChannelType.GuildVoice],
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

const commandHandler: InteractionHandler = async (interaction) => {
  const from = interaction.options.getChannel('from');
  const to = interaction.options.getChannel('to');

  const [fromChannel, toChannel] = [from, to].map(c => c ? interaction.client.channels.cache.get(c.id) : undefined);

  if (!fromChannel?.isVoiceBased() || !toChannel?.isVoiceBased()) {
    interaction.reply('Invalid channel');
    return;
  }

  if (fromChannel.id === toChannel.id) {
    interaction.reply('Channels are identical');
    return;
  }

  const withBot = interaction.options.getBoolean('with-bot') ?? false;

  const members = chain(Array.from(fromChannel.members.values()))
    .filter(m => withBot || !m.user.bot)
    .shuffle()
    .sortBy(orderGuildMembers({
      issuer: interaction.user,
      reverse: false
    }))
    .value();

  if (members.length === 0) {
    interaction.reply(`No users in ${channelMention(fromChannel.id)}`);
    return;
  }

  await interaction.deferReply();

  const results: Array<GuildMember> = [];

  for (const member of members) {
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

const descriptor: CommandDescriptor = {
  declaration,
  commandHandler
}

export default descriptor;
