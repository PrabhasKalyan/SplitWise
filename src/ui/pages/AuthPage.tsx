import { FormEvent, useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export const AuthPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handle error parameters in URL hash (e.g. from expired magic links)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("error_description")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const description = params.get("error_description");
      if (description) {
        setMessage(description.replace(/\+/g, " "));
        setIsSuccess(false);
      }
    }
  }, []);

  const nextPath = ((location.state as { from?: string } | null)?.from ?? "/dashboard") as string;

  const handleGoogle = async () => {
    setMessage("");
    setIsSuccess(false);
    if (!supabase) {
      setMessage("Add Supabase environment variables to enable sign-in.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${nextPath}`
      }
    });

    if (error) {
      setMessage(error.message);
    }
  };

  const handleMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);
    if (!email) {
      setMessage("Please enter an email for the magic link.");
      return;
    }
    if (!supabase) {
      setMessage("Add Supabase environment variables to enable sign-in.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${nextPath}`
      }
    });
    setSubmitting(false);

    if (error) {
      setMessage(error.message);
    } else {
      setIsSuccess(true);
      setMessage(`Magic link sent to ${email}. Check your inbox!`);
    }
  };

  const handleEmailAuth = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);
    if (!supabase) {
      setMessage("Add Supabase environment variables to enable sign-in.");
      return;
    }

    if (isSignUp && !fullName) {
      setMessage("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ 
            email, 
            password,
            options: {
              data: { 
                full_name: fullName,
                name: fullName
              }
            }
          })
        : await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        let msg = error.message;
        if (msg.includes("Email not confirmed")) {
          msg = "Please check your email and click the verification link before signing in.";
        } else if (msg.includes("Invalid login credentials")) {
          msg = "Invalid email or password. Please try again or sign up if you don't have an account.";
        }
        setMessage(msg);
      } else if (isSignUp) {
        if (data.session) {
          setIsSuccess(true);
          setMessage("Signup successful! Redirecting...");
        } else {
          setIsSuccess(true);
          setMessage("Signup successful! Please check your email for a verification link.");
        }
      }
    } catch (err: any) {
      setMessage(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="center-stage">
      <div className="stack-lg auth-container">
        <Link to="/" className="brand auth-brand">
          Fairshare
        </Link>
        
        <div className="panel auth-panel">
          <p className="eyebrow">{isSignUp ? "Sign Up" : "Sign In"}</p>
          <h1>{isSignUp ? "Create your account." : "Welcome back."}</h1>
          <p className="muted auth-subtext">
            Split expenses and track balances with ease.
          </p>

          <div className="stack">
            <button type="button" className="button button-google" onClick={() => void handleGoogle()}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="hr-text"><span>or email</span></div>

            <form className="stack" onSubmit={(event) => void handleEmailAuth(event)}>
              {isSignUp && (
                <label className="field">
                  <span>Full Name</span>
                  <input
                    className="input"
                    type="text"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                  />
                </label>
              )}
              <label className="field">
                <span>Email address</span>
                <input
                  className="input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </label>
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? "Processing..." : isSignUp ? "Create account" : "Sign in with password"}
              </button>
            </form>

            <div className="hr-text"><span>or passwordless</span></div>

            <button 
              type="button" 
              className="button button-secondary" 
              disabled={submitting} 
              onClick={(e) => void handleMagicLink(e)}
            >
              Send magic link
            </button>

            <div className="auth-switch">
              <button 
                type="button" 
                className="button-link" 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage("");
                }}
              >
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </button>
            </div>

            {message ? (
              <div className={`auth-message ${isSuccess ? "success" : ""}`}>
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
