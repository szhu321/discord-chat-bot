# Discord Chat Bot

A discord chat bot. This bot is created using discord.js and openai.
- Supports RAG, using chromadb, to retrieve relevent past conversations.
- Supports message chaining to use previous message as context.
- Supports tool use to simulate running other discord /commands.


## Setup


### .env

This project requires a .env file that you will have to create and fill out. Here are the properties.
- `DISCORD_TOKEN=...`
    - Can be obtained from the Bot section on your discord developer portal.
- `CLIENT_ID=...`
    - Can be obtained from the General Information section on your discord developer portal. (AKA. APPLICATION ID).
- `GUILD_ID=...` **(Optional)**
    -  Only useful if you want to deploy slash commands to a specific guild when running `npm run deploy`. Otherwise it will deploy to all the guilds the bot is on. 
- `OPENAI_API_KEY=...`
    - Your openai api key.
- `OPENAI_MODEL=...` **(Optional)**
    - Your openai model. Defaults to `gpt-4o-mini`.

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

## Developement
In development we will use nodemon to restart our app when we make changes to the codebase.

To begin run:
```bash
npm run dev
```


## Packages Used

### discord.js
Used to interact with the discord API. Can be used to create slash commands and listen for new messages. See more [here](https://discord.js.org/).

### chromadb
Used to create a RAG system so that we can query relevant past context based on the user's message. See more [here](https://docs.trychroma.com/docs/overview/introduction).

### @chroma-core/openai
Used to integrate chromadb with openai's vector embedding models. See more [here](https://www.npmjs.com/package/@chroma-core/openai).

### dotenv
We like `.env` files. Useful for storing api keys and application specific configs. See more [here](https://www.npmjs.com/package/dotenv).

### openai
Used for calling OpenAI's APIs. We will use this to create our llm chatbot. See more [here](https://www.npmjs.com/package/openai).

### gpt-tokenizer
Used to count the number of tokens passed to OpenAI's APIs. See more [here](https://www.npmjs.com/package/gpt-tokenizer).

### pino
Used to log development information and runtime information. See more [here](https://getpino.io).