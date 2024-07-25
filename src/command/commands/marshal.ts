import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  GuildMember,
  type VoiceBasedChannel,
  ChannelType
} from "discord.js";

import { chain } from "lodash";
import pluralize from "pluralize";

import type { CommandDescriptor, InteractionHandler } from "../../command/types";
import { mentionUsers, orderGuildMembers } from "../../utils";

const declaration: APIApplicationCommandOption = {
  name: 'marshal',
  description: 'Move all users into a new voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
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

  const to = interaction.options.getChannel('to');
  const toChannel = to
    ? await interaction.client.channels.fetch(to.id)
    : undefined;

  if (!toChannel?.isVoiceBased()) {
    interaction.reply('Invalid channel');
    return;
  }

  const withBot = interaction.options.getBoolean('with-bot') ?? false;

  const allChannels = await interaction.guild.channels.fetch().then(all => Array.from(all.values()));

  const members = chain(allChannels)
    .filter((c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false)
    .flatMap(c => Array.from(c.members.values()))
    .filter(m => withBot || !m.user.bot)
    .shuffle()
    .sortBy(orderGuildMembers({
      issuer: interaction.user,
      reverse: false
    }))
    .value();

  await interaction.deferReply();

  const results: Array<GuildMember> = [];

  for (const member of members) {
    if (member.voice.channelId === toChannel.id) {
      continue;
    }

    const moved = await member.voice.setChannel(
      toChannel,
      `Demanded by ${interaction.user.username}`
    ).catch(() => false as const);

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
