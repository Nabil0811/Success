<template>
  <div>
    <header>
      <h1>Gestion des Questionnaires</h1>
    </header>

    <section>
      <div class="button-group centered">
        <button @click="showCreationForm">Créer un Questionnaire</button>
        <button v-if="selectedQuestionnaires.length >= 2" @click="confirmDeleteSelectedQuestionnaires">Supprimer sélectionnés</button>
      </div>

      <div v-if="showEditForm">
        <div class="edit-form">
          <h3>Modifier le questionnaire</h3>
          <div class="form-group">
            <label>Nom:</label>
            <input v-model="questionnaire.nom" type="text" />
          </div>
          <div class="form-group">
            <label>Temps de passage (minutes):</label>
            <input v-model="questionnaire.temps_de_passage" type="number" min="1" />
          </div>
          <div class="form-group">
            <label>Code d'accès:</label>
            <input v-model="questionnaire.code" type="text" />
          </div>
          <div class="edit-actions">
            <button @click="updateQuestionnaire" class="save-btn">Enregistrer</button>
            <button @click="editQuestions" class="edit-btn">Modifier les Questions</button>
            <button @click="hideEditForm" class="cancel-btn">Annuler</button>
          </div>
        </div>
      </div>

      <div v-if="!showEditForm">
        <div class="search-container">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Rechercher par nom..."
            @input="filterQuestionnaires"
          />
        </div>
      </div>

      <!-- Tableau avec scroll -->
      <div v-if="!showEditForm" class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
              </th>
              <th>Nom</th>
              <th>Date de création</th>
              <th>Temps</th>
              <th>Code</th>
              <th>Questions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(questionnaire, index) in filteredQuestionnaires" :key="questionnaire.id_questionnaire">
              <td>
                <input 
                  type="checkbox" 
                  :checked="selectedQuestionnaires.includes(questionnaire.id_questionnaire)"
                  @change="toggleQuestionnaireSelection(questionnaire.id_questionnaire)"
                />
              </td>
              <td>{{ questionnaire.nom }}</td>
              <td>{{ formatDate(questionnaire.date_creation) }}</td>
              <td>{{ questionnaire.temps_de_passage }} minutes</td>
              <td>{{ questionnaire.code }}</td>
              <td>{{ questionnaire.questionCount || 0 }}</td>
              <td class="actions-cell">
                <button @click="editQuestionnaire(questionnaire.id_questionnaire)" class="edit-btn">Modifier</button>
                <button @click="confirmDeleteQuestionnaire(questionnaire)" class="delete-btn">Supprimer</button>
              </td>
            </tr>
            <tr v-if="filteredQuestionnaires.length === 0" class="no-data-row">
              <td colspan="7">Aucun questionnaire trouvé</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Confirmation de suppression -->
    <div v-if="showConfirmModal" class="modal">
      <div class="modal-content">
        <h3>Êtes-vous sûr de vouloir supprimer ces questionnaires :</h3>
        <ul>
          <li v-for="questionnaire in questionnairesToDelete" :key="questionnaire.id_questionnaire">{{ questionnaire.nom }}</li>
        </ul>
        <div class="modal-actions">
          <button @click="deleteQuestionnaires" class="confirm-btn">Supprimer</button>
          <button @click="closeConfirmModal" class="cancel-btn">Annuler</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>

    <!-- Error and Success Messages -->
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <!-- Affichage des enfants -->
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase';

const router = useRouter();
const questionnaires = ref([]);
const filteredQuestionnaires = ref([]);
const showEditForm = ref(false);
const selectAll = ref(false);
const selectedQuestionnaires = ref([]);
const searchQuery = ref('');
const questionnaire = ref({});
const showConfirmModal = ref(false);
const questionnairesToDelete = ref([]);
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Charger le nombre de questions pour chaque questionnaire
const loadQuestionCounts = async () => {
  try {
    // Récupérer tous les enregistrements de la table contenir
    const { data: contenir, error } = await supabase
      .from('contenir')
      .select('id_questionnaire, id_question');
      
    if (error) throw error;
    
    // Compter les questions par questionnaire
    const questionCountMap = {};
    contenir.forEach(item => {
      if (!questionCountMap[item.id_questionnaire]) {
        questionCountMap[item.id_questionnaire] = 0;
      }
      questionCountMap[item.id_questionnaire]++;
    });
    
    // Ajouter le comptage à chaque questionnaire
    questionnaires.value = questionnaires.value.map(q => ({
      ...q,
      questionCount: questionCountMap[q.id_questionnaire] || 0
    }));
    
    filteredQuestionnaires.value = [...questionnaires.value];
  } catch (error) {
    console.error("Erreur lors du comptage des questions:", error);
  }
};

