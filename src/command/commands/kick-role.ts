import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  GuildMember,
  roleMention,
  PermissionFlagsBits
} from "discord.js";

import { chain } from "lodash";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandler } from "../types";
import { mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'kick-role',
  description: 'Disconnect all users of the specified role from all voice channels',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'role',
      description: 'User role',
      type: ApplicationCommandOptionType.Role,
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

  if (role.permissions.has(PermissionFlagsBits.Administrator)) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      interaction.reply('Insufficient permissions');
      return;
    }
  }

  const withBot = interaction.options.getBoolean('with-bot') ?? false;

  const members = chain(Array.from(role.members.values()))
    .filter(m => withBot || !m.user.bot)
    .shuffle()
    .sortBy(orderGuildMembers({
      issuer: interaction.user,
      reverse: true
    }))
    .value();

  if (members.length === 0) {
    interaction.reply(`No users of role ${roleMention(role.id)} in any voice channels`);
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
