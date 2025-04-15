<template>
  <header>
    <h1>Correction des Questionnaires</h1>
  </header>
  <div>
    <div class="search-container">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Rechercher par utilisateur ou questionnaire..." 
        @input="filterPassages"
      />
    </div>
    
    <div class="table-container" v-if="!selectedPassage && !loading">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nom du Questionnaire</th>
            <th>Utilisateur</th>
            <th>Note</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="passage in filteredPassages" :key="passage.id_passer">
            <td>{{ passage.nom_questionnaire }}</td>
            <td>{{ passage.utilisateur }}</td>
            <td :class="getNoteClass(passage.note)">{{ passage.note }}/20</td>
            <td>{{ formatDate(passage.date) }}</td>
            <td>
              <button @click="selectPassage(passage)" class="view-btn">Voir la correction</button>
            </td>
          </tr>
          <tr v-if="filteredPassages.length === 0">
            <td colspan="5" class="no-data">Aucun questionnaire passé trouvé</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Chargement des données...</p>
    </div>

    <Correction
      v-if="selectedPassage"
      :username="selectedPassage.utilisateur"
      :idQuestionnaire="selectedPassage.id_questionnaire"
      :idUtilisateur="selectedPassage.id_utilisateur"
    />
    
    <div v-if="selectedPassage" class="back-container">
      <button @click="selectedPassage = null" class="back-btn">Retour à la liste</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase';
import Correction from './Correction.vue';

const router = useRouter();
const passages = ref([]);
const filteredPassages = ref([]);
const selectedPassage = ref(null);
const utilisateurs = ref({});
const questionnaires = ref({});
const loading = ref(true);
const searchQuery = ref('');

const fetchPassages = async () => {
  try {
    loading.value = true;
    
    const { data, error } = await supabase
      .from('passer')
      .select(`
        id_passer,
        date,
        note,
        id_utilisateur,
        id_questionnaire
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des passages :", error);
      loading.value = false;
      return;
    }
    
    passages.value = data || [];
    await fetchUtilisateurs();
  } catch (error) {
    console.error("Erreur inattendue:", error);
    loading.value = false;
  }
};

const fetchUtilisateurs = async () => {
  try {
    const { data, error } = await supabase
      .from('utilisateur')
      .select('id_utilisateur, pseudo');

    if (error) {
      console.error("Erreur lors de la récupération des utilisateurs :", error);
      loading.value = false;
      return;
    }
    
    utilisateurs.value = data.reduce((acc, utilisateur) => {
      acc[utilisateur.id_utilisateur] = utilisateur.pseudo;
      return acc;
    }, {});
    
    await fetchQuestionnaires();
  } catch (error) {
    console.error("Erreur inattendue:", error);
    loading.value = false;
  }
};

const fetchQuestionnaires = async () => {
  try {
    const { data, error } = await supabase
      .from('questionnaire')
      .select('id_questionnaire, nom');

    if (error) {
      console.error("Erreur lors de la récupération des questionnaires :", error);
      loading.value = false;
      return;
    }
    
    questionnaires.value = data.reduce((acc, questionnaire) => {
      acc[questionnaire.id_questionnaire] = questionnaire.nom;
      return acc;
    }, {});
    
    mapPassages();
    loading.value = false;
  } catch (error) {
    console.error("Erreur inattendue:", error);
    loading.value = false;
  }
};

const mapPassages = () => {
  passages.value = passages.value.map(passage => ({
    ...passage,
    utilisateur: utilisateurs.value[passage.id_utilisateur] || 'Utilisateur inconnu',
    nom_questionnaire: questionnaires.value[passage.id_questionnaire] || 'Questionnaire inconnu'
  }));
  
  filteredPassages.value = [...passages.value];
};

const filterPassages = () => {
  if (!searchQuery.value.trim()) {
    filteredPassages.value = passages.value;
    return;
  }
  
  const query = searchQuery.value.toLowerCase();
  filteredPassages.value = passages.value.filter(passage => 
    passage.utilisateur.toLowerCase().includes(query) || 
    passage.nom_questionnaire.toLowerCase().includes(query)
  );
};

const selectPassage = (passage) => {
  selectedPassage.value = passage;
};

const getNoteClass = (note) => {
  const numericNote = parseFloat(note);
  if (numericNote >= 16) return 'note-excellent';
  if (numericNote >= 14) return 'note-good';
  if (numericNote >= 10) return 'note-average';
  return 'note-poor';
};

const formatDate = (date) => {
  if (!date) return 'Date inconnue';
  
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('fr-FR', options);
  } catch (error) {
    console.error("Erreur lors du formatage de la date:", error);
    return date;
  }
};

onMounted(() => {
  fetchPassages();
});
</script>

<style scoped>
/* Styles pour le tableau */
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

.search-container {
  margin-bottom: 20px;
}

input[type="text"] {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.table-container {
  max-height: 520px; 
  overflow-y: auto; 
  border: 1px solid #ddd; 
  border-radius: 5px;
  margin-bottom: 20px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, 
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background-color: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 2;
  font-weight: bold;
}

.data-table tr:hover {
  background-color: #f9f9f9;
}

.note-excellent {
  color: #28a745;
  font-weight: bold;
}

.note-good {
  color: #17a2b8;
  font-weight: bold;
}

.note-average {
  color: #ffc107;
  font-weight: bold;
}

.note-poor {
  color: #dc3545;
  font-weight: bold;
}

.view-btn {
  background-color: #6e8efb;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.view-btn:hover {
  background-color: #5a75d6;
}

.back-container {
  margin-top: 20px;
  text-align: center;
}

.back-btn {
  background-color: #6e8efb;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  text-decoration: none;
  display: inline-block;
  margin-right: 10px;
}

.back-btn:hover {
  background-color: #5a75d6;    
}
</style>