const fetchQuestionnaires = async () => {
  try {
    loading.value = true;
    
    const { data, error } = await supabase
      .from('questionnaire')
      .select('*')
      .order('date_creation', { ascending: false });
      
    if (error) {
      console.error('Erreur lors de la récupération des questionnaires:', error);
      errorMessage.value = "Erreur lors du chargement des questionnaires";
    } else {
      questionnaires.value = data;
      filteredQuestionnaires.value = data;
      
      // Charger le nombre de questions pour chaque questionnaire
      await loadQuestionCounts();
    }
  } catch (error) {
    console.error("Erreur inattendue:", error);
    errorMessage.value = "Une erreur s'est produite";
  } finally {
    loading.value = false;
  }
};

const showCreationForm = () => {
  // Rediriger vers la page de création de questionnaire
  router.push('/administrateur/questionnaires/creation');
};

const hideEditForm = () => {
  showEditForm.value = false;
  questionnaire.value = {};
};

const editQuestionnaire = async (questionnaireId) => {
  try {
    loading.value = true;
    
    const { data, error } = await supabase
      .from('questionnaire')
      .select('*')
      .eq('id_questionnaire', questionnaireId)
      .single();

    if (error) {
      console.error('Erreur lors de la récupération du questionnaire:', error);
      errorMessage.value = "Erreur lors de la récupération du questionnaire";
      return;
    }

    questionnaire.value = data;
    showEditForm.value = true;
  } catch (error) {
    console.error("Erreur inattendue:", error);
    errorMessage.value = "Une erreur s'est produite";
  } finally {
    loading.value = false;
  }
};

const updateQuestionnaire = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    
    // Vérification des champs
    if (!questionnaire.value.nom || !questionnaire.value.temps_de_passage) {
      errorMessage.value = "Veuillez remplir tous les champs obligatoires";
      loading.value = false;
      return;
    }
    
    const { error } = await supabase
      .from('questionnaire')
      .update({
        nom: questionnaire.value.nom,
        temps_de_passage: questionnaire.value.temps_de_passage,
        code: questionnaire.value.code,
      })
      .eq('id_questionnaire', questionnaire.value.id_questionnaire);

    if (error) {
      console.error('Erreur lors de la mise à jour du questionnaire:', error);
      errorMessage.value = "Erreur lors de la mise à jour du questionnaire";
    } else {
      successMessage.value = "Questionnaire mis à jour avec succès";
      showEditForm.value = false;
      await fetchQuestionnaires();
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        successMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error("Erreur inattendue:", error);
    errorMessage.value = "Une erreur s'est produite";
  } finally {
    loading.value = false;
  }
};

const editQuestions = () => {
  if (!questionnaire.value.id_questionnaire) {
    errorMessage.value = "ID du questionnaire manquant";
    return;
  }
  
  // Naviguer vers la page d'édition des questions avec l'ID du questionnaire
  router.push(`/administrateur/questionnaires/edit/${questionnaire.value.id_questionnaire}`);
};

const confirmDeleteQuestionnaire = (questionnaire) => {
  questionnairesToDelete.value = [questionnaire];
  showConfirmModal.value = true;
};

const confirmDeleteSelectedQuestionnaires = () => {
  if (selectedQuestionnaires.value.length === 0) {
    errorMessage.value = "Aucun questionnaire sélectionné";
    return;
  }
  
  questionnairesToDelete.value = questionnaires.value.filter(q => 
    selectedQuestionnaires.value.includes(q.id_questionnaire)
  );
  showConfirmModal.value = true;
};

