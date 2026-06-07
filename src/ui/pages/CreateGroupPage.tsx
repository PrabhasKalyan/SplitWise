import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../../lib/db";
import { GroupType } from "../../lib/types";
import { useAppState } from "../../state/AppContext";

const groupTypes: GroupType[] = ["trip", "home", "couple", "other"];

export const CreateGroupPage = () => {
  const { user, refreshData } = useAppState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("trip");
  const [members, setMembers] = useState([{ name: "", email: "", isAdmin: false }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateMember = (index: number, key: "name" | "email" | "isAdmin", value: string | boolean) => {
    setMembers((current) =>
      current.map((member, memberIndex) => (memberIndex === index ? { ...member, [key]: value } : member))
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const group = await createGroup(user, {
        name,
        type,
        members: members.filter((member) => member.name && member.email)
      });
      refreshData();
      navigate(`/groups/${group.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create group.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">Groups</p>
          <h1>Start a new group.</h1>
          <p className="muted">Collaborate on expenses and stay settled with your group.</p>
        </div>
      </div>

      <form className="panel stack-lg" onSubmit={(event) => void handleSubmit(event)} style={{ maxWidth: "900px", padding: "48px" }}>
        <div className="stack" style={{ marginBottom: "24px" }}>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>Group Details</p>
          <div className="grid-form" style={{ gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
            <label className="field">
              <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>Group Name</span>
              <input 
                className="input" 
                placeholder="e.g. Summer Goa Trip"
                value={name} 
                onChange={(event) => setName(event.target.value)} 
                required 
              />
            </label>

            <label className="field">
              <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>Type</span>
              <select className="input" value={type} onChange={(event) => setType(event.target.value as GroupType)}>
                {groupTypes.map((groupType) => (
                  <option key={groupType} value={groupType}>
                    {groupType.charAt(0).toUpperCase() + groupType.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="stack" style={{ marginTop: "24px" }}>
          <div className="panel-header" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">Members</p>
              <h3 style={{ margin: 0 }}>Add people</h3>
            </div>
            <button
              type="button"
              className="button button-secondary"
              style={{ padding: "8px 24px", borderRadius: "8px" }}
              onClick={() => setMembers((current) => [...current, { name: "", email: "", isAdmin: false }])}
            >
              + Add Person
            </button>
          </div>
          
          <div className="stack" style={{ marginTop: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 80px 40px", gap: "24px", padding: "0 8px 12px" }}>
              <span className="muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Name</span>
              <span className="muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Email Address</span>
              <span className="muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", textAlign: "center" }}>Admin</span>
              <span style={{ width: "40px" }} />
            </div>
            
            {members.map((member, index) => (
              <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 80px 40px", gap: "24px", alignItems: "center", padding: "20px 8px", borderTop: "1px solid var(--stroke)" }}>
                <input
                  className="input"
                  placeholder="Jane Doe"
                  value={member.name}
                  onChange={(event) => updateMember(index, "name", event.target.value)}
                  required={index === 0}
                  style={{ borderRadius: "8px" }}
                />
                <input
                  className="input"
                  placeholder="jane@example.com"
                  type="email"
                  value={member.email}
                  onChange={(event) => updateMember(index, "email", event.target.value)}
                  required={index === 0}
                  style={{ borderRadius: "8px" }}
                />
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <input
                    type="checkbox"
                    checked={member.isAdmin}
                    onChange={(event) => updateMember(index, "isAdmin", event.target.checked)}
                    style={{ width: "20px", height: "20px" }}
                  />
                </div>
                {members.length > 1 ? (
                  <button
                    type="button"
                    className="button-link"
                    style={{ color: "#9b2b2b", fontSize: "1.6rem", padding: 0, textDecoration: "none", display: "flex", justifyContent: "center" }}
                    onClick={() => setMembers((current) => current.filter((_, i) => i !== index))}
                  >
                    &times;
                  </button>
                ) : <div style={{ width: "40px" }} />}
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="auth-message" style={{ margin: "20px 0 0" }}>
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: "32px", borderTop: "1px solid var(--stroke)", paddingTop: "24px" }}>
          <button type="submit" className="button" style={{ width: "100%", padding: "16px", borderRadius: "12px", fontSize: "1.1rem" }} disabled={submitting}>
            {submitting ? "Creating space..." : "Create Group"}
          </button>
        </div>
      </form>
    </div>
  );
};
