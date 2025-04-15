<template>
  <div class="edit-questions-container">
    <header>
      <h1>Modification des Questions</h1>
      <button @click="goBack" class="back-btn">Retour</button>
    </header>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Chargement des questions...</p>
    </div>

    <div v-else-if="questions.length === 0" class="no-questions">
      <p>Aucune question n'a été trouvée pour ce questionnaire.</p>
      <button @click="addNewQuestion" class="add-question-btn">Ajouter une question</button>
    </div>

    <div v-else class="questions-editor">
      <div class="question-counter">
        <span>Question {{ currentQuestionIndex + 1 }}/{{ questions.length }}</span>
      </div>

      <form @submit.prevent="saveCurrentQuestion" class="question-form">
        <div class="form-group">
          <label for="questionTitle">Titre de la question :</label>
          <input 
            id="questionTitle"
            v-model="currentQuestion.titre" 
            type="text" 
            required 
            placeholder="Saisissez la question ici"
          />
        </div>

        <div class="form-group">
          <label for="questionPoints">Points :</label>
          <input 
            id="questionPoints"
            v-model.number="currentQuestion.points" 
            type="number" 
            min="1" 
            max="20" 
            required 
          />
        </div>

        <div class="answers-container">
          <h3>Réponses</h3>
          <div 
            v-for="(reponse, index) in currentQuestion.reponses" 
            :key="index" 
            class="answer-item"
          >
            <div class="answer-content">
              <input 
                v-model="reponse.titre" 
                type="text" 
                :placeholder="'Option ' + (index + 1)" 
                required 
              />
              <div class="answer-controls">
                <label class="correct-answer-label">
                  <input 
                    type="radio" 
                    :name="'correctAnswer'" 
                    :checked="reponse.etre_bonne_reponse" 
                    @change="setCorrectAnswer(index)" 
                  />
                  Bonne réponse
                </label>
                <button 
                  type="button" 
                  @click="deleteResponse(index)" 
                  class="delete-btn" 
                  :disabled="currentQuestion.reponses.length <= 2"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
          
          <button 
            type="button" 
            @click="addResponse" 
            class="add-response-btn" 
            :disabled="currentQuestion.reponses.length >= 6"
          >
            Ajouter une réponse
          </button>
        </div>

        <div class="form-actions">
          <button type="submit" class="save-btn">Enregistrer cette question</button>
        </div>
      </form>

      <div class="navigation-buttons">
        <button 
          @click="navigateQuestion('prev')" 
          :disabled="currentQuestionIndex === 0" 
          class="nav-btn"
        >
          ← Question précédente
        </button>
        <button 
          @click="navigateQuestion('next')" 
          :disabled="currentQuestionIndex === questions.length - 1" 
          class="nav-btn"
        >
          Question suivante →
        </button>
      </div>

      <div class="question-management">
        <button @click="addNewQuestion" class="add-question-btn">Ajouter une question</button>
        <button 
          @click="confirmDeleteQuestion" 
          class="delete-question-btn" 
          :disabled="questions.length <= 1"
        >
          Supprimer cette question
        </button>
      </div>

      <div class="save-all-container">
        <button @click="saveAllQuestions" class="save-all-btn">Enregistrer toutes les questions</button>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteConfirmation" class="modal-overlay">
      <div class="modal-content">
        <h3>Confirmation de suppression</h3>
        <p>Êtes-vous sûr de vouloir supprimer cette question ?</p>
        <div class="modal-actions">
          <button @click="deleteCurrentQuestion" class="confirm-btn">Supprimer</button>
          <button @click="showDeleteConfirmation = false" class="cancel-btn">Annuler</button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { supabase } from '../supabase';

const router = useRouter();
const route = useRoute();
const questionnaireId = ref(null);
const questions = ref([]);
const currentQuestionIndex = ref(0);
const loading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
const showDeleteConfirmation = ref(false);

// Référence calculée vers la question courante
const currentQuestion = computed(() => {
  if (questions.value.length === 0) return createEmptyQuestion();
  return questions.value[currentQuestionIndex.value];
});

// Création d'une question vide
const createEmptyQuestion = () => {
  return {
    titre: '',
    points: 10,
    reponses: [
      { titre: '', etre_bonne_reponse: false },
      { titre: '', etre_bonne_reponse: false }
    ]
  };
};

