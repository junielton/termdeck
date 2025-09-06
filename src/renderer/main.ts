import { createApp } from 'vue';
import './tailwind.css';
import App from './App.vue';
import { createI18nInstance } from './i18n';

const i18n = createI18nInstance();
const app = createApp(App);
app.use(i18n);
app.mount('#app');

// Remove initial loader (if still present) after next frame to avoid flash
requestAnimationFrame(() => {
	const loader = document.getElementById('initial-loader');
	if (loader && loader.parentElement) {
		loader.parentElement.removeChild(loader);
	}
});
