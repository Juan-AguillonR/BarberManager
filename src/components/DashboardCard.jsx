import Button from 'react-bootstrap/Button';
import './DashboardCard.css';

function DashboardCard({ id, title, description, buttonText, icon }) {
  return (
    <article className="dashboard-card" id={id}>
      <h2 className="dashboard-card-title">
        {icon ? <span className="dashboard-card-icon">{icon}</span> : null}
        {title}
      </h2>
      <p>{description}</p>
      <Button variant="dark" size="sm">
        {buttonText}
      </Button>
    </article>
  );
}

export default DashboardCard;
