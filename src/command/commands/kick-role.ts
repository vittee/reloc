import {
  type APIApplicationCommandOption,
  type APIApplicationCommandRoleOption,
  ApplicationCommandOptionType,
  GuildMember,
  PermissionFlagsBits,
  userMention
} from "discord.js";

import { chain, range } from "lodash";
import { uniqBy } from "lodash/fp";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandlers } from "../types";
import { fetchCommandRoles, mentionRoles, mentionUsers, orderGuildMembers } from "../../utils";
import { isProtected } from "./protect";

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

    const roles = await fetchCommandRoles(interaction, range(0, 5).map(i => `role${i + 1}`))
      .then(all => all.filter(r => !!r))
      .then(uniqBy(r => r.id));

    if (roles.length <= 0) {
      interaction.reply('Invalid role');
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      const adminRoles = roles.filter(role => role.permissions.has(PermissionFlagsBits.Administrator));

      if (adminRoles.length) {
        interaction.reply(`You do not have permissions for ${mentionRoles(adminRoles)}`);
        return;
      }
    }

    const withBot = interaction.options.getBoolean('with-bot') ?? false;

    const [protectedMembers, members] = chain(roles)
      .flatMap(role => Array.from(role.members.values()))
      .filter(m => withBot || !m.user.bot)
      .shuffle()
      .sortBy(orderGuildMembers({
        issuer: interaction.user,
        reverse: true
      }))
      .partition(m => isProtected(m.guild.id, m.user.id, true))
      .value();

    if ((members.length + protectedMembers.length) === 0) {
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
