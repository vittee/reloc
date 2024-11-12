import {
  type APIApplicationCommandOption,
  type APIApplicationCommandRoleOption,
  ApplicationCommandOptionType,
  GuildMember,
  ChannelType,
  PermissionFlagsBits
} from "discord.js";

import { chain, range } from "lodash";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandlers } from "../types";
import { fetchCommandRoles, fetchCommandVoiceChannels, mentionRoles, mentionUsers, orderGuildMembers } from "../../utils";
import { uniqBy } from "lodash/fp";

const declaration: APIApplicationCommandOption = {
  name: 'move-role',
  description: 'Move all users of the specified role into a new voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: (() => {
    const roles = range(0, 5)
      .map<APIApplicationCommandRoleOption>(i => ({
          name: `role${i + 1}`,
          description: `User role ${i + 1}`,
          type: ApplicationCommandOptionType.Role,
          required: i === 0
      }));

    return [
      roles[0],
      {
        name: 'to',
        description: 'The designated voice channel',
        type: ApplicationCommandOptionType.Channel,
        channel_types: [ChannelType.GuildVoice],
        required: true
      },
      ...roles.slice(1),
      {
        name: 'with-bot',
        description: 'Include bot users',
        type: ApplicationCommandOptionType.Boolean,
        required: false
      }
    ]
  })()
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

    const [toChannel] = await fetchCommandVoiceChannels(interaction, ['to']);

    if (!toChannel) {
      interaction.reply('Invalid channel');
      return;
    }

    const withBot = interaction.options.getBoolean('with-bot') ?? false;

    const members = chain(roles)
      .flatMap(role => Array.from(role.members.values()))
      .filter(m => withBot || !m.user.bot)
      .shuffle()
      .sortBy(orderGuildMembers({
        issuer: interaction.user,
        reverse: false
      }))
      .value();

    if (members.length === 0) {
      interaction.reply(`No users of role ${mentionRoles(roles)} in any voice channels`);
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
