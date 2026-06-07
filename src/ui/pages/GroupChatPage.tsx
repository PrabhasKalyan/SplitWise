import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchGroupBundle } from "../../lib/db";
import { GroupBundle } from "../../lib/types";
import { GroupChatPanel } from "../components/GroupChatPanel";

export const GroupChatPage = () => {
  const { groupId } = useParams();
  const [bundle, setBundle] = useState<GroupBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    void fetchGroupBundle(groupId)
      .then(setBundle)
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading || !bundle) {
    return <div className="panel">Loading chat...</div>;
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">Group Chat</p>
          <h1>{bundle.group.name}</h1>
        </div>
      </div>
      <GroupChatPanel group={bundle.group} members={bundle.members} />
    </div>
  );
};
