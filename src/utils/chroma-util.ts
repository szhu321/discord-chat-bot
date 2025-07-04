import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import { ChromaClient, Collection, Metadata } from "chromadb";

const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

const CHAT_HISTORY_COLLECTION_NAME = "chat-history";

const chromaClient = new ChromaClient();

// Get the chroma collection from chroma client.
let chatHistoryCollection: Collection | undefined = undefined;

async function initializeCollection(name: string) {
    return await chromaClient.getOrCreateCollection({
        name: name,
        embeddingFunction: new OpenAIEmbeddingFunction({
            apiKey: process.env.OPENAI_API_KEY,
            modelName: OPENAI_EMBEDDING_MODEL,
        })
    });
}

export async function queryChatHistory(args: {
    queryEmbeddings?: number[][];
    queryTexts?: string[];
    ids?: string[];
    nResults?: number
}) {
    if(!chatHistoryCollection) {
        chatHistoryCollection = await initializeCollection(CHAT_HISTORY_COLLECTION_NAME);
    }

    let queryResult = await chatHistoryCollection.query(args);

    return queryResult;
}

export async function addChatHistory(args: {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Metadata[];
    documents?: string[];
    uris?: string[];
}) {
    if(!chatHistoryCollection) {
        chatHistoryCollection = await initializeCollection(CHAT_HISTORY_COLLECTION_NAME);
    }

    await chatHistoryCollection.add(args);
}