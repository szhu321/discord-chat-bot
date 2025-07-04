import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
// import { ChromaClient } from "chromadb";
// import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import flipCoin from "../../tools/flip-coin";
import { addChatHistory, queryChatHistory } from "../../utils/chroma-util";

// interface MessageItem {
//     role: "user" | "assistant" | "system" | "tool";
//     content: string;
//     tool_call_id: string;
// }

type MessageItem =
    { role: "user" | "assistant" | "system", content: string } |
    { role: "tool", content: string, tool_call_id: string };

type MessageMap = { [id: string]: MessageItem[] };

const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

// const chromaClient = new ChromaClient();


// const model = 'gpt-4o-mini';
const model = 'gpt-4.1-mini';
const temperature = 0.75;
const systemMessage = `You are an AI assistant that is speaking with users on discord.
You can be joking at times and upset at times. Otherwise you are mainly friendly and can use emojis.
You are to respond with as few sentences as possible, max 5. No markdown.
If you don't know the answer to a question, say you don't know. Do not make it up.
Do not end your response with a question unless it is absolutely necessary.
The user's message will be formatted as follows, **name**:message.
The first user message will contain relevant past conversations.
`;

const messageMap: MessageMap = {};

const MAX_MESSAGE_CHAIN_LENGTH = 12;
/** The max number of results that should be retrieved from chromadb. */
const MAX_CHROMA_RESULTS_LENGTH = 12;
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

        const userMessageRaw = (interaction.options.getString("message") ?? "Hi!").slice(0, MAX_USER_MESSAGE_CHAR_COUNT);
        const userMessage = `**${username}**:` + userMessageRaw;

        // Let's discord know that the a message will be sent soon.
        await interaction.deferReply();


        let queryResult = await queryChatHistory({queryTexts: [userMessage], nResults: MAX_CHROMA_RESULTS_LENGTH});

        let previousContext = "The following context may be useful in the conversation: ";
        queryResult.documents[0].forEach((item) => {
            previousContext += "\n" + item;
        });
        

        // Call openai
        const completion = await openAIClient.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemMessageModified },
                { role: "user", content: previousContext },
                ...messageChain,
                {role: "user", content: userMessage}
            ],
            tools: [
                {
                    type: "function",
                    function: {
                        name: "flip-coin",
                        description: `Flips a coin and returns "Heads" or "Tails". Call this when the user wants to flip a coin.`,
                    }
                }
            ],
            temperature: temperature,
        });

        let response: string | undefined;
        let replyHeader: string = "";

        if (completion.choices[0].finish_reason == "tool_calls") {
            const toolCallResponse = completion.choices[0].message;
            const toolCallResults: MessageItem[] = [];
            if (toolCallResponse.tool_calls) {
                replyHeader = `**${assistantName} used:** \n`
                let flipCoinCallCount = 0;

                // Break if there are more than 10 tool calls.
                if(toolCallResponse.tool_calls.length > 10) {
                    await interaction.editReply("Sorry, I cannot make more than 10 tool calls at once!");
                    return;
                }

                toolCallResponse.tool_calls.forEach((toolCall) => {
                    if (toolCall.function.name === "flip-coin") {
                        const flipCoinResult = flipCoin();
                        // console.log("flipping coin");
                        flipCoinCallCount++;
                        toolCallResults.push({ role: "tool", content: flipCoinResult, tool_call_id: toolCall.id });
                    }
                });

                if(flipCoinCallCount > 1) {
                    replyHeader += `/flip-coin (${flipCoinCallCount} times)\n`;
                } else if(flipCoinCallCount == 1) {
                    replyHeader += `/flip-coin\n`;
                }
                // Call openai
                const afterToolResponse = await openAIClient.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: systemMessageModified },
                        { role: "user", content: previousContext },
                        ...messageChain,
                        {role: "user", content: userMessage},
                        toolCallResponse,
                        ...toolCallResults,
                    ],
                    temperature: temperature,
                });
                response = afterToolResponse.choices[0].message.content ?? "I do not understand.";
            }
        }

        if (!response) {
            response = completion.choices[0].message.content ?? "I do not understand.";
        }

        // Add the user's message to the message chain.
        messageChain.push({
            role: "user",
            content: userMessage,
        });

        // Store openai's response into messageChain.
        messageChain.push({
            role: "assistant",
            content: response,
        });

        if (messageChain.length > MAX_MESSAGE_CHAIN_LENGTH) {
            messageChain.splice(0, 6);
        }

        // console.log(messageChain);

        const reply = `**${username} said:**\n${userMessageRaw}\n${replyHeader}**${assistantName} replied:**\n${response}`;
        const storedReply = `**${username} said:**\n${userMessageRaw}\n**${assistantName} replied:**\n${response}`;

        await addChatHistory({
            ids: [(new Date().toJSON())],
            documents: [storedReply],
        });

        await interaction.editReply(reply);
    },
}
