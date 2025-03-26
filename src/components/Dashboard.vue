<template>
  <header>
    <h1>Dashboard</h1>
  </header>
  <div class="dashboard-container">
    <div class="stat-cards">
      <div class="stat-card">
        <h3>Total Utilisateur</h3>
        <p>{{ totalutilisateur }}</p>
      </div>
      <div class="stat-card">
        <h3>Total Questionnaire</h3>
        <p>{{ totalquestionnaire }}</p>
      </div>
      <div class="stat-card">
        <h3>Questionnaires réalisés</h3>
        <p>{{ totalPasser }}</p>
      </div>
      <div class="stat-card">
        <h3>Moyenne des notes</h3>
        <p>{{ averageNote }}/20</p>
      </div>
    </div>
    <div class="chart-container">
      <canvas id="dailyChart"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase';
import { Chart } from 'chart.js';

const totalutilisateur = ref(0);
const totalquestionnaire = ref(0);
const totalReponse = ref(0);
const totalPasser = ref(0);
const averageNote = ref(0);
const dailyQuestionnaires = ref([]);

const fetchStats = async () => {
  try {
    // Récupérer le nombre total d'utilisateurs
    const { count: utilisateurCount, error: utilisateurError } = await supabase
      .from('utilisateur')
      .select('id_utilisateur', { count: 'exact' });

    if (utilisateurError) {
      console.error('Erreur lors de la récupération des utilisateurs:', utilisateurError);
    } else {
      totalutilisateur.value = utilisateurCount;
    }

    // Récupérer le nombre total de questionnaires
    const { count: questionnaireCount, error: questionnaireError } = await supabase
      .from('questionnaire')
      .select('*', { count: 'exact' });

    if (questionnaireError) {
      console.error('Erreur lors de la récupération des questionnaires:', questionnaireError);
    } else {
      totalquestionnaire.value = questionnaireCount;
    }

    // Récupérer le nombre total de réponses
    const { count: reponseCount, error: reponseError } = await supabase
      .from('reponse')
      .select('*', { count: 'exact' });

    if (reponseError) {
      console.error('Erreur lors de la récupération des réponses:', reponseError);
    } else {
      totalReponse.value = reponseCount;
    }

    // Récupérer le nombre total de questionnaires réalisés
    const { count: passerCount, error: passerError } = await supabase
      .from('passer')
      .select('*', { count: 'exact' });

    if (passerError) {
      console.error('Erreur lors de la récupération des questionnaires réalisés:', passerError);
    } else {
      totalPasser.value = passerCount;
    }

    // Calculer la moyenne des notes
    const { data: notesData, error: notesError } = await supabase
      .from('passer')
      .select('note');

    if (notesError) {
      console.error('Erreur lors de la récupération des notes:', notesError);
    } else {
      const totalNotes = notesData.reduce((acc, item) => acc + item.note, 0);
      averageNote.value = ((totalNotes / notesData.length) * 20 / 20).toFixed(2);
    }

    // Récupérer les données pour le graphique
    const { data: dailyData, error: dailyError } = await supabase
      .from('passer')
      .select('date, count: id_passer')
      .group('date')
      .order('date', { ascending: true });

    if (dailyError) {
      console.error('Erreur lors de la récupération des données quotidiennes:', dailyError);
    } else {
      dailyQuestionnaires.value = dailyData;
      renderChart();
    }

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
  }
};

const renderChart = () => {
  const ctx = document.getElementById('dailyChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dailyQuestionnaires.value.map(item => item.date),
      datasets: [{
        label: 'Questionnaires réalisés par jour',
        data: dailyQuestionnaires.value.map(item => item.count),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      }]
    },
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          }
        }
      }
    }
  });
};

onMounted(() => {
  fetchStats();
});
</script>

<style scoped>

header{
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 20px;
  text-align: center;
  border-radius: 7px;
}
.dashboard-container {
  padding: 20px;
}

.stat-cards {
  display: flex;
  gap: 20px;
}

.stat-card {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 20px;
  width: 200px;
  text-align: center;
}

.chart-container {
  margin-top: 40px;
}
</style>