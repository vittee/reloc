import {
  type APIApplicationCommandOption,
  type APIApplicationCommandUserOption,
  ApplicationCommandOptionType,
  User,
  GuildMember,
  userMention
} from "discord.js";

import { chain, range } from "lodash";

import type { CommandDescriptor, InteractionHandlers } from "../../command/types";
import { mentionUsers } from "../../utils";
import pluralize from "pluralize";
import { isProtected } from "./protect";

const declaration: APIApplicationCommandOption = {
  name: 'kick',
  description: 'Disconnect up to 10 users',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    ...range(0, 10)
      .map<APIApplicationCommandUserOption>(i => ({
        name: `user${i + 1}`,
        description: `User ${i + 1}`,
        type: ApplicationCommandOptionType.User,
        required: i === 0
      })),
    {
      name: 'reason',
      description: 'Reason',
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ]
}

const handlers: InteractionHandlers = {
  command: async (interaction) => {
    if (!interaction.guild) {
      interaction.reply('Not in a guild');
      return;
    }

    const users = chain(range(0, 10))
      .map(i => interaction.options.getUser(`user${i + 1}`))
      .filter((u): u is User => !!u)
      .uniqBy(u => u.id)
      .value();

    const [protectedMembers, members] = chain(Array.from((await interaction.guild.members.fetch({ user: users })).values()))
      .filter(m => !!m.voice.channelId)
      .partition(m => isProtected(m.guild.id, m.user.id))
      .value();

    if ((members.length + protectedMembers.length) === 0) {
      interaction.reply(`The specified users were not found or not in a voice channel`);
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
