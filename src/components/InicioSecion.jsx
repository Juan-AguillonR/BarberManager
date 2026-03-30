import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';
import './InicioSecion.css';

// RNF6: CAPTCHA simple matemático
function CaptchaWidget({ onVerify }) {
  const [a] = useState(() => Math.ceil(Math.random() * 9));
  const [b] = useState(() => Math.ceil(Math.random() * 9));
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState(false);

  const verificar = () => {
    if (parseInt(respuesta, 10) === a + b) {
      onVerify(true);
      setError(false);
    } else {
      setError(true);
      onVerify(false);
    }
  };

  return (
    <div className="captcha-wrap">
      <p className="captcha-label">Verifica que no eres un robot:</p>
      <div className="captcha-row">
        <span className="captcha-pregunta">{a} + {b} = </span>
        <Form.Control
          type="number"
          className="captcha-input"
          value={respuesta}
          onChange={(e) => { setRespuesta(e.target.value); onVerify(false); }}
          placeholder="?"
        />
        <Button size="sm" variant="outline-secondary" onClick={verificar}>Verificar</Button>
      </div>
      {error && <small className="text-danger">Respuesta incorrecta.</small>}
    </div>
  );
}

const InicioSecion = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [intentosRestantes, setIntentosRestantes] = useState(null);

  // RNF1: validación de contraseña en frontend
  const validarPassword = (pwd) => {
    if (pwd.length < 5) return 'La contraseña debe tener al menos 5 caracteres.';
    return null;
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!usuario.trim() || !password.trim()) {
      setErrorMessage('Debes completar usuario y contraseña.');
      return;
    }

    if (isRegisterMode) {
      const errorPwd = validarPassword(password);
      if (errorPwd) { setErrorMessage(errorPwd); return; }
    }

    // RNF6: bloqueo por captcha
    if (needsCaptcha && !captchaValid) {
      setErrorMessage('Debes completar el CAPTCHA correctamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        const res = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ usuario: usuario.trim(), password }),
        });
        setSuccessMessage(res.message || 'Registro exitoso.');
        setIsRegisterMode(false);
      } else {
        const res = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ usuario: usuario.trim(), password, captchaValid }),
        });
        onLogin(res.user);
      }
      setPassword('');
    } catch (error) {
      const data = error.data || {};
      if (data.blocked) {
        setIsBlocked(true);
        setErrorMessage(error.message);
      } else {
        if (data.needsCaptcha) setNeedsCaptcha(true);
        if (data.intentosRestantes !== undefined) setIntentosRestantes(data.intentosRestantes);
        setErrorMessage(error.message || 'No fue posible completar la operación.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setErrorMessage(''); setSuccessMessage('');
    setNeedsCaptcha(false); setCaptchaValid(false);
    setIntentosRestantes(null); setIsBlocked(false);
    setIsRegisterMode((prev) => !prev);
  };

  return (
    <section className="auth-wrap" id="inicio" aria-label="Acceso de usuarios">
      <article className="auth-card">
        <div className="auth-logo">✂️</div>
        <h1 className="auth-title">{isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión'}</h1>

        {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {intentosRestantes !== null && !isBlocked && (
          <Alert variant="warning">Intentos restantes: {intentosRestantes}</Alert>
        )}

        {isBlocked ? (
          <p className="text-center text-muted">Tu cuenta está bloqueada temporalmente. Intenta en 15 minutos.</p>
        ) : (
          <Form onSubmit={handleAuthSubmit}>
            <Form.Group className="mb-3" controlId="usuarioInput">
              <Form.Label>Usuario</Form.Label>
              <Form.Control
                type="text"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="passwordInput">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {isRegisterMode && (
                <Form.Text className="text-muted">Mínimo 5 caracteres. Puedes usar caracteres especiales.</Form.Text>
              )}
            </Form.Group>

            {/* RNF6: CAPTCHA tras 3 intentos fallidos */}
            {needsCaptcha && !isRegisterMode && (
              <CaptchaWidget onVerify={setCaptchaValid} />
            )}

            <Button type="submit" className="w-100 mt-2" variant={isRegisterMode ? 'success' : 'primary'} disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : isRegisterMode ? 'Registrar' : 'Entrar'}
            </Button>
          </Form>
        )}

        <hr className="auth-separator" />
        <button type="button" className="auth-toggle-link" onClick={toggleMode}>
          {isRegisterMode ? 'Iniciar sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </article>
    </section>
  );
};

export default InicioSecion;