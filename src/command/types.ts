import {
  type ChatInputCommandInteraction,
  type APIApplicationCommandOption,
  type BaseInteraction
} from "discord.js";

export type InteractionHandler = (interaction: ChatInputCommandInteraction, ...args: any) => Promise<any>;

export type CommandDescriptor = {
  declaration: APIApplicationCommandOption,
  commandHandler: InteractionHandler;
}