// Récupérer les données du questionnaire et des questions
const fetchData = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    
    // Récupérer l'ID du questionnaire depuis l'URL
    questionnaireId.value = route.params.questionnaireId;
    console.log("ID du questionnaire:", questionnaireId.value);
    
    if (!questionnaireId.value) {
      errorMessage.value = "ID du questionnaire manquant";
      loading.value = false;
      return;
    }
    
    // Vérifier que le questionnaire existe
    const { data: questionnaire, error: questionnaireError } = await supabase
      .from('questionnaire')
      .select('*')
      .eq('id_questionnaire', questionnaireId.value)
      .single();
      
    if (questionnaireError) {
      console.error("Erreur lors de la récupération du questionnaire:", questionnaireError);
      errorMessage.value = "Impossible de trouver ce questionnaire";
      loading.value = false;
      return;
    }
    
    console.log("Questionnaire trouvé:", questionnaire);
    
    // Récupérer les questions liées à ce questionnaire via la table 'contenir'
    const { data: contenir, error: contenirError } = await supabase
      .from('contenir')
      .select('id_question')
      .eq('id_questionnaire', questionnaireId.value);
      
    if (contenirError) {
      console.error("Erreur lors de la récupération des liens questions-questionnaire:", contenirError);
      errorMessage.value = "Erreur lors de la récupération des questions";
      loading.value = false;
      return;
    }
    
    if (!contenir || contenir.length === 0) {
      console.log("Aucune question trouvée pour ce questionnaire");
      questions.value = [];
      loading.value = false;
      return;
    }
    
    const questionIds = contenir.map(item => item.id_question);
    console.log("IDs des questions:", questionIds);
    
    // Récupérer les données des questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('question')
      .select('*')
      .in('id_question', questionIds);
      
    if (questionsError) {
      console.error("Erreur lors de la récupération des questions:", questionsError);
      errorMessage.value = "Erreur lors de la récupération des détails des questions";
      loading.value = false;
      return;
    }
    
    // Pour chaque question, récupérer les réponses associées
    const questionsWithResponses = [];
    
    for (const question of questionsData) {
      const { data: reponsesData, error: reponsesError } = await supabase
        .from('reponse')
        .select('*')
        .eq('id_question', question.id_question);
        
      if (reponsesError) {
        console.error(`Erreur lors de la récupération des réponses pour la question ${question.id_question}:`, reponsesError);
        continue;
      }
      
      questionsWithResponses.push({
        ...question,
        reponses: reponsesData || []
      });
    }
    
    questions.value = questionsWithResponses;
    console.log("Questions avec réponses chargées:", questions.value);
    
    loading.value = false;
  } catch (error) {
    console.error("Erreur inattendue lors du chargement des données:", error);
    errorMessage.value = "Une erreur inattendue s'est produite";
    loading.value = false;
  }
};

// Ajouter une réponse à la question courante
const addResponse = () => {
  if (currentQuestion.value.reponses.length < 6) {
    currentQuestion.value.reponses.push({ titre: '', etre_bonne_reponse: false });
  } else {
    errorMessage.value = "Une question ne peut pas avoir plus de 6 réponses";
  }
};

// Supprimer une réponse
const deleteResponse = (index) => {
  if (currentQuestion.value.reponses.length > 2) {
    // Si on supprime la bonne réponse, réinitialiser
    if (currentQuestion.value.reponses[index].etre_bonne_reponse) {
      // Marquer la première réponse restante comme correcte
      const newIndex = index === 0 ? 1 : 0;
      currentQuestion.value.reponses[newIndex].etre_bonne_reponse = true;
    }
    
    currentQuestion.value.reponses.splice(index, 1);
  } else {
    errorMessage.value = "Une question doit avoir au moins 2 réponses";
  }
};

// Définir la bonne réponse
const setCorrectAnswer = (index) => {
  // Réinitialiser toutes les réponses
  currentQuestion.value.reponses.forEach((reponse, i) => {
    reponse.etre_bonne_reponse = (i === index);
  });
};

// Navigation entre les questions
const navigateQuestion = (direction) => {
  // Sauvegarder les modifications locales avant de naviguer
  saveLocalChanges();
  
  if (direction === 'prev' && currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  } else if (direction === 'next' && currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++;
  }
};

