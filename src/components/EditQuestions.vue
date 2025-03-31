<template>
  <div class="creation-qu-container">
    <h2>Modification des Questions</h2>

    <div class="question-counter">
      <span>Question {{ currentQuestionIndex.value + 1 }}/{{ questions.value.length }}</span>
    </div>

    <form @submit.prevent="saveQuestions">
      <label>Titre de la question :
        <input v-model="currentQuestion.value.titre" type="text" required />
      </label>

      <div v-for="(reponse, index) in currentQuestion.value.reponses" :key="index" class="option-container">
        <label>
          Option {{ index + 1 }} :
          <input v-model="reponse.titre" type="text" :placeholder="'Option ' + (index + 1)" required />
        </label>
        <label>
          <input type="checkbox" v-model="reponse.bonne_reponse" :value="true" />
          Bonne réponse
        </label>
        <button type="button" @click="deleteResponse(index)">Supprimer</button>
      </div>

      <button type="button" @click="addResponse">Ajouter une réponse</button>

      <div class="modal-actions">
        <button type="submit">Enregistrer</button>
        <button type="button" @click="cancel">Annuler</button>
      </div>
    </form>

    <div class="navigation-buttons">
      <button @click="navigateQuestion('prev')" :disabled="currentQuestionIndex.value === 0">← Précédente</button>
      <button @click="navigateQuestion('next')" :disabled="currentQuestionIndex.value === questions.value.length - 1">Suivante →</button>
      <button @click="addQuestion">Ajouter une question</button>
      <button type="button" @click="deleteCurrentQuestion" :disabled="questions.value.length === 1">Supprimer cette question</button>
    </div>

    <div v-if="errorMessage.value" class="error-message">{{ errorMessage.value }}</div>
    <div v-if="successMessage.value" class="success-message">{{ successMessage.value }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { supabase } from '../supabase';

const router = useRouter();
const route = useRoute();
const questionnaireId = route.params.questionnaireId;

const questions = ref([]);
const currentQuestionIndex = ref(0);
const currentQuestion = ref({});
const errorMessage = ref(null);
const successMessage = ref(null);

const fetchQuestions = async () => {
  const { data, error } = await supabase
    .from('question')
    .select('*, reponse(*)')
    .eq('id_questionnaire', questionnaireId);

  if (error) {
    console.error('Erreur lors de la récupération des questions:', error);
  } else {
    questions.value = data.map(question => ({
      ...question,
      reponses: question.reponse
    }));
    currentQuestion.value = questions.value[currentQuestionIndex.value];
  }
};

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

const saveQuestions = async () => {
  try {
    for (const question of questions.value) {
      const { data: questionData, error: questionError } = await supabase
        .from('question')
        .upsert({ id_question: question.id_question, titre: question.titre, points: 10 })
        .select();

      if (questionError) throw new Error(questionError.message);

      const questionId = questionData[0].id_question;

      const responses = question.reponses.map((r) => ({
        id_question: questionId,
        titre: r.titre,
        etre_bonne_reponse: r.bonne_reponse
      }));

      const { error: responseError } = await supabase.from('reponse').upsert(responses);
      if (responseError) throw new Error(responseError.message);
    }

    successMessage.value = 'Toutes les questions ont été enregistrées avec succès !';
  } catch (error) {
    errorMessage.value = `Erreur: ${error.message}`;
  }
};

const cancel = () => {
  router.push({ name: 'Questionnaires' });
};

onMounted(() => {
  fetchQuestions();
});
</script>

<style scoped>
.creation-qu-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
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
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

button {
  background-color: #c59edb;
  border: none;
  padding: 10px 15px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #b48ac6;
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