import {
  ApplicationCommandOptionType,
  OAuth2Scopes,
  PermissionFlagsBits,
  PermissionsBitField,
  REST,
  Routes,
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  type APIApplicationCommandSubcommandOption,
  type RESTGetAPIApplicationCommandsResult,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import { createCommandDeclarations } from "./command";

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

function isSubCommandOptionIdentical(a: APIApplicationCommandSubcommandOption, b: APIApplicationCommandSubcommandOption) {
  if (!a.options || !b.options) {
    return false;
  }

  if (a.options.length !== b.options.length) {
    return false;
  }

  for (let i = 0; i < a.options.length; i++) {
    if (a.options[i].type !== b.options[i].type) {
      return false;
    }

    if (a.options[i].name !== b.options[i].name) {
      return false;
    }

    if (a.options[i].description !== b.options[i].description) {
      return false;
    }
  }

  return true;
}

function isSubCommandIdentical(a: APIApplicationCommandOption[], b: APIApplicationCommandOption[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i].type as any !== b[i].type as any) {
      return false;
    }

    if (a[i].type === ApplicationCommandOptionType.Subcommand) {
      const optionIdentical = isSubCommandOptionIdentical(
        a[i] as APIApplicationCommandSubcommandOption,
        b[i] as APIApplicationCommandSubcommandOption
      );

      if (!optionIdentical) {
        return false;
      }
    }

    if (a[i].name !== b[i].name) {
      return false;
    }

    if (a[i].description !== b[i].description) {
      return false;
    }
  }

  return true;
}

function isCmdIdentical(a: APIApplicationCommand, b: RESTPostAPIChatInputApplicationCommandsJSONBody): boolean {
  if (a.type as any !== b.type as any) {
    return false;
  }

  if (a.name !== b.name) {
    return false;
  }

  if (a.description !== b.description) {
    return false;
  }

  return isSubCommandIdentical(a.options ?? [], b.options ?? []);
}

export async function registerCommandsIfNeccessary(options: Record<'token' | 'clientId' | 'baseCommand', string>) {
  const { token, clientId, baseCommand } = options;
  const rest = new REST().setToken(token);

  const globalCommand = await rest.get(Routes.applicationCommands(clientId))
    .then(list => (list as RESTGetAPIApplicationCommandsResult).find(cmd => cmd.name === baseCommand))
    .then(command => command as APIApplicationCommand | undefined);

  const declaredCommand = createCommandDeclarations(baseCommand);

  if (!globalCommand || !isCmdIdentical(globalCommand, declaredCommand)) {
    console.info(`Registering global command`);

    await rest.put(Routes.applicationCommands(clientId),
      {
        body: [declaredCommand]
      }
    );
  }
}

export function shuffle<T>(a: Array<T>): Array<T> {
  const len = a?.length ?? 0;
  if (!len) {
    return [];
  }

  let i = -1;
  const lastIndex = len - 1;
  const result = [...a];
  while (++i < len) {
    const r = i + Math.floor(Math.random() * (lastIndex - i + 1));
    const v = result[r];
    result[r] = result[i];
    result[i] = v;
  }

  return result;
}