// Ajouter une nouvelle question
const addNewQuestion = () => {
  // Créer une nouvelle question avec des valeurs par défaut
  const newQuestion = createEmptyQuestion();
  
  // Initialiser la première réponse comme correcte par défaut
  if (newQuestion.reponses.length > 0) {
    newQuestion.reponses[0].etre_bonne_reponse = true;
  }
  
  // Ajouter la question à la liste
  questions.value.push(newQuestion);
  
  // Naviguer vers la nouvelle question
  currentQuestionIndex.value = questions.value.length - 1;
  
  successMessage.value = "Nouvelle question ajoutée";
};

// Confirmer la suppression de la question courante
const confirmDeleteQuestion = () => {
  if (questions.value.length > 1) {
    showDeleteConfirmation.value = true;
  } else {
    errorMessage.value = "Vous ne pouvez pas supprimer la dernière question";
  }
};

// Supprimer la question courante
const deleteCurrentQuestion = () => {
  if (questions.value.length > 1) {
    // Supprimer la question courante
    questions.value.splice(currentQuestionIndex.value, 1);
    
    // Ajuster l'index si nécessaire
    if (currentQuestionIndex.value >= questions.value.length) {
      currentQuestionIndex.value = questions.value.length - 1;
    }
    
    showDeleteConfirmation.value = false;
    successMessage.value = "Question supprimée";
  } else {
    errorMessage.value = "Vous ne pouvez pas supprimer la dernière question";
    showDeleteConfirmation.value = false;
  }
};

// Sauvegarder les modifications locales
const saveLocalChanges = () => {
  // Cette fonction est appelée lors de la navigation entre questions
  // Elle n'effectue pas de sauvegarde en base de données mais conserve les modifications en mémoire
};

// Sauvegarder la question courante
const saveCurrentQuestion = async () => {
  try {
    errorMessage.value = '';
    successMessage.value = '';
    
    // Vérifier que le titre est renseigné
    if (!currentQuestion.value.titre) {
      errorMessage.value = "Le titre de la question est obligatoire";
      return;
    }
    
    // Vérifier que chaque réponse a un titre
    for (const reponse of currentQuestion.value.reponses) {
      if (!reponse.titre) {
        errorMessage.value = "Toutes les réponses doivent avoir un titre";
        return;
      }
    }
    
    // Vérifier qu'il y a exactement une bonne réponse
    const correctAnswers = currentQuestion.value.reponses.filter(r => r.etre_bonne_reponse);
    if (correctAnswers.length !== 1) {
      // S'il n'y a pas de bonne réponse, définir la première comme correcte
      if (correctAnswers.length === 0 && currentQuestion.value.reponses.length > 0) {
        currentQuestion.value.reponses[0].etre_bonne_reponse = true;
      } else if (correctAnswers.length > 1) {
        errorMessage.value = "Une question ne peut avoir qu'une seule bonne réponse";
        return;
      }
    }
    
    successMessage.value = "Question sauvegardée localement";
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la question:", error);
    errorMessage.value = "Une erreur s'est produite lors de la sauvegarde";
  }
};

