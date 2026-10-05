import { registerPlugin } from '../core/plugins.js';
// Mỗi thư mục con có index.jsx (export default plugin) sẽ tự được đăng ký
const modules = import.meta.glob('./*/index.jsx', { eager: true });
Object.values(modules).forEach((m) => registerPlugin(m.default));
