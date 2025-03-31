import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './store/authStore';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

const authStore = useAuthStore();
authStore.loadSession(); // Charger la session utilisateur avant de monter l'app

app.mount('#app');
