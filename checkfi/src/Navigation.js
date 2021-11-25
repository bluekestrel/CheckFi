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
          <Nav.Link
            className="navigation__link"
            as={Link}
            to="/"
            eventKey="home"
          >
            CheckFi
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            className="navigation__link"
            as={Link}
            to="/write_check"
            eventKey="link-1"
          >
              Write Check
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            className="navigation__link"
            as={Link}
            to="/redeem_check"
            eventKey="about"
          >
            Redeem Check
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            className="navigation__link"
            as={Link}
            to="/view"
            eventKey="about"
          >
            View Checks
          </Nav.Link>
        </Nav.Item>
      </Nav>
    </div>
  );
}

export default Navigation;
