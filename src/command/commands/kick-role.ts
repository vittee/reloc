import {
  type APIApplicationCommandOption,
  type APIApplicationCommandRoleOption,
  ApplicationCommandOptionType,
  GuildMember,
  PermissionFlagsBits
} from "discord.js";

import { chain, range } from "lodash";
import { uniqBy } from "lodash/fp";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandler } from "../types";
import { fetchCommandRoles, mentionRoles, mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'kick-role',
  description: 'Disconnect all users of the specified role from all voice channels',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    ...range(0, 5)
      .map<APIApplicationCommandRoleOption>(i => ({
          name: `role${i + 1}`,
          description: `User role ${i + 1}`,
          type: ApplicationCommandOptionType.Role,
          required: i === 0
      })),
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

  const roles = await fetchCommandRoles(interaction, range(0, 5).map(i => `role${i + 1}`))
    .then(all => all.filter(r => !!r))
    .then(uniqBy(r => r.id));

  if (roles.length <= 0) {
    interaction.reply('Invalid role');
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    const adminRoles = roles.filter(role => role.permissions.has(PermissionFlagsBits.Administrator));

    if (adminRoles) {
      interaction.reply(`You do not have permissions for ${mentionRoles(adminRoles)}`);
      return;
    }
  }

  const withBot = interaction.options.getBoolean('with-bot') ?? false;

  const members = chain(roles)
    .flatMap(role => Array.from(role.members.values()))
    .filter(m => withBot || !m.user.bot)
    .shuffle()
    .sortBy(orderGuildMembers({
      issuer: interaction.user,
      reverse: true
    }))
    .value();

  if (members.length === 0) {
    interaction.reply(`No users of role ${mentionRoles(roles)} in any voice channels`);
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
