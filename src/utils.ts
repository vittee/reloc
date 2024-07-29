import {
  ApplicationCommandOptionType,
  GuildMember,
  OAuth2Scopes,
  PermissionFlagsBits,
  PermissionsBitField,
  REST,
  Routes,
  User,
  userMention,
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  type APIApplicationCommandSubcommandOption,
  type RESTGetAPIApplicationCommandsResult,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import { createCommandDeclarations } from "./command";
import { chunk } from "lodash";

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
  if (!a.options && !b.options) {
    return true;
  }

  if (!a.options || !b.options) {
    return 'Options mismatch';
  }

  if (a.options.length !== b.options.length) {
    return 'Options size mismatch';
  }

  for (let i = 0; i < a.options.length; i++) {
    if (a.options[i].type !== b.options[i].type) {
      return 'Option type mismatch';
    }

    if (a.options[i].name !== b.options[i].name) {
      return 'Option name mismatch';
    }

    if (a.options[i].description !== b.options[i].description) {
      return 'Option description mismatch';
    }

    if ((a.options[i].required ?? false) !== (b.options[i].required ?? false)) {
      return 'Option required flag mismatch';
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

export function mentionUsers(users: GuildMember[], perLine: number = 4) {
  return chunk(users.map(m => userMention(m.id)), perLine).map(c => c.join(' '))
}

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
