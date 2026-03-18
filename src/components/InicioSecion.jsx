import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';
import './InicioSecion.css';

const InicioSecion = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!usuario.trim() || !password.trim()) {
      setErrorMessage('Debes completar usuario y contrasena.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        const registerResponse = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ usuario: usuario.trim(), password }),
        });
        setSuccessMessage(registerResponse.message || 'Registro exitoso.');
        setIsRegisterMode(false);
      } else {
        const loginResponse = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ usuario: usuario.trim(), password }),
        });
        onLogin(loginResponse.user);
      }
      setPassword('');
    } catch (error) {
      setErrorMessage(error.message || 'No fue posible completar la operacion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsRegisterMode((prev) => !prev);
  };

  return (
    <section className="auth-wrap" id="inicio" aria-label="Acceso de usuarios">
      <article className="auth-card">
        <h1 className="auth-title">{isRegisterMode ? 'Crear cuenta' : 'Iniciar sesion'}</h1>

        {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}
        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

        <Form onSubmit={handleAuthSubmit}>
          <Form.Group className="mb-3" controlId="usuarioInput">
            <Form.Label>Usuario</Form.Label>
            <Form.Control
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="passwordInput">
            <Form.Label>Contrasena</Form.Label>
            <Form.Control
              type="password"
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Form.Group>

          <Button
            type="submit"
            className="w-100"
            variant={isRegisterMode ? 'success' : 'primary'}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : isRegisterMode ? 'Registrar' : 'Entrar'}
          </Button>
        </Form>

        <hr className="auth-separator" />
        <button type="button" className="auth-toggle-link" onClick={toggleMode}>
          {isRegisterMode ? 'Iniciar sesion' : 'No tienes cuenta? Registrate'}
        </button>
      </article>
    </section>
  );
};

export default InicioSecion;
