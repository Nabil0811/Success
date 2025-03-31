<template>
  <header>
    <h1>Correction des Questionnaires</h1>
  </header>
  <div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nom du Questionnaire</th>
            <th>Utilisateur</th>
            <th>Note</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="passage in passages" :key="passage.id_passer" @click="selectPassage(passage)" :class="{ selected: selectedPassage && selectedPassage.id_passer === passage.id_passer }">
            <td>{{ passage.nom_questionnaire }}</td>
            <td>{{ passage.utilisateur }}</td>
            <td>{{ passage.note }}</td>
            <td>{{ formatDate(passage.date) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Correction
      v-if="selectedPassage"
      :username="username"
      :idQuestionnaire="selectedPassage.id_questionnaire"
      :idUtilisateur="selectedPassage.id_utilisateur"
      @goBack="selectedPassage = null"
    />
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase';
import Correction from './Correction.vue';

const router = useRouter();
const passages = ref([]);
const selectedPassage = ref(null);
const utilisateurs = ref({});
const questionnaires = ref({});
const username = ref(''); // Remplacez par le nom d'utilisateur actuel

const fetchPassages = async () => {
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
  } else {
    passages.value = data;
    fetchUtilisateurs();
  }
};

const fetchUtilisateurs = async () => {
  const { data, error } = await supabase
    .from('utilisateur')
    .select('id_utilisateur, pseudo');

  if (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);
  } else {
    utilisateurs.value = data.reduce((acc, utilisateur) => {
      acc[utilisateur.id_utilisateur] = utilisateur.pseudo;
      return acc;
    }, {});
    fetchQuestionnaires();
  }
};

const fetchQuestionnaires = async () => {
  const { data, error } = await supabase
    .from('questionnaire')
    .select('id_questionnaire, nom');

  if (error) {
    console.error("Erreur lors de la récupération des questionnaires :", error);
  } else {
    questionnaires.value = data.reduce((acc, questionnaire) => {
      acc[questionnaire.id_questionnaire] = questionnaire.nom;
      return acc;
    }, {});
    mapPassages();
  }
};

const mapPassages = () => {
  passages.value = passages.value.map(passage => ({
    ...passage,
    utilisateur: utilisateurs.value[passage.id_utilisateur],
    nom_questionnaire: questionnaires.value[passage.id_questionnaire]
  }));
};

const selectPassage = (passage) => {
  selectedPassage.value = passage;
};

const formatDate = (date) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('fr-FR', options);
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
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 10px;
  text-align: left;
  border: 1px solid #ccc;
}

th {
  background-color: #f0f0f0;
}

td {
  cursor: pointer;
}

td:hover {
  background-color: #f9f9f9;
}

.table-container {
  max-height: 520px; 
  overflow-y: auto; 
  overflow-x: hidden; 
  border: 1px solid #ddd; 
  margin-top: 20px;
}

thead th {
  position: sticky;
  top: 0;
  background-color: #fff;
  z-index: 2;
}

.selected {
  background-color: #e0e0e0;
}
</style>