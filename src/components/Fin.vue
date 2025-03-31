<template>
  <div class="fin">
    <div class="header">
      <h1>Fin de questionnaire</h1>
    </div>
    
    <div class="content">
      <h2>Vous avez terminé le questionnaire</h2>
      <button @click="voirCorrection">Voir la correction</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const voirCorrection = () => {
  router.push({ name: 'Correction' });
};
</script>

<style scoped>
.fin {
  font-family: Arial, sans-serif;
  color: #333;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.header {
  background-color: #c59edb;
  width: 100%;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.header h1 {
  margin: 0;
  color: white;
  font-size: 2rem;
}

.content {
  margin-top: 50px;
}

.content h2 {
  font-size: 1.5rem;
  margin-bottom: 20px;
}

button {
  background-color: #c59edb;
  border: none;
  padding: 10px 20px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #b48ac6;
}
</style>