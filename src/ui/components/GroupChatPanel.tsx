import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { loadChatMessages, saveChatMessage } from "../../lib/indexedChat";
import { supabase } from "../../lib/supabase";
import { ChatMessage, Group, GroupMember } from "../../lib/types";
import { useAppState } from "../../state/AppContext";

interface GroupChatPanelProps {
  group: Group;
  members: GroupMember[];
}

const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with 0.7 quality to keep payload small for WebSockets
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });

export const GroupChatPanel = ({ group, members }: GroupChatPanelProps) => {
  const { user } = useAppState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  const member = useMemo(
    () => members.find((entry) => entry.user_id === user?.id) ?? null,
    [members, user?.id]
  );

  useEffect(() => {
    void loadChatMessages(group.id).then(setMessages).catch(console.error);
  }, [group.id]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase.channel(`group-chat:${group.id}`);
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const message = payload as ChatMessage;
        void saveChatMessage(message);
        setMessages((current) => [...current, message]);
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      void channel.unsubscribe();
    };
  }, [group.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!member || !user || (!content.trim() && !imageFile) || sending) {
      return;
    }

    try {
      setSending(true);
      const imageUrl = imageFile ? await compressImage(imageFile) : null;

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        groupId: group.id,
        senderId: user.id,
        senderName: member.name,
        content: content.trim(),
        imageUrl: imageUrl,
        sentAt: new Date().toISOString()
      };

      await saveChatMessage(message);
      setMessages((current) => [...current, message]);

      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "message",
          payload: message
        });
      }

      setContent("");
      setImageFile(null);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to process image for local storage.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Group chat</p>
          <h3>Local conversation</h3>
        </div>
        <span className="pill">IndexedDB (Images) + WebSocket</span>
      </div>

      <div className="chat-stream">
        {messages.length === 0 ? (
          <p className="muted">No local chat history on this device yet.</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="chat-bubble">
              <div className="chat-meta">
                <strong>{message.senderName}</strong>
                <span>{new Date(message.sentAt).toLocaleString()}</span>
              </div>
              {message.content ? <p>{message.content}</p> : null}
              {message.imageUrl ? (
                <img src={message.imageUrl} alt="Chat attachment" className="chat-image" />
              ) : null}
            </article>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form className="stack" onSubmit={(e) => void handleSubmit(e)}>
        <textarea
          className="textarea"
          rows={3}
          placeholder="Drop a note for the group..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={sending}
        />
        <div className="button-row">
          <input 
            type="file" 
            accept="image/*" 
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} 
            disabled={sending}
          />
          <button type="submit" className="button" disabled={sending}>
            {sending ? "Processing..." : "Send message"}
          </button>
        </div>
      </form>
    </div>
  );
};
