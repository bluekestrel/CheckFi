import { Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import './Navigation.scss';

function Navigation() {
  return (
    <div className="navigation__main">
      <Nav
        activeKey="/"
        className={["container"]}
        onSelect={(selectedKey) => alert(`selected ${selectedKey}`)}
      >
        <Nav.Item>
          <Nav.Link className="navigation__link" as={Link} to="/" eventKey="home">CheckFi</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link className="navigation__link" as={Link} to="/about" eventKey="about">About</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link className="navigation__link" as={Link} to="/create_check" eventKey="link-1">Get Started</Nav.Link>
        </Nav.Item>
      </Nav>
    </div>
  );
}

export default Navigation;
