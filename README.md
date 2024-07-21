# Reloc

Reloc is a simple Discord bot capable of moving and/or disconnecting users from voice channels.

## Configurations

Reloc can be configured using the following environment variables

- `BOT_TOKEN` **(required)** - The bot token
- `CLIENT_ID` **(required)** - Client ID
- `BASE_COMMAND` **(optional)** - Slash command, default to `reloc`

## Running

- ### [Using Docker](#using-docker-1)
- ### [Using Docker Compose](#using-docker-compose-1)
- ### [Run from source](#run-from-source-1)

### Using Docker
```sh
docker run --rm \
    -e BOT_TOKEN=<your bot token> \
    -e CLIENT_ID=<client id> \
    ghcr.io/vittee/reloc:latest
```

### Using Docker Compose
```yaml
name: reloc

services:
  reloc:
    image: ghcr.io/vittee/reloc:latest
    environment:
      - BOT_TOKEN=<your bot token>
      - CLIENT_ID=<client id>
```

### Run from source
Simply clone or download this repository. Put the `BOT_TOKEN` and `CLIENT_ID` into a new file named `.env`

> .env
```
BOT_TOKEN=<your bot token>
CLIENT_ID=<client id>
```

Make sure you have [Bun](https://bun.sh/) installed and then execute this command.

```sh
bun start
```

## Adding bot to your servers
Upon running, a URL is printed to the output. Simply follow that link.

## Available Commands

### `kick-all`
Disconnect all users from a voice channel.

```
/reloc kick-all
```

### Arguments
- `channel` **(required)** - A voice channel
- `with-bot` **(optional)** - Normally, Reloc will not disconnect bot users unless this value is set to `True`

# Authors
- [Wittawas Nakkasem (vittee)](https://github.com/vittee)
