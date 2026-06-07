import { ChatMessage } from "./types";

const DB_NAME = "fairshare-chat";
const STORE_NAME = "messages";
const VERSION = 1;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("groupId", "groupId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const saveChatMessage = async (message: ChatMessage) => {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(message);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadChatMessages = async (groupId: string) => {
  const db = await openDb();

  return new Promise<ChatMessage[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).index("groupId").getAll(groupId);
    request.onsuccess = () => {
      const data = request.result as ChatMessage[];
      resolve(data.sort((a, b) => a.sentAt.localeCompare(b.sentAt)));
    };
    request.onerror = () => reject(request.error);
  });
};
