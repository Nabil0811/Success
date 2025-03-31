<template>
  <div class="correction">
    <div class="header">
      <h1>Correction</h1>
      <div class="user-info">
        <span>{{ username }}</span>
        <button @click="goBack">Retour</button>
      </div>
    </div>
    
    <div class="questionnaire-content">
      <h2>QUESTION n°{{ currentQuestion + 1 }}</h2>

      <div class="question-section">
        <div class="question">{{ questions[currentQuestion]?.titre }}</div>
        <div class="answers">
          <div
            v-for="(answer, index) in answers[currentQuestion]"
            :key="index"
            :class="{ correct: answer.etre_bonne_reponse }"
          >
            {{ answer.titre }}
          </div>
        </div>
      </div>

      <div class="navigation">
        <button class="btn back" @click="prevQuestion" :disabled="currentQuestion === 0">← Précédente</button>
        <button class="btn next" @click="nextQuestion" :disabled="currentQuestion === questions.length - 1">Suivante →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { supabase } from '../supabase';
import { useRoute } from 'vue-router';

const route = useRoute();
const username = ref(''); // Remplacez par le nom d'utilisateur actuel
const currentQuestion = ref(0);
const questions = ref([]);
const answers = ref([]);

const fetchCorrection = async (idQuestionnaire) => {
  try {
    // Récupérer les questions liées au questionnaire via la table Contenir
    const { data: questionsData, error: questionsError } = await supabase
      .from('contenir')
      .select('question(id_question, titre)')
      .eq('id_questionnaire', idQuestionnaire);

    if (questionsError) throw questionsError;
    questions.value = questionsData.map(q => q.question);

    // Récupérer les réponses pour chaque question
    for (const question of questions.value) {
      const { data: answersData, error: answersError } = await supabase
        .from('reponse')
        .select('id_reponse, titre, etre_bonne_reponse')
        .eq('id_question', question.id_question);

      if (answersError) throw answersError;
      answers.value.push(answersData);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des corrections :", error);
  }
};

const prevQuestion = () => {
  if (currentQuestion.value > 0) {
    currentQuestion.value--;
  }
};

const nextQuestion = () => {
  if (currentQuestion.value < questions.value.length - 1) {
    currentQuestion.value++;
  }
};

const goBack = () => {
  window.history.back();
};

watch(() => route.params.idQuestionnaire, (newIdQuestionnaire) => {
  if (newIdQuestionnaire) {
    fetchCorrection(newIdQuestionnaire);
  }
});

onMounted(() => {
  fetchCorrection(route.params.idQuestionnaire);
});
</script>

<style scoped>
.correction {
  font-family: Arial, sans-serif;
  color: #333;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border-radius: 10px;
  width: 100%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  color: white;
  font-size: 2rem;
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

.logout-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;
}

.logout-button:hover {
  background-color: #c0392b;
}

.questionnaire-content {
  margin-top: 80px;
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.question-section {
  margin: 20px 0;
}

.question-number {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.answers {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answers div {
  padding: 10px;
  border-radius: 5px;
  font-size: 16px;
}

.answers div.correct {
  background-color: #d4edda;
  color: #155724;
}

.navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.navigation .btn {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.navigation .btn:hover {
  background-color: #a070c2;
}
</style>