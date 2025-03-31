<template>
  <div>
    <div class="header">
      <h1>Début du Test</h1>
      <div class="user-info">
        <span>{{ username }}</span>
        <button @click="goBack" class="back-button">Retour</button>
      </div>
    </div>

    <div class="test-info">
      <h3>Nom du questionnaire :</h3>
      <p>{{ questionnaire.nom }}</p>
      <h3>Temps du questionnaire :</h3>
      <p>{{ questionnaire.temps_de_passage }} minutes</p>
      <h3>Note sur :</h3>
      <p>{{ totalPoints }} points</p>

      <button class="start-btn" @click="startEvaluation">Démarrer</button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, ref } from 'vue';
import { supabase } from '../supabase';

const props = defineProps({
  username: {
    type: String,
    required: true
  },
  questionnaire: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['startEvaluation']);

const totalPoints = ref(0);

onMounted(async () => {
  try {
    const { data: questionsData, error: questionsError } = await supabase
      .from('contenir')
      .select('question.points')
      .eq('id_questionnaire', props.questionnaire.id_questionnaire)
      .join('question', 'contenir.id_question', 'question.id_question');

    if (questionsError) {
      console.error('Erreur lors de la récupération des questions :', questionsError);
    } else {
      totalPoints.value = questionsData.reduce((acc, question) => acc + question.points, 0);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données :", error);
  }
});

const goBack = () => {
  history.back();
};

const startEvaluation = () => {
  emit('startEvaluation');
};
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  width: 98%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  color: white;
  font-size: 2rem;
  flex-grow: 1;
  text-align: center;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 20px;
  color: white;
  font-size: 1rem;
}

.back-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;
}

.back-button:hover {
  background-color: #c0392b;
}

.test-info {
  margin-top: 80px;
  text-align: center;
}

.test-info h3 {
  color: #333;
}

.start-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 20px;
}

.start-btn:hover {
  background-color: #a87ac4;
}
</style>