import {
  type APIApplicationCommandOption,
  type APIApplicationCommandUserOption,
  ApplicationCommandOptionType,
  ChannelType,
  User,
  GuildMember
} from "discord.js";

import { chain, range } from "lodash";

import type { CommandDescriptor, InteractionHandler } from "../../command/types";
import { mentionUsers } from "../../utils";
import pluralize from "pluralize";

const declaration: APIApplicationCommandOption = {
  name: 'move',
  description: 'Move up to 10 users into a new voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'to',
      description: 'The designated voice channel',
      type: ApplicationCommandOptionType.Channel,
      channel_types: [ChannelType.GuildVoice],
      required: true
    },
    ...range(0, 10)
      .map<APIApplicationCommandUserOption>(i => ({
        name: `user${i + 1}`,
        description: `User ${i + 1}`,
        type: ApplicationCommandOptionType.User,
        required: i === 0
      }))
  ]
}

const commandHandler: InteractionHandler = async (interaction) => {
  if (!interaction.guild) {
    interaction.reply('Not in a guild');
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
