import { createRoot } from 'react-dom/client';
import './plugins';                 // đăng ký toàn bộ plugin TRƯỚC khi render
import Shell from './core/Shell.jsx';
import Login from './core/Login.jsx';
import { I18nProvider } from './core/i18n.jsx';
import { AuthProvider, useAuth } from './core/auth.jsx';
import { ConfirmProvider } from './core/confirm.jsx';
import './styles.css';


const Gate = () => (useAuth().user ? <Shell /> : <Login />);

createRoot(document.getElementById('root')).render(
  <I18nProvider><ConfirmProvider><AuthProvider><Gate /></AuthProvider></ConfirmProvider></I18nProvider>
);
console.log('VITE_USE_REAL_API:', import.meta.env.VITE_USE_REAL_API);