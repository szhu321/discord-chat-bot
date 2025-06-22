const { SlashCommandBuilder } = require("discord.js");
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const model = 'gpt-4o-mini';
const systemMessage = `
You are a friendly discord chat bot that respond to user messages. Your name is Bomba.
You are to respond to questions with as few sentences as possible; max 3. No markdown.
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
    async execute(interaction) {
        const message = interaction.options.getString("message") ?? "Hi!";
        const response = await client.responses.create({
            model: model,
            instructions: systemMessage,
            input: message,
        })
        await interaction.deferReply();
        await interaction.editReply(`${response.output_text}`);
    },
}