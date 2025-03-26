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
        <div>
          <label>Nom:</label>
          <input v-model="questionnaire.nom" type="text" />
        </div>
        <div>
          <label>Temps de passage:</label>
          <input v-model="questionnaire.temps_de_passage" type="number" />
        </div>
        <div>
          <label>Code:</label>
          <input v-model="questionnaire.code" type="text" />
        </div>
        <button @click="updateQuestionnaire">Enregistrer</button>
        <button @click="editQuestions">Modifier les Questions</button>
        <button @click="hideEditForm">Annuler</button>
      </div>

      <div v-if="!showEditForm">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher par nom..."
          @input="filterQuestionnaires"
        />
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
              <th>Options</th>
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
              <td>{{ questionnaire.date_creation }}</td>
              <td>{{ questionnaire.temps_de_passage }} minutes</td>
              <td>{{ questionnaire.code }}</td>
              <td>
                <button @click="editQuestionnaire(questionnaire.id_questionnaire)">Modifier</button>
                <button @click="confirmDeleteQuestionnaire(questionnaire)">Supprimer</button>
              </td>
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
        <button @click="deleteQuestionnaires">Supprimer</button>
        <button @click="closeConfirmModal">Annuler</button>
      </div>
    </div>

    <!-- Affichage des enfants -->
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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

const fetchQuestionnaires = async () => {
  const { data, error } = await supabase.from('questionnaire').select('*');
  if (error) {
    console.error('Erreur lors de la récupération des questionnaires:', error);
  } else {
    questionnaires.value = data;
    filteredQuestionnaires.value = data; // Initialisation avec tous les questionnaires
  }
};

const showCreationForm = () => {
  router.push({ name: 'CreationQ' }); // Redirige vers la page CreationQ
};

const hideEditForm = () => {
  showEditForm.value = false;
};

const editQuestionnaire = async (questionnaireId) => {
  const { data, error } = await supabase
    .from('questionnaire')
    .select('*')
    .eq('id_questionnaire', questionnaireId)
    .single();

  if (error) {
    console.error('Erreur lors de la récupération du questionnaire:', error);
    return;
  }

  questionnaire.value = data;
  showEditForm.value = true;
};

const updateQuestionnaire = async () => {
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
  } else {
    showEditForm.value = false;
    fetchQuestionnaires();
  }
};

const editQuestions = () => {
  router.push('editquestions.vue '); // Redirige vers la page "EditQuestions"
};

const confirmDeleteQuestionnaire = (questionnaire) => {
  questionnairesToDelete.value = [questionnaire];
  showConfirmModal.value = true;
};

const confirmDeleteSelectedQuestionnaires = () => {
  questionnairesToDelete.value = questionnaires.value.filter(q => selectedQuestionnaires.value.includes(q.id_questionnaire));
  showConfirmModal.value = true;
};

const deleteQuestionnaires = async () => {
  const { error } = await supabase
    .from('questionnaire')
    .delete()
    .in('id_questionnaire', questionnairesToDelete.value.map(q => q.id_questionnaire));

  if (error) {
    console.error('Erreur lors de la suppression des questionnaires:', error);
  } else {
    fetchQuestionnaires();
    closeConfirmModal();
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
  filteredQuestionnaires.value = questionnaires.value.filter((questionnaire) => 
    questionnaire.nom.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
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
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.button-group.centered {
  justify-content: center;
}

button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border: none;
  padding: 10px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  margin-right: 10px;
}

button:hover {
  background-color: #b48ac6;
}

input[type="text"] {
  padding: 10px;
  margin-top: 10px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 5px;
}

input[type="checkbox"] {
  margin-right: 5px;
}

.table-container {
  max-height: 420px; /* Hauteur maximale du tableau */
  overflow-y: auto; /* Permet le défilement vertical */
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table th, table td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}

.data-table th {
  background-color: #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table tr:nth-child(even) {
  background-color: #f9f9f9;
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
  z-index: 1000; /* Ensure it is above other components */
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
}
</style>