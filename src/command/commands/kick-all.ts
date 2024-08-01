import {
  type APIApplicationCommandChannelOption,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ChannelType,
  GuildMember
} from "discord.js";

import { chain, range } from "lodash";
import { uniqBy } from "lodash/fp";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandler } from "../../command/types";
import { fetchCommandVoiceChannels, mentionChannels, mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'kick-all',
  description: 'Disconnect all users from a voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    ...range(0, 5)
      .map<APIApplicationCommandChannelOption>(i => ({
        name: `channel${i + 1}`,
        description: `Voice channel ${i + 1}`,
        type: ApplicationCommandOptionType.Channel,
        channel_types: [ChannelType.GuildVoice],
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
  const channels = await fetchCommandVoiceChannels(interaction,range(0, 5).map(i => `channel${i + 1}`))
    .then(all => all.filter(c => !!c))
    .then(uniqBy(c => c.id))

  if (channels.length <= 0) {
    interaction.reply('Invalid channel');
    return;
  }

  const withBot = interaction.options.getBoolean('with-bot') ?? false;

  const members = chain(channels)
    .flatMap(c => Array.from(c.members.values()))
    .filter(m => withBot || !m.user.bot)
    .shuffle()
    .sortBy(orderGuildMembers({
      issuer: interaction.user,
      reverse: true
    }))
    .value();

  if (members.length === 0) {
    interaction.reply(`No users in ${mentionChannels(channels).join(' ')}`);
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
