import fs from "node:fs";
import path from "node:path";
import { Collection, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import DiscordClient from "./src/DiscordClient";
import { chatWithBot } from "./src/utils/llm-util";

dotenv.config();

const token = process.env.DISCORD_TOKEN;

// Create a new client instance
const client = new DiscordClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
	]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Reads all the files in the subfolders of commands. 
// Adds those file's slash commands to client.commands.
const foldersPath = path.join(__dirname, 'src/commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}


const eventsPath = path.join(__dirname, 'src/events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);

	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.on(Events.MessageCreate, async (message) => {
	// Ignore the messages sent by the bot.
	if (message.author.bot) {
		return;
	}

	// Only respond to messages that the bot is tagged in.
	if (client.user && message.mentions.has(client.user)) {
		// console.log("User: ", message.author.id);
		// console.log("Message: ", message.content);
		// console.log("Mentiones: ", message.mentions);

		message.channel.sendTyping();

		const { rawReply } = await chatWithBot({
			guildId: message.guildId,
			botName: client.user.displayName,
			botId: client.user.id,
			userId: message.author.id,
			userName: message.author.displayName,
			messageContent: message.content,
		});

		message.reply(rawReply);
	}
});

// Log in to Discord with your client's token
client.login(token);
