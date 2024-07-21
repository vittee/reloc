import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ChannelType,
  GuildMember,
  channelMention
} from "discord.js";

import { chain } from "lodash";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandler } from "../../command/types";
import { mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'kick-all',
  description: 'Disconnect all users from a voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'channel',
      description: 'A voice channel',
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
  const channelOpt = interaction.options.getChannel('channel');

  if (!channelOpt) {
    interaction.reply('Invalid channel');
    return;
  }

  const channel = interaction.client.channels.cache.get(channelOpt.id);

  if (!channel?.isVoiceBased()) {
    interaction.reply('Invalid channel');
    return;
  }

  const withBot = interaction.options.getBoolean('with-bot') ?? false;

  const members = chain(Array.from(channel.members.values()))
    .filter(m => withBot || !m.user.bot)
    .shuffle()
    .sortBy(orderGuildMembers({
      issuer: interaction.user,
      reverse: true
    }))
    .value();

  if (members.length === 0) {
    interaction.reply(`No users in ${channelMention(channel.id)}`);
    return;
  }

  await interaction.deferReply();

  const results: Array<GuildMember> = [];

  for (const member of members) {
    const disconnected = await member.voice.disconnect(`Demanded by ${interaction.user.username}`).catch(() => false as const);

    if (disconnected !== false) {
      results.push(disconnected);
    }
  }

  interaction.editReply([
    `Disconnected ${pluralize('user', results.length, true)}`,
    ...mentionUsers(results)
  ].join('\n'));
}

const descriptor: CommandDescriptor = {
  declaration,
  commandHandler
}

export default descriptor;
