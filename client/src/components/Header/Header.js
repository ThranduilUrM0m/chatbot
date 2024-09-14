import {
    NavLink
} from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

const Header = (props) => {
    return (
        <header>
            <Navbar key='xxl' expand='xxl' collapseOnSelect>
                <Container fluid>
                    <Navbar.Collapse className='show'>
                        <Nav className='d-flex flex-row justify-content-end'>
                            <Nav.Item className='me-auto'>
                                <NavLink to='/' className='logo d-flex align-items-center'>
                                    <img className='img-fluid' src='https://cdg.ma/themes/cdg/logo.svg' alt='HelpAI CDG' />
                                </NavLink>
                            </Nav.Item>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </header>
    );
}

export default Header;