const deleteQuestionnaires = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    
    const questionnaireIds = questionnairesToDelete.value.map(q => q.id_questionnaire);
    
    // 1. Récupérer d'abord les questions liées à ces questionnaires
    const { data: contenir, error: contenirError } = await supabase
      .from('contenir')
      .select('id_question')
      .in('id_questionnaire', questionnaireIds);
      
    if (contenirError) {
      throw new Error(`Erreur lors de la récupération des questions: ${contenirError.message}`);
    }
    
    if (contenir && contenir.length > 0) {
      const questionIds = [...new Set(contenir.map(item => item.id_question))];
      
      // 2. Supprimer les réponses liées à ces questions
      const { error: reponsesError } = await supabase
        .from('reponse')
        .delete()
        .in('id_question', questionIds);
        
      if (reponsesError) {
        console.error('Erreur lors de la suppression des réponses:', reponsesError);
      }
      
      // 3. Supprimer les liens question-questionnaire
      const { error: contenirDeleteError } = await supabase
        .from('contenir')
        .delete()
        .in('id_questionnaire', questionnaireIds);
        
      if (contenirDeleteError) {
        console.error('Erreur lors de la suppression des liens question-questionnaire:', contenirDeleteError);
      }
      
      // 4. Supprimer les questions
      const { error: questionsError } = await supabase
        .from('question')
        .delete()
        .in('id_question', questionIds);
        
      if (questionsError) {
        console.error('Erreur lors de la suppression des questions:', questionsError);
      }
    }
    
    // 5. Supprimer les enregistrements de la table 'passer'
    const { error: passerError } = await supabase
      .from('passer')
      .delete()
      .in('id_questionnaire', questionnaireIds);
      
    if (passerError) {
      console.error('Erreur lors de la suppression des enregistrements de passage:', passerError);
    }
    
    // 6. Enfin, supprimer les questionnaires
    const { error } = await supabase
      .from('questionnaire')
      .delete()
      .in('id_questionnaire', questionnaireIds);

    if (error) {
      throw new Error(`Erreur lors de la suppression des questionnaires: ${error.message}`);
    }
    
    successMessage.value = "Questionnaire(s) supprimé(s) avec succès";
    closeConfirmModal();
    selectedQuestionnaires.value = [];
    selectAll.value = false;
    await fetchQuestionnaires();
    
    // Effacer le message de succès après 3 secondes
    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    errorMessage.value = error.message || "Une erreur s'est produite lors de la suppression";
  } finally {
    loading.value = false;
  }
};

const closeConfirmModal = () => {
  showConfirmModal.value = false;
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedQuestionnaires.value = questionnaires.value.map((q) => q.id_questionnaire);
  } else {
    selectedQuestionnaires.value = [];
  }
};

const toggleQuestionnaireSelection = (id) => {
  if (selectedQuestionnaires.value.includes(id)) {
    selectedQuestionnaires.value = selectedQuestionnaires.value.filter((qid) => qid !== id);
  } else {
    selectedQuestionnaires.value.push(id);
  }
  selectAll.value = questionnaires.value.length === selectedQuestionnaires.value.length;
};

const filterQuestionnaires = () => {
  if (!searchQuery.value.trim()) {
    filteredQuestionnaires.value = questionnaires.value;
    return;
  }
  
  const query = searchQuery.value.toLowerCase();
  filteredQuestionnaires.value = questionnaires.value.filter((questionnaire) => 
    questionnaire.nom.toLowerCase().includes(query)
  );
};

const formatDate = (dateString) => {
  if (!dateString) return 'Date inconnue';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Erreur lors du formatage de la date:", error);
    return dateString;
  }
};

onMounted(() => {
  fetchQuestionnaires();
});
</script>

<style scoped>
header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 20px;
  text-align: center;
  border-radius: 7px;
  margin-bottom: 20px;
}

h1 {
  margin: 0;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.button-group.centered {
  justify-content: center;
}

button {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
}

.edit-btn {
  background-color: #28a745;
  color: white;
  margin-right: 5px;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
}

.save-btn {
  background-color: #007bff;
  color: white;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
}

.confirm-btn {
  background-color: #dc3545;
  color: white;
}

.search-container {
  margin-bottom: 20px;
}

input[type="text"], 
input[type="number"] {
  padding: 10px;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

input[type="checkbox"] {
  cursor: pointer;
}

.table-container {
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 5px;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background-color: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: bold;
}

tr:hover {
  background-color: #f9f9f9;
}

.actions-cell {
  white-space: nowrap;
}

.no-data-row td {
  text-align: center;
  padding: 20px;
  color: #777;
  font-style: italic;
}

.modal {
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

.modal-content ul {
  list-style-type: disc;
  padding-left: 20px;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.edit-form {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.edit-form h3 {
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.edit-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #6e8efb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message, .success-message {
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
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
</style>