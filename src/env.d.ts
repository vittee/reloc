declare module "bun" {
  interface Env {
    BOT_TOKEN: string;
    CLIENT_ID: string;
    BASE_COMMAND: string;
  }
}
