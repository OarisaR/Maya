import { getDatabase, ref, set, get, remove } from "firebase/database";
import { app } from "@/lib/firebase";

const db = getDatabase(app);

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emergency?: boolean;
  sources?: any[];
};

export type Chat = {
  id: string;
  title: string;
  messages: Msg[];
  pinned?: boolean;
  archived?: boolean;
  createdAt: number;
};

export async function loadChats(uid: string): Promise<Chat[]> {
  const snapshot = await get(ref(db, `users/${uid}/chats`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data) as Chat[];
}

export async function saveChat(uid: string, chat: Chat): Promise<void> {
  await set(ref(db, `users/${uid}/chats/${chat.id}`), chat);
}

export async function deleteChat(uid: string, chatId: string): Promise<void> {
  await remove(ref(db, `users/${uid}/chats/${chatId}`));
}

export async function saveUserProfile(uid: string, name: string, email: string): Promise<void> {
  await set(ref(db, `users/${uid}/profile`), { name, email, uid });
}
export async function saveUserWeek(uid: string, week: number): Promise<void> {
  await set(ref(db, `users/${uid}/profile/pregnancyWeek`), week);
}

export async function loadUserWeek(uid: string): Promise<number | null> {
  const snapshot = await get(ref(db, `users/${uid}/profile/pregnancyWeek`));
  return snapshot.exists() ? snapshot.val() : null;
}