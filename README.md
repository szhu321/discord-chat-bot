# Discord Chat Bot

A discord chat bot. This bot is created using discord.js and openai.


## Setup


### .env

This project requires a .env file that you will have to create and fill out. Here are the properties.
- `DISCORD_TOKEN=...`
    - Can be obtained from the Bot section on your discord developer portal.
- `CLIENT_ID=...`
    - Can be obtained from the General Information section on your discord developer portal. (AKA. APPLICATION ID).
- `GUILD_ID=...`
    - `(Optional)` Only useful if you want to deploy your bot to a specific guild.
- `OPENAI_API_KEY=...`
    - Your openai api key.

### Add Bot To Guild
1. Go to dicord developer portal.
2. Open up your bot.
3. Open OAuth2 panel.
4. Under OAuth2 URL Generator check `applications.commands` and `bot`.
5. In bot permissions check `Send Messages`.
6. Open the generated URL in a browser.
7. Select the channel you would like to add the bot to and add the bot.

### Running chromadb
In order to store past conversations we will use the chromadb vector store.

1. Install chromadb with pip
```bash
pip install chromadb
```
2. Run chromadb and specify database directory.
```bash
chroma run --path ./chroma-db
```

### Running the project

If you are starting with a fresh project first install all the node packages.
```bash
npm install
```

Then run the command to compile the TypeScript files to JavaScript files. 
```bash
npm run build
```

Next deploy the commands onto all the channels that your bot is in.
```bash
npm run deploy
```

Finally start up the bot.
```bash
npm start
```