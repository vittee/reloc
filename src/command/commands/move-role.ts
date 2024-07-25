import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  GuildMember,
  roleMention,
  ChannelType
} from "discord.js";

import { chain } from "lodash";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandler } from "../types";
import { mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'move-role',
  description: 'Move all users of the specified role into a new voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'role',
      description: 'User role',
      type: ApplicationCommandOptionType.Role,
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
  if (!interaction.guild) {
    interaction.reply('Not in a guild');
    return;
  }

  const roleOpt = interaction.options.getRole('role');
  const role = roleOpt ? await interaction.guild.roles.fetch(roleOpt.id) : undefined;

  if (!role) {
    interaction.reply('Invalid role');
    return;
  }

  const to = interaction.options.getChannel('to');
  const toChannel = to
    ? await interaction.client.channels.fetch(to.id)
    : undefined;

  if (!toChannel?.isVoiceBased()) {
    interaction.reply('Invalid channel');
    return;
  }

  const withBot = interaction.options.getBoolean('with-bot') ?? false;

  const members = chain(Array.from(role.members.values()))
    .filter(m => withBot || !m.user.bot)
    .shuffle()
    .sortBy(orderGuildMembers({
      issuer: interaction.user,
      reverse: false
    }))
    .value();

  if (members.length === 0) {
    interaction.reply(`No users of role ${roleMention(role.id)} in any voice channels`);
    return;
  }

  await interaction.deferReply();

  const results: Array<GuildMember> = [];

  for (const member of members) {
    if (member.voice.channelId === toChannel.id) {
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

const descriptor: CommandDescriptor = {
  declaration,
  commandHandler
}

export default descriptor;
