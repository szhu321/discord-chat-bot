import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
import { ChromaClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

interface MessageItem {
    role: "user" | "assistant" | "system";
    content: string;
}

type MessageMap = { [id: string]: MessageItem[] };

const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const chromaClient = new ChromaClient();


const model = 'gpt-4o-mini';
const systemMessage = `You are an AI assistant that is speaking with users on discord.
You can be joking at times and upset at times. Otherwise you are mainly friendly and can use emojis.
You are to respond with as few sentences as possible, max 5. No markdown.
If you don't know the answer to a question, say you don't know. Do not make it up.
Do not end your response with a question unless it is absolutely necessary.
The user's message will be formatted as follows, **name**:message.
The first user message will include important past conversations.
`;

const messageMap: MessageMap = {};

const MAX_MESSAGE_CHAIN_LENGTH = 12;
const MAX_USER_MESSAGE_CHAR_COUNT = 600;

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("chat")
        .setDescription("Chat with AI.")
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Sends a message to bot.")
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const username = interaction.user.displayName;
        const assistantName = interaction.client.user.username;
        const messageChainId = guildId || userId;

        // Gets the message chain for the current user.
        let messageChain = messageMap[messageChainId];
        if (messageChain === undefined) {
            messageChain = [];
            messageMap[messageChainId] = messageChain;
        }

        let systemMessageModified = `Your name is ${assistantName}. ${systemMessage}`;

        const userMessageRaw = (interaction.options.getString("message") ?? "Hi!");
        const userMessage = `**${username}**:` + userMessageRaw;

        // Let's discord know that the a message will be sent soon.
        await interaction.deferReply();

        // Get the chroma collection from chroma client.
        const collection = await chromaClient.getOrCreateCollection({
            name: "chat-history",
            embeddingFunction: new OpenAIEmbeddingFunction({
                apiKey: process.env.OPENAI_API_KEY,
                modelName: "text-embedding-3-small",
            })
        });

        // Get similar context from chroma db.

        let queryResult = await collection.query({
            queryTexts: [userMessage],
            nResults: 12,
        });


        let previousContext = "The following context may be useful in the conversation: ";
        queryResult.documents[0].forEach((item) => {
            previousContext += "\n" + item;
        });

        // let messages = [
        //     { role: "system", content: systemMessageModified },
        //     { role: "user", content: previousContext },
        //     ...messageChain,
        //     { role: "user", content: userMessage.slice(0, MAX_USER_MESSAGE_CHAR_COUNT) },
        // ];

        // console.log(queryResult);
        // console.log(messages);

        // Call openai
        const completion = await openAIClient.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemMessageModified },
                { role: "user", content: previousContext },
                ...messageChain,
                { role: "user", content: userMessage.slice(0, MAX_USER_MESSAGE_CHAR_COUNT) },
            ]
        });

        const response = completion.choices[0].message.content ?? "I do not understand.";

        // Store user message and openai response into messageChain.
        messageChain.push({
            role: "user",
            content: userMessage.slice(0, MAX_USER_MESSAGE_CHAR_COUNT),
        }, {
            role: "assistant",
            content: response,
        });

        if (messageChain.length > MAX_MESSAGE_CHAIN_LENGTH) {
            messageChain.splice(0, 6);
        }

        const reply = `**${username} said:**\n${userMessageRaw.slice(0, MAX_USER_MESSAGE_CHAR_COUNT)}\n**${assistantName} replied:**\n${response}`;

        await collection.add({
            ids: [(new Date().toJSON())],
            documents: [reply],
        })

        await interaction.editReply(reply);
    },
}