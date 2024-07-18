import {
  ApplicationCommandType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import kickAll from "./commands/kick-all";

export const descriptors = {
  kickAll
}

export const createCommandDeclarations = (baseCommand: string = 'reloc'): RESTPostAPIChatInputApplicationCommandsJSONBody => ({
  name: baseCommand,
  description: 'Reloc',
  type: ApplicationCommandType.ChatInput,
  options: Object.values(descriptors).map(desc => desc.declaration)
})
