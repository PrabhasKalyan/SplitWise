import { Link } from "react-router-dom";

export const NotFoundPage = () => (
  <div className="center-stage">
    <div className="panel panel-ghost">
      <p className="eyebrow">404</p>
      <h1>That route doesn’t exist.</h1>
      <Link to="/" className="button">
        Back to home
      </Link>
    </div>
  </div>
);
