<template>
  <div class="creation-q-container">
    <div class="modal" v-show="!questionnaireCreated">
      <div class="modal-content">
        <h2>Créer un nouveau questionnaire</h2>
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
        
        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
      </div>
    </div>

    <!-- Pop-up de création de questions après création du questionnaire -->
    <div v-if="questionnaireCreated" class="question-creation-container">
      <h2>Ajoutez des questions au questionnaire "{{ qcm.nom }}"</h2>
      
      <div class="question-counter">
        <span>Question {{ currentQuestionIndex + 1 }}/{{ questions.length }}</span>
      </div>

      <form @submit.prevent="saveCurrentQuestion">
        <label>Titre de la question :
          <input v-model="currentQuestion.titre" type="text" required />
        </label>
        
        <label>Points :
          <input v-model="currentQuestion.points" type="number" min="1" max="20" required />
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
        <button type="submit" class="save-question-btn">Enregistrer la question</button>
      </form>

      <div class="navigation-buttons">
        <button class="nav-btn" @click="navigateQuestion('prev')" :disabled="currentQuestionIndex === 0">← Précédente</button>
        <button class="nav-btn" @click="navigateQuestion('next')" :disabled="currentQuestionIndex === questions.length - 1">Suivante →</button>
        <button class="nav-btn" @click="addQuestion">Ajouter une question</button>
        <button type="button" class="delete-btn" @click="deleteCurrentQuestion" :disabled="questions.length === 1">Supprimer cette question</button>
      </div>

      <button class="validate-all-button" @click="validateAllQuestions">Terminer et sauvegarder toutes les questions</button>

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase';
import { useRouter } from 'vue-router';

const router = useRouter();

const errorMessage = ref(null);
const successMessage = ref(null);
const questionnaireCreated = ref(false);
const questionnaireId = ref(null);

// Informations du questionnaire
const qcm = ref({
  nom: '',
  temps: 30,
  mot_de_passe: ''
});

// Gestion des questions
const questions = ref([
  {
    titre: '',
    points: 10,
    reponses: [
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false }
    ]
  }
]);

const currentQuestionIndex = ref(0);
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value]);

// Création du questionnaire
const createQuestionnaire = async () => {
  errorMessage.value = null;
  successMessage.value = null;

  try {
    // Vérifier que tous les champs sont remplis
    if (!qcm.value.nom || !qcm.value.temps) {
      errorMessage.value = 'Veuillez remplir tous les champs requis.';
      return;
    }

    // Insérer le questionnaire dans la base de données
    const { data, error } = await supabase.from('questionnaire').insert([{
      nom: qcm.value.nom,
      date_creation: new Date().toISOString().split('T')[0],
      code: qcm.value.mot_de_passe,
      temps_de_passage: qcm.value.temps
    }]).select();

    if (error) {
      throw new Error(error.message);
    }

    // Stocker l'ID du questionnaire créé
    questionnaireId.value = data[0].id_questionnaire;
    
    // Afficher un message de succès
    successMessage.value = 'Questionnaire créé avec succès! Ajoutez maintenant des questions.';
    
    // Passer à l'étape de création des questions
    questionnaireCreated.value = true;
  } catch (error) {
    errorMessage.value = `Erreur lors de la création du questionnaire: ${error.message}`;
  }
};

// Gestion des réponses
const addResponse = () => {
  if (currentQuestion.value.reponses.length < 6) {
    currentQuestion.value.reponses.push({ titre: '', bonne_reponse: false });
  } else {
    errorMessage.value = 'Vous ne pouvez pas ajouter plus de 6 réponses par question.';
  }
};

const deleteResponse = (index) => {
  if (currentQuestion.value.reponses.length > 2) {
    currentQuestion.value.reponses.splice(index, 1);
  } else {
    errorMessage.value = 'Chaque question doit avoir au moins 2 réponses.';
  }
};

// Navigation entre les questions
const navigateQuestion = (direction) => {
  if (direction === 'prev' && currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  } else if (direction === 'next' && currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++;
  }
};

// Ajout d'une nouvelle question
const addQuestion = () => {
  questions.value.push({
    titre: '',
    points: 10,
    reponses: [
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false },
      { titre: '', bonne_reponse: false }
    ]
  });
  currentQuestionIndex.value = questions.value.length - 1;
};

