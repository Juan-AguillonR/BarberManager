import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';
import './InicioSecion.css';

function CaptchaWidget({ onVerify }) {
  const [a] = useState(() => Math.ceil(Math.random() * 9));
  const [b] = useState(() => Math.ceil(Math.random() * 9));
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState(false);

  const verificar = () => {
    if (parseInt(respuesta, 10) === a + b) { onVerify(true); setError(false); }
    else { setError(true); onVerify(false); }
  };

  return (
    <div className="captcha-wrap">
      <p className="captcha-label">Verifica que no eres un robot:</p>
      <div className="captcha-row">
        <span className="captcha-pregunta">{a} + {b} =</span>
        <Form.Control type="number" className="captcha-input" value={respuesta}
          onChange={(e) => { setRespuesta(e.target.value); onVerify(false); }} placeholder="?" />
        <Button size="sm" variant="outline-secondary" onClick={verificar}>Verificar</Button>
      </div>
      {error && <small className="text-danger">Respuesta incorrecta.</small>}
    </div>
  );
}

// RNF1: validar contraseña con carácter especial obligatorio
function validarPassword(pwd) {
  if (pwd.length < 5) return 'La contraseña debe tener al menos 5 caracteres.';
  if (!/[^a-zA-Z0-9]/.test(pwd)) return 'Debe incluir al menos un carácter especial (ej: @, #, !, %).';
  return null;
}

const InicioSecion = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [intentosRestantes, setIntentosRestantes] = useState(null);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); setSuccessMessage('');

    if (!usuario.trim() || !password.trim()) {
      setErrorMessage('Debes completar usuario y contraseña.');
      return;
    }

    if (isRegisterMode) {
      if (!nombre.trim() || !apellido.trim()) {
        setErrorMessage('Nombre y apellido son requeridos.');
        return;
      }
      if (!telefono.trim()) {
        setErrorMessage('El teléfono es requerido.');
        return;
      }
      const errorPwd = validarPassword(password);
      if (errorPwd) { setErrorMessage(errorPwd); return; }
    }

    if (needsCaptcha && !captchaValid) {
      setErrorMessage('Debes completar el CAPTCHA correctamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        const res = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            usuario: usuario.trim(),
            password,
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            telefono: telefono.trim(),
          }),
        });
        setSuccessMessage(res.message || 'Registro exitoso. Ya puedes iniciar sesión.');
        setIsRegisterMode(false);
        setNombre(''); setApellido(''); setTelefono('');
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
      if (data.blocked) { setIsBlocked(true); }
      if (data.needsCaptcha) setNeedsCaptcha(true);
      if (data.intentosRestantes !== undefined) setIntentosRestantes(data.intentosRestantes);
      setErrorMessage(error.message || 'No fue posible completar la operación.');
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
    <section className="auth-wrap" aria-label="Acceso de usuarios">
      <article className="auth-card">
        <div className="auth-logo">✂️</div>
        <h1 className="auth-title">{isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión'}</h1>

        {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {intentosRestantes !== null && !isBlocked && (
          <Alert variant="warning">Intentos restantes: {intentosRestantes}</Alert>
        )}

        {isBlocked ? (
          <p className="text-center text-muted">Cuenta bloqueada temporalmente. Intenta en {15} minutos.</p>
        ) : (
          <Form onSubmit={handleAuthSubmit}>

            {isRegisterMode && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Apellido</Form.Label>
                  <Form.Control type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 3001234567" />
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Usuario</Form.Label>
              <Form.Control type="text" autoComplete="username" value={usuario}
                onChange={(e) => setUsuario(e.target.value)} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control type="password"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                value={password} onChange={(e) => setPassword(e.target.value)} />
              {isRegisterMode && (
                <Form.Text className="text-muted">
                  Mínimo 5 caracteres y al menos un carácter especial (@, #, !, %).
                </Form.Text>
              )}
            </Form.Group>

            {needsCaptcha && !isRegisterMode && <CaptchaWidget onVerify={setCaptchaValid} />}

            <Button type="submit" className="w-100 mt-2"
              variant={isRegisterMode ? 'success' : 'primary'} disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : isRegisterMode ? 'Registrar' : 'Entrar'}
            </Button>
          </Form>
        )}

        <hr className="auth-separator" />
        <button type="button" className="auth-toggle-link" onClick={toggleMode}>
          {isRegisterMode ? 'Ya tengo cuenta' : '¿No tienes cuenta? Regístrate'}
        </button>
      </article>
    </section>
  );
};

export default InicioSecion;