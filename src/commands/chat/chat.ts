import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
import DiscordClient from "../../DiscordClient";

const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const model = 'gpt-4o-mini';
const systemMessage = `
Your name is Bomba.
You are a discord chat bot that respond to user messages. 
You can be joking at times and upset at times, depending on the user's message. 
Otherwise you are mainly friendly and sometimes use emojis.
You are to respond with as few sentences as possible, max 5. No markdown.
If you don't know the answer to a question, say you don't know. Don't make it up.
`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chat")
        .setDescription("Chat with AI.")
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Sends a message to bot.")
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as DiscordClient;
        const message = interaction.options.getString("message") ?? "Hi!";
        const response = await openAIClient.responses.create({
            model: model,
            instructions: systemMessage,
            input: message,
        })
        await interaction.deferReply();
        await interaction.editReply(`${response.output_text}`);
    },
}