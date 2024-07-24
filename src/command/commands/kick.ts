import {
  type APIApplicationCommandOption,
  type APIApplicationCommandUserOption,
  ApplicationCommandOptionType,
  User,
  GuildMember
} from "discord.js";

import { chain, range } from "lodash";

import type { CommandDescriptor, InteractionHandler } from "../../command/types";
import { mentionUsers } from "../../utils";
import pluralize from "pluralize";

const declaration: APIApplicationCommandOption = {
  name: 'kick',
  description: 'Disconnect up to 10 users',
  type: ApplicationCommandOptionType.Subcommand,
  options: range(0, 10)
    .map<APIApplicationCommandUserOption>(i => ({
      name: `user${i + 1}`,
      description: `User ${i + 1}`,
      type: ApplicationCommandOptionType.User,
      require: i === 0
    }))
}

const commandHandler: InteractionHandler = async (interaction) => {
  if (!interaction.guild) {
    interaction.reply('Not in a guild');
    return;
  }

  const users = chain(range(0, 10))
    .map(i => interaction.options.getUser(`user${i + 1}`))
    .filter((u): u is User => !!u)
    .uniqBy(u => u.id)
    .value();

  const members = Array.from((await interaction.guild.members.fetch({ user: users })).values())
    .filter(m => !!m.voice.channelId);

  if (members.length === 0) {
    interaction.reply(`The specified users were not found`);
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
