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
    },
    {
      name: 'reason',
      description: 'Reason',
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ]
}

const commandHandler: InteractionHandler = async (interaction) => {
  const channelOpt = interaction.options.getChannel('channel');
  const channel = channelOpt
    ? await interaction.client.channels.fetch(channelOpt.id)
    : undefined;

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

  const reason = interaction.options.getString('reason');

  interaction.editReply([
    `Disconnected ${pluralize('user', results.length, true)}${reason ? ` (Reason: ${reason})`: ''}`,
    ...mentionUsers(results)
  ].join('\n'));
}

const descriptor: CommandDescriptor = {
  declaration,
  commandHandler
}

export default descriptor;
