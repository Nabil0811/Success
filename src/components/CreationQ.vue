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
        <button type="button" @click="deleteResponse(index)">Supprimer</button>
      </div>

      <button type="button" @click="addResponse">Ajouter une réponse</button>

      <div class="modal-actions">
        <button type="button" @click="goToQuestionnaireCreation">Retour</button>
      </div>
    </form>

    <div class="navigation-buttons">
      <button @click="navigateQuestion('prev')" :disabled="currentQuestionIndex === 0">← Précédente</button>
      <button @click="navigateQuestion('next')" :disabled="currentQuestionIndex === questions.length - 1">Suivante →</button>
      <button @click="addQuestion">Ajouter une question</button>
      <button type="button" @click="deleteCurrentQuestion" :disabled="questions.length === 1">Supprimer cette question</button>
    </div>

    <button class="validate-all-button" @click="validateAllQuestions">Valider les questions</button>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
  </div>

  <div class="modal" v-if="!questionnaireCreated">
    <div class="modal-content">
      <h2>Créer un nouveau questionnaire</h2>

      <!-- Formulaire de création du questionnaire -->
      <div v-if="!questionnaireCreated">
        <form @submit.prevent="createQuestionnaire">
          <label>Nom du QCM:
            <input v-model="qcm.nom" type="text" required />
          </label>
          
          <label>Temps (minutes):
            <input v-model="qcm.temps" type="number" min="1" required />
          </label>
          
          <label>Mot de passe:
            <input v-model="qcm.mot_de_passe" type="password" />
          </label>
          
          <div class="modal-actions">
            <button type="submit">Créer</button>
            <button type="button" @click="cancel">Annuler</button>
          </div>
        </form>
      </div>

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
    </div>

    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
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
const questionnaireCreated = ref(false); // Variable pour vérifier si le questionnaire est créé

const qcm = ref({
  nom: '',
  temps: '',
  mot_de_passe: ''
});

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

const fetchLatestQuestionnaireId = async () => {
  const { data, error } = await supabase
    .from('questionnaire')
    .select('id_questionnaire')
    .order('id_questionnaire', { ascending: false })
    .limit(1)
    .single();

  if (error) {
  } else {
    latestQuestionnaireId.value = data.id_questionnaire;
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

onMounted(() => {
  fetchLatestQuestionnaireId();
  document.body.classList.add('no-scroll');
});

onUnmounted(() => {
  document.body.classList.remove('no-scroll');
});

const createQuestionnaire = async () => {
  errorMessage.value = null;
  successMessage.value = null;

  // Vérifie que tous les champs sont remplis avant d'ajouter
  if (qcm.value.nom && qcm.value.temps) {
    try {
      const { data, error } = await supabase.from('questionnaire').insert([{
        nom: qcm.value.nom,
        date_creation: new Date().toISOString().split('T')[0],  // Date du jour au format YYYY-MM-DD
        code: qcm.value.mot_de_passe,
        temps_de_passage: qcm.value.temps
      }]);

      if (error) {
      } else {
        successMessage.value = 'Questionnaire créé avec succès!';
        qcm.value = { nom: '', temps: '', mot_de_passe: '' };
        questionnaireCreated.value = true; // Le questionnaire a été créé, afficher les options suivantes
        emit('refresh');
        emit('showCreationQ', false); // Masque le modal et retourne à l'écran initial
        router.push({ name: 'CreationQu', params: { id_questionnaire: data[0].id_questionnaire } }); // Redirige vers la page de création des questions
      }
    } catch (error) {
    }
  } else {
    errorMessage.value = 'Veuillez remplir tous les champs.';
  }
};

const cancel = () => {
  router.push('/administrateur/questionnaires');
};
</script>

<style scoped>
.creation-qu-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  position: relative;
  z-index: 2000; /* Ensure it is above other components */
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
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border: none;
  padding: 10px 15px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background: #b48ac6;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button[type="button"] {
  background: #e74c3c;
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

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000; /* Ensure it is above other components */
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
}

/* Disable scrolling */
.no-scroll {
  overflow: hidden;
}
</style>