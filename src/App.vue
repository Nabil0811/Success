<template>
  <div>

    <!-- Formulaire de connexion -->
    <div v-if="!authStore.isAuthenticated" class="login-container">
      <div class="header">
        <h1>Success</h1>
      </div>
      <div class="login-box">
        <h2>Connexion</h2>
        <form @submit.prevent="handleLogin">
          <div class="input-group">
            <label for="username">Nom d'utilisateur:</label>
            <input type="text" v-model="username" id="username" required />
          </div>
          <div class="input-group">
            <label for="password">Mot de passe:</label>
            <input type="password" v-model="password" id="password" required />
          </div>
          <button type="submit" class="submit-btn">Se connecter</button>
        </form>
      </div>
    </div>
  </div>
    <!-- Contenu des routes -->
    <router-view v-if="authStore.isAuthenticated" />
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from './store/authStore';

const authStore = useAuthStore();
const username = ref('');
const password = ref('');

const handleLogin = async () => {
  try {
    await authStore.login(username.value, password.value);
  } catch (error) {
    alert(error.message);
  }
};

const resetInactivityTimer = () => {
  authStore.resetInactivityTimer();
};

authStore.loadSession();
</script>

<style scoped>
/* Styles existants */
</style>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 98vh;
  background-color: #e5e5e5;
}

.header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  width: 100%;
  text-align: center;
  padding: 20px;
  position: fixed;
  top: 0;
  left: 0;
}

.header h1 {
  margin: 0;
  color: white;
  font-size: 2rem;
}

.login-box {
  background-color: #d9d9d9;
  padding: 40px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-bottom: 20px;
}

.input-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 200px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.submit-btn {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border: none;
  padding: 10px 20px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
}

.submit-btn:hover {
  background-color: #b48ac6;
}

.top-bar {
  background-color: #c59edb;
  padding: 10px;
  text-align: right;
}

.logout-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 5px;
  cursor: pointer;
}

.logout-btn:hover {
  background-color: #c0392b;
}
</style>
