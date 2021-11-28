import { Image, Nav } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';

import './Navigation.scss';
import logo from './logo.png';

function Navigation() {
  return (
    <div className="navigation__main">
      <Nav
        className={["container"]}
      >
        <Nav.Item>
          <Nav.Link
            as={NavLink}
            to="/"
            eventKey="Home"
          >
            <Image src={ logo } className="navigation__image" />
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            className="navigation__link"
            as={NavLink}
            to="/write_check"
            eventKey="WriteCheck"
          >
              Write Check
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            className="navigation__link"
            as={NavLink}
            to="/redeem_check"
            eventKey="RedeemCheck"
          >
            Redeem Check
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            className="navigation__link"
            as={NavLink}
            to="/view"
            eventKey="View"
          >
            View Checks
          </Nav.Link>
        </Nav.Item>
      </Nav>
    </div>
  );
}

export default Navigation;
