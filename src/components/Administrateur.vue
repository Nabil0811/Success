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
  margin-top: 50px;
}

.nav-button {
  text-decoration: none;
  font-family: 'Roboto', sans-serif; /* Police moderne */
  font-size: 2.5rem; /* Taille impressionnante */
  font-weight: bold; /* Texte épais */
  color: #b5b2b2; /* Couleur blanche pour le texte */
  text-shadow: 2px 2px 1px rgba(0, 0, 0, 1); /* Ombre subtile pour le texte */
  letter-spacing: 2px; /* Espacement entre les lettres */
  text-transform: uppercase; /* Majuscules */  
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 16px;
  margin-top: 60px;
  text-align: center;
  cursor: pointer;
  display: inline-block;
}

.nav-button:hover {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
}

.nav-button.active {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
}

.component-container {
  margin-top: 20px;
  padding: 20px;
  text-align: center;
}
</style>