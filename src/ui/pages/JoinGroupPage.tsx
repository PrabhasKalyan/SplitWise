import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { linkGroupMembershipByToken } from "../../lib/db";
import { useAppState } from "../../state/AppContext";

export const JoinGroupPage = () => {
  const { token } = useParams();
  const { user, refreshData } = useAppState();
  const [message, setMessage] = useState("Preparing your group link...");

  useEffect(() => {
    if (!token) {
      setMessage("Missing join token.");
      return;
    }

    if (!user) {
      setMessage("Sign in first, then reopen this link to attach your account to the group.");
      return;
    }

    void linkGroupMembershipByToken(token, user.id)
      .then(() => {
        refreshData();
        setMessage("You’ve been added to the group.");
      })
      .catch((error) => setMessage(error.message));
  }, [refreshData, token, user]);

  return (
    <div className="center-stage">
      <div className="panel panel-ghost">
        <p className="eyebrow">Join group</p>
        <h1>{message}</h1>
        <Link to={user ? "/dashboard" : "/auth"} className="button">
          {user ? "Go to dashboard" : "Go to auth"}
        </Link>
      </div>
    </div>
  );
};
