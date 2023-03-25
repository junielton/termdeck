import { createApp } from 'vue';
import './tailwind.css';
import App from './App.vue';
import { createI18nInstance } from './i18n';

const i18n = createI18nInstance();
createApp(App).use(i18n).mount('#app');
