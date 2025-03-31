<template>
  <div class="creation-qu-container">
    <h2>Création de Questions</h2>

    <div class="question-counter">
      <span>Question {{ currentQuestionIndex + 1 }}/{{ questions.length }}</span>
    </div>

    <form @submit.prevent="createQuestion">
      <label>Titre de la question :
        <input v-model="currentQuestion.titre" type="text" required />
      </label>

      <div v-for="(reponse, index) in currentQuestion.reponses" :key="index" class="option-container">
        <label>
          Option {{ index + 1 }} :
          <input v-model="reponse.titre" type="text" :placeholder="'Option ' + (index + 1)" required />
        </label>
        <label>
          <input type="checkbox" v-model="reponse.bonne_reponse" :value="true" />
          Bonne réponse
        </label>
        <button type="button" class="delete-btn" @click="deleteResponse(index)">Supprimer</button>
      </div>

      <button type="button" class="add-response-btn" @click="addResponse">Ajouter une réponse</button>

      <div class="modal-actions">
        <button type="button" class="back-btn" @click="goToQuestionnaireCreation">Retour</button>
      </div>
    </form>

    <div class="navigation-buttons">
      <button class="nav-btn" @click="navigateQuestion('prev')" :disabled="currentQuestionIndex === 0">← Précédente</button>
      <button class="nav-btn" @click="navigateQuestion('next')" :disabled="currentQuestionIndex === questions.length - 1">Suivante →</button>
      <button class="nav-btn" @click="addQuestion">Ajouter une question</button>
      <button type="button" class="delete-btn" @click="deleteCurrentQuestion" :disabled="questions.length === 1">Supprimer cette question</button>
    </div>

    <button class="validate-all-button" @click="validateAllQuestions">Valider les questions</button>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase';
import { useRouter, useRoute } from 'vue-router';
import Questionnaires from './Questionnaires.vue';

const router = useRouter();
const route = useRoute();

const questions = ref([
  {
    titre: '',
    reponses: [
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false }
    ]
  }
]);

const currentQuestionIndex = ref(0);
const currentQuestion = ref(questions.value[currentQuestionIndex.value]);

const errorMessage = ref(null);
const successMessage = ref(null);
const latestQuestionnaireId = ref(null);

const addResponse = () => {
  if (currentQuestion.value.reponses.length < 6) {
    currentQuestion.value.reponses.push({ titre: '', bonne_reponse: false });
  }
};

const deleteResponse = (index) => {
  if (currentQuestion.value.reponses.length > 2) {
    currentQuestion.value.reponses.splice(index, 1);
  } else {
    errorMessage.value = 'Chaque question doit avoir au moins 2 réponses.';
  }
};

const navigateQuestion = (direction) => {
  if (direction === 'prev' && currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  } else if (direction === 'next' && currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++;
  }
  currentQuestion.value = questions.value[currentQuestionIndex.value];
};

const addQuestion = () => {
  questions.value.push({
    titre: '',
    reponses: [
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false }
    ]
  });
  currentQuestionIndex.value = questions.value.length - 1;
  currentQuestion.value = questions.value[currentQuestionIndex.value];
};

const deleteCurrentQuestion = () => {
  if (questions.value.length > 1) {
    questions.value.splice(currentQuestionIndex.value, 1);

    if (currentQuestionIndex.value >= questions.value.length) {
      currentQuestionIndex.value = questions.value.length - 1;
    }

    currentQuestion.value = questions.value[currentQuestionIndex.value];
  } else {
    errorMessage.value = 'Vous devez conserver au moins une question.';
  }
};

const validateAllQuestions = async () => {
  for (const question of questions.value) {
    if (!question.titre || question.reponses.some((r) => !r.titre)) {
      errorMessage.value = 'Toutes les questions doivent être correctement remplies.';
      return;
    }

    const bonneReponseCount = question.reponses.filter((r) => r.bonne_reponse).length;
    if (bonneReponseCount !== 1) {
      errorMessage.value = 'Chaque question doit avoir une seule bonne réponse.';
      return;
    }
  }

  try {
    for (const question of questions.value) {
      const { data: questionData, error: questionError } = await supabase
        .from('question')
        .insert([{ titre: question.titre, points: 10 }])
        .select();

      if (questionError) throw new Error(questionError.message);

      const questionId = questionData[0].id_question;

      const responses = question.reponses.map((r) => ({
        id_question: questionId,
        titre: r.titre,
        etre_bonne_reponse: r.bonne_reponse
      }));

      const { error: responseError } = await supabase.from('reponse').insert(responses);
      if (responseError) throw new Error(responseError.message);

      const { error: containError } = await supabase.from('contenir').insert([
        { id_question: questionId, id_questionnaire: latestQuestionnaireId.value }
      ]);
      if (containError) throw new Error(containError.message);
    }

    successMessage.value = 'Toutes les questions ont été validées avec succès !';

    replaceComponent();
  } catch (error) {
    errorMessage.value = `Erreur: ${error.message}`;
  }
};

const replaceComponent = () => {
  const app = document.querySelector('.creation-qu-container');
  app.innerHTML = '';
  const instance = app.__vue_app__;
  instance._component = Questionnaires;
  instance.mount(app);
};

const goToQuestionnaireCreation = () => {
  router.push('/administrateur/questionnaires');
};

const fetchLatestQuestionnaireId = async () => {
  const { data, error } = await supabase
    .from('questionnaire')
    .select('id_questionnaire')
    .order('id_questionnaire', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Erreur lors de la récupération du dernier questionnaire :', error);
  } else {
    latestQuestionnaireId.value = data.id_questionnaire;
  }
};

onMounted(() => {
  fetchLatestQuestionnaireId();
});
</script>

<style scoped>
.creation-qu-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: auto;
}

h2 {
  text-align: center;
  color: #5f4b8b;
}

.question-counter {
  text-align: right;
  font-size: 1rem;
  color: #777;
}

form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

label {
  font-size: 1rem;
  color: #333;
}

input {
  padding: 8px;
  margin-top: 5px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.option-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

button {
  background-color: #6e8efb;
  border: none;
  padding: 10px 15px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #5a75d6;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button[type="button"] {
  background-color: #e74c3c;
}

button[type="button"]:hover {
  background-color: #c0392b;
}

.add-response-btn {
  background-color: #a983db;
}

.add-response-btn:hover {
  background-color: #8e6bb8;
}

.delete-btn {
  background-color: #e74c3c;
}

.delete-btn:hover {
  background-color: #c0392b;
}

.nav-btn {
  background-color: #6e8efb;
}

.nav-btn:hover {
  background-color: #5a75d6;
}

.validate-all-button {
  background-color: #28a745;
  margin-top: 20px;
}

.validate-all-button:hover {
  background-color: #218838;
}

.error-message {
  color: red;
  font-size: 0.9rem;
  margin-top: 10px;
}

.success-message {
  color: green;
  font-size: 0.9rem;
  margin-top: 10px;
}
</style>