// Sauvegarder toutes les questions
const saveAllQuestions = async () => {
  try {
    errorMessage.value = '';
    successMessage.value = '';
    loading.value = true;
    
    // Vérifier que toutes les questions sont correctement remplies
    for (const [index, question] of questions.value.entries()) {
      if (!question.titre) {
        errorMessage.value = `La question ${index + 1} n'a pas de titre`;
        loading.value = false;
        return;
      }
      
      for (const reponse of question.reponses) {
        if (!reponse.titre) {
          errorMessage.value = `Une réponse de la question ${index + 1} n'a pas de titre`;
          loading.value = false;
          return;
        }
      }
      
      const correctAnswers = question.reponses.filter(r => r.etre_bonne_reponse);
      if (correctAnswers.length !== 1) {
        errorMessage.value = `La question ${index + 1} doit avoir exactement une bonne réponse`;
        loading.value = false;
        return;
      }
    }
    
    // Supprimer d'abord les anciennes données
    // Récupérer les questions existantes
    const { data: contenir, error: contenirError } = await supabase
      .from('contenir')
      .select('id_question')
      .eq('id_questionnaire', questionnaireId.value);
      
    if (contenirError) throw contenirError;
    
    if (contenir && contenir.length > 0) {
      const existingQuestionIds = contenir.map(item => item.id_question);
      
      // Pour chaque question existante, supprimer les réponses associées
      for (const questionId of existingQuestionIds) {
        const { error: deleteReponsesError } = await supabase
          .from('reponse')
          .delete()
          .eq('id_question', questionId);
          
        if (deleteReponsesError) {
          console.error(`Erreur lors de la suppression des réponses pour la question ${questionId}:`, deleteReponsesError);
        }
      }
      
      // Supprimer les entrées dans contenir
      const { error: deleteContenirError } = await supabase
        .from('contenir')
        .delete()
        .eq('id_questionnaire', questionnaireId.value);
        
      if (deleteContenirError) throw deleteContenirError;
      
      // Supprimer les questions
      const { error: deleteQuestionsError } = await supabase
        .from('question')
        .delete()
        .in('id_question', existingQuestionIds);
        
      if (deleteQuestionsError) throw deleteQuestionsError;
    }
    
    // Insérer les nouvelles questions et réponses
    for (const question of questions.value) {
      // Créer ou mettre à jour la question
      const questionData = {
        titre: question.titre,
        points: question.points || 10
      };
      
      // Si la question a un ID, la mettre à jour, sinon la créer
      let questionId;
      
      if (question.id_question) {
        const { data, error } = await supabase
          .from('question')
          .upsert(
            { 
              id_question: question.id_question,
              ...questionData 
            })
          .select();
          
        if (error) throw error;
        questionId = data[0].id_question;
      } else {
        const { data, error } = await supabase
          .from('question')
          .insert(questionData)
          .select();
          
        if (error) throw error;
        questionId = data[0].id_question;
      }
      
      // Lier la question au questionnaire (table contenir)
      const { error: contenirError } = await supabase
        .from('contenir')
        .insert({
          id_question: questionId,
          id_questionnaire: questionnaireId.value
        });
        
      if (contenirError) throw contenirError;
      
      // Insérer les réponses
      const reponses = question.reponses.map(reponse => ({
        id_question: questionId,
        titre: reponse.titre,
        etre_bonne_reponse: reponse.etre_bonne_reponse
      }));
      
      const { error: reponsesError } = await supabase
        .from('reponse')
        .insert(reponses);
        
      if (reponsesError) throw reponsesError;
    }
    
    successMessage.value = "Toutes les questions ont été enregistrées avec succès";
    
    // Recharger les données pour avoir les IDs corrects
    await fetchData();
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des questions:", error);
    errorMessage.value = "Une erreur s'est produite lors de la sauvegarde";
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/administrateur/questionnaires');
};

// Au chargement du composant
onMounted(() => {
  fetchData();
});

// Observer les changements de route
watch(() => route.params.questionnaireId, (newId) => {
  if (newId && newId !== questionnaireId.value) {
    fetchData();
  }
});
</script>

<style scoped>
.edit-questions-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

h1 {
  color: #333;
  margin: 0;
}

.back-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.loading, .no-questions {
  text-align: center;
  padding: 50px 0;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #6e8efb;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.question-counter {
  text-align: right;
  color: #666;
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.question-form {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

input[type="text"],
input[type="number"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.answers-container {
  margin-top: 30px;
  margin-bottom: 20px;
}

.answers-container h3 {
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

.answer-item {
  margin-bottom: 15px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
}

.answer-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.correct-answer-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.add-response-btn, .delete-btn, .save-btn, .add-question-btn, .delete-question-btn, .save-all-btn, .nav-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.add-response-btn {
  background-color: #28a745;
  color: white;
  margin-top: 10px;
  width: 100%;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
}

.save-btn {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  font-size: 1rem;
}

.form-actions {
  margin-top: 20px;
  text-align: right;
}

.navigation-buttons {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.nav-btn {
  background-color: #6e8efb;
  color: white;
}

.question-management {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}

.add-question-btn {
  background-color: #28a745;
  color: white;
}

.delete-question-btn {
  background-color: #dc3545;
  color: white;
}

.save-all-container {
  text-align: center;
  margin-top: 30px;
}

.save-all-btn {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 12px 25px;
  font-size: 1.1rem;
  border-radius: 5px;
}

.error-message, .success-message {
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
  text-align: center;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

.modal-content h3 {
  margin-top: 0;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.confirm-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>