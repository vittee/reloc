import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ChannelType,
  GuildMember,
  userMention,
  channelMention
} from "discord.js";

import type { CommandDescriptor, InteractionHandler } from "../../command/types";

const declaration: APIApplicationCommandOption = {
  name: 'kick-all',
  description: 'Disconnect all users from a voice channel',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'channel',
      description: 'A voice channel',
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
  const channelOpt = interaction.options.getChannel('channel');
  const withBot = interaction.options.getBoolean('with-bot') ?? false;

  if (!channelOpt) {
    interaction.reply('Invalid channel')
    return;
  }

  const channel = interaction.client.channels.cache.get(channelOpt.id);

  if (!channel?.isVoiceBased()) {
    interaction.reply('Invalid channel')
    return;
  }

  const issuer = interaction.user;

  const members = withBot
    ? channel.members
    : channel.members.filter(m => !m.user.bot);

  if (members.size === 0) {
    interaction.reply(`No users in ${channelMention(channel.id)}`);
    return;
  }

  await interaction.deferReply();

  const results: Array<GuildMember> = [];

  for (const member of members.values()) {
    const disconnected = await member.voice.disconnect(`Demanded by ${issuer.username}`).catch(() => false as const);

    if (disconnected !== false) {
      results.push(disconnected);
    }
  }

  interaction.editReply([
    'Disconnected',
    ...results.map(m => userMention(m.id))
  ].join('\n'))
}

const descriptor: CommandDescriptor = {
  declaration,
  commandHandler
}

export default descriptor;