// Supprimer la question actuelle
const deleteCurrentQuestion = () => {
  if (questions.value.length > 1) {
    questions.value.splice(currentQuestionIndex.value, 1);

    if (currentQuestionIndex.value >= questions.value.length) {
      currentQuestionIndex.value = questions.value.length - 1;
    }
  } else {
    errorMessage.value = 'Vous devez conserver au moins une question.';
  }
};

// Sauvegarder la question courante
const saveCurrentQuestion = async () => {
  errorMessage.value = null;
  successMessage.value = null;

  // Vérifier que la question est complète
  if (!currentQuestion.value.titre) {
    errorMessage.value = 'Veuillez donner un titre à la question.';
    return;
  }

  // Vérifier que chaque réponse a un titre
  for (const reponse of currentQuestion.value.reponses) {
    if (!reponse.titre) {
      errorMessage.value = 'Toutes les réponses doivent avoir un titre.';
      return;
    }
  }

  // Vérifier qu'il y a exactement une bonne réponse
  const bonneReponseCount = currentQuestion.value.reponses.filter(r => r.bonne_reponse).length;
  if (bonneReponseCount !== 1) {
    errorMessage.value = 'Chaque question doit avoir une seule bonne réponse.';
    return;
  }

  successMessage.value = 'Question sauvegardée!';
};

// Valider et sauvegarder toutes les questions
const validateAllQuestions = async () => {
  errorMessage.value = null;
  successMessage.value = null;

  try {
    // Vérifier que toutes les questions sont complètes
    for (const question of questions.value) {
      if (!question.titre) {
        errorMessage.value = 'Toutes les questions doivent avoir un titre.';
        return;
      }

      // Vérifier que chaque réponse a un titre
      for (const reponse of question.reponses) {
        if (!reponse.titre) {
          errorMessage.value = 'Toutes les réponses doivent avoir un titre.';
          return;
        }
      }

      // Vérifier qu'il y a exactement une bonne réponse par question
      const bonneReponseCount = question.reponses.filter(r => r.bonne_reponse).length;
      if (bonneReponseCount !== 1) {
        errorMessage.value = 'Chaque question doit avoir une seule bonne réponse.';
        return;
      }
    }

    // Sauvegarder les questions dans la base de données
    for (const question of questions.value) {
      // Insérer la question
      const { data: questionData, error: questionError } = await supabase
        .from('question')
        .insert([{ 
          titre: question.titre, 
          points: question.points 
        }])
        .select();

      if (questionError) throw new Error(questionError.message);

      const questionId = questionData[0].id_question;

      // Lier la question au questionnaire
      const { error: containError } = await supabase
        .from('contenir')
        .insert([{
          id_question: questionId,
          id_questionnaire: questionnaireId.value
        }]);

      if (containError) throw new Error(containError.message);

      // Insérer les réponses
      const responses = question.reponses.map((r) => ({
        id_question: questionId,
        titre: r.titre,
        etre_bonne_reponse: r.bonne_reponse
      }));

      const { error: responseError } = await supabase
        .from('reponse')
        .insert(responses);

      if (responseError) throw new Error(responseError.message);
    }

    successMessage.value = 'Toutes les questions ont été sauvegardées avec succès!';
    
    // Rediriger vers la liste des questionnaires après quelques secondes
    setTimeout(() => {
      router.push('/administrateur/questionnaires');
    }, 2000);
  } catch (error) {
    errorMessage.value = `Erreur: ${error.message}`;
  }
};

const cancel = () => {
  router.push('/administrateur/questionnaires');
};

onMounted(() => {
  // Initialiser l'interface de création
});
</script>

<style scoped>
.creation-q-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

h2 {
  margin-top: 0;
  color: #5f4b8b;
  text-align: center;
  margin-bottom: 20px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input[type="text"],
input[type="number"],
input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.option-container {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 10px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: opacity 0.3s;
}

button:hover {
  opacity: 0.9;
}

.delete-btn {
  background: #e74c3c;
}

.add-response-btn, .save-question-btn {
  margin-top: 10px;
}

.add-response-btn {
  background: #28a745;
}

.navigation-buttons {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: 20px;
  gap: 10px;
}

.validate-all-button {
  display: block;
  width: 100%;
  margin-top: 30px;
  padding: 12px;
  background: #28a745;
  font-weight: bold;
}

.question-counter {
  text-align: right;
  color: #666;
  margin-bottom: 10px;
}

.error-message, .success-message {
  padding: 10px;
  border-radius: 4px;
  margin-top: 15px;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
}

.question-creation-container {
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
</style>