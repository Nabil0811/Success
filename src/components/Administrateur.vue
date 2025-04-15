<template>
  <div>
    <div class="header">
      <h1>Administrateur</h1>
      <div class="user-info">
        <span>{{ authStore.user }}</span>
        <button @click="logout" class="logout-button">Déconnexion</button>
      </div>
    </div>

    <div class="main-actions">
      <router-link 
        to="/administrateur/utilisateurs" 
        class="nav-button" 
        :class="{ active: isActive('/administrateur/utilisateurs') }"
      >
        Utilisateurs
      </router-link>
      <router-link 
        to="/administrateur/questionnaires" 
        class="nav-button" 
        :class="{ active: isActive('/administrateur/questionnaires') }"
      >
        Questionnaires
      </router-link>
      <router-link 
        to="/administrateur/dashboard" 
        class="nav-button" 
        :class="{ active: isActive('/administrateur/dashboard') }"
      >
        Dashboard
      </router-link>
      <router-link 
        to="/administrateur/correction" 
        class="nav-button" 
        :class="{ active: isActive('/administrateur/correction') }"
      >
        Correction
      </router-link>
      <router-link 
        to="/administrateur/profils" 
        class="nav-button" 
        :class="{ active: isActive('/administrateur/profils') }"
      >
        Profils
      </router-link>
    </div>

    <div class="component-container">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/store/authStore';
import { useRouter, useRoute } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const logout = () => {
  authStore.logout();
  router.push('/');
};

const isActive = (path) => {
  return route.path.startsWith(path);
};
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  width: 98%;
  padding: 20px;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.header h1 {
  margin: auto;
  color: white;
  font-size: 2rem;
  text-align: center;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 10px;
  color: white;
  font-size: 1rem;
}

.logout-button {
  background-color: #e74c3c;
  color: white;
  padding: 8px 16px;
  font-size: 14px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.logout-button:hover {
  background-color: #c0392b;
}

.main-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 80px;
  flex-wrap: wrap;
}

.nav-button {
  text-decoration: none;
  font-family: 'Roboto', sans-serif;
  font-size: 1.2rem;
  font-weight: bold;
  color: #b5b2b2;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.2);
  letter-spacing: 1px;
  text-transform: uppercase;  
  padding: 12px 20px;
  border-radius: 5px;
  text-align: center;
  cursor: pointer;
  display: inline-block;
  transition: all 0.3s ease;
}

.nav-button:hover {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.nav-button.active {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.component-container {
  margin-top: 30px;
  padding: 20px;
}
</style>