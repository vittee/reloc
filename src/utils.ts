import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  GuildMember,
  OAuth2Scopes,
  PermissionFlagsBits,
  PermissionsBitField,
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  type APIApplicationCommandSubcommandOption,
  type RESTGetAPIApplicationCommandsResult,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type Snowflake,
  REST,
  type Channel,
  channelMention,
  type Role,
  roleMention,
  Routes,
  type User,
  userMention,
  type APIApplicationCommandNumberOption,
  type APIApplicationCommandStringOption
} from "discord.js";

import { createCommandDeclarations } from "./command";
import { chain, chunk } from "lodash";

export function generateOAuth2Url(clientId: string) {
  const scopes = [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands];

  const permissions = new PermissionsBitField(
    PermissionFlagsBits.MoveMembers
  );

  const url = new URL('/api/oauth2/authorize', 'https://discord.com')
  url.searchParams.append('client_id', clientId);
  url.searchParams.append('scope', scopes.join(' '));
  url.searchParams.append('permissions', permissions.bitfield.toString());

  return url;
}

function isSubCommandOptionIdentical(a: APIApplicationCommandSubcommandOption, b: APIApplicationCommandSubcommandOption): string | true {
  const opts_a = a.options ?? [];
  const opts_b = b.options ?? [];

  if (!opts_a && !opts_b) {
    return true;
  }

  if (!opts_a || !opts_b) {
    return 'Options mismatch';
  }

  if (opts_a.length !== opts_b.length) {
    return 'Options size mismatch';
  }

  for (let i = 0; i < opts_a.length; i++) {
    const opt_a = opts_a[i];
    const opt_b = opts_b[i];

    if (opt_a.type !== opt_b.type) {
      return 'Option type mismatch';
    }

    if (opt_a.name !== opt_b.name) {
      return 'Option name mismatch';
    }

    if (opt_a.description !== opt_b.description) {
      return 'Option description mismatch';
    }

    if ((opt_a.required ?? false) !== (opt_b.required ?? false)) {
      return 'Option required flag mismatch';
    }

    if (opt_a.type === ApplicationCommandOptionType.Number || opt_a.type === ApplicationCommandOptionType.Integer) {
      const opt_b_number = opt_b as APIApplicationCommandNumberOption;

      if (opt_a.min_value !== opt_b_number.min_value) {
        return 'Option min_value mismatch';
      }

      if (opt_a.max_value !== opt_b_number.max_value) {
        return 'Option max_value mismatch';
      }
    }

    if (opt_a.type === ApplicationCommandOptionType.String) {
      const opt_b_str = opt_b as APIApplicationCommandStringOption;

      if (opt_a.min_length !== opt_b_str.min_length) {
        return 'Option min_length mismatch';
      }

      if (opt_a.max_length !== opt_b_str.max_length) {
        return 'Option max_value mismatch';
      }
    }
  }

  return true;
}

function isSubCommandIdentical(a: APIApplicationCommandOption[], b: APIApplicationCommandOption[]): string | true {
  if (a.length !== b.length) {
    return 'Subcommand mismatch';
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i].type as any !== b[i].type as any) {
      return 'Subcommand type mismatch';
    }

    if (a[i].type === ApplicationCommandOptionType.Subcommand) {
      const optionIdentical = isSubCommandOptionIdentical(
        a[i] as APIApplicationCommandSubcommandOption,
        b[i] as APIApplicationCommandSubcommandOption
      );

      if (optionIdentical !== true) {
        return optionIdentical;
      }
    }

    if (a[i].name !== b[i].name) {
      return 'Subcommand name mismatch';
    }

    if (a[i].description !== b[i].description) {
      return 'Subcommand description mismatch';
    }
  }

  return true;
}

function isCmdIdentical(a: APIApplicationCommand, b: RESTPostAPIChatInputApplicationCommandsJSONBody): string | true {
  if (a.type as any !== b.type as any) {
    return 'Type mismatch';
  }

  if (a.name !== b.name) {
    return 'Name mismatch';
  }

  if (a.description !== b.description) {
    return 'Description mismatch';
  }

  return isSubCommandIdentical(a.options ?? [], b.options ?? []);
}

export async function registerCommandsIfNeccessary(options: Record<'token' | 'clientId' | 'baseCommand', string>) {
  const { token, clientId, baseCommand } = options;
  const rest = new REST().setToken(token);

  const globalCommand = await rest.get(Routes.applicationCommands(clientId))
    .then(list => (list as RESTGetAPIApplicationCommandsResult).find(cmd => cmd.name === baseCommand));

  const declaredCommand = createCommandDeclarations(baseCommand);

  const registrationCheck = !!globalCommand && isCmdIdentical(globalCommand, declaredCommand);

  if (registrationCheck !== true) {
    console.info(`Register global command, ${registrationCheck || 'not yet registered'}`);

    await rest.put(Routes.applicationCommands(clientId),
      {
        body: [declaredCommand]
      }
    );
  }
}
function mentionMultiple(users: GuildMember[], perLine: number, mentioner: typeof userMention): string[];
function mentionMultiple(users: Channel[], perLine: number, mentioner: typeof channelMention): string[];
function mentionMultiple(roles: Role[], perLine: number, mentioner: typeof roleMention): string[];
function mentionMultiple<I extends { id: Snowflake }>(items: Array<I>, perLine: number, mentioner: (id: I['id']) => string): string[] {
  return chunk(items.map(m => mentioner(m.id)), perLine).map(c => c.join(' '));
}

export const mentionUsers = (users: GuildMember[], perLine: number = 4) => mentionMultiple(users, perLine, userMention);

export const mentionChannels = (channels: Channel[], perLine: number = 4) => mentionMultiple(channels, perLine, channelMention);

export const mentionRoles = (roles: Role[], perLine: number = 4) => mentionMultiple(roles, perLine, roleMention);

/**
 * Sort guild members, the issuer comes first (if any)
 * Followed by bot users, and normal users come last
 *
 */
export function orderGuildMembers(options: { issuer?: User; reverse?: boolean; }) {
  const dir = options.reverse
    ? (v: number) => -v
    : (v: number) => +v;

  return (m: GuildMember) => {
    if (options.issuer && options.issuer.id === m.user.id) {
      return dir(1);
    }

    if (m.user.bot) {
      return dir(2);
    }

    return dir(3);
  }
}

export async function fetchCommandVoiceChannels(interaction: ChatInputCommandInteraction, names: string[]) {
  return chain(names)
    .map(name => interaction.options.getChannel(name))
    .map(c => c ? interaction.client.channels.fetch(c.id) : undefined)
    .thru(promises => (
      Promise.all(promises)
        .then(channels => channels
          .map(c => c?.isVoiceBased() ? c : undefined)
        )
    ))
    .value();
}

export async function fetchCommandRoles(interaction: ChatInputCommandInteraction, names: string[]) {
  const { guild, options } = interaction;

  if (!guild) {
    return [];
  }

  return chain(names)
    .map(name => options.getRole(name))
    .map(c => c ? guild.roles.fetch(c.id) : undefined)
    .thru(promises => Promise.all(promises).then(roles => roles.map(c => c ?? undefined)))
    .value();
}
