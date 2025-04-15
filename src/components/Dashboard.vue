<template>
  <header>
    <h1>Dashboard</h1>
  </header>
  <div class="dashboard-container">
    <div class="stat-cards">
      <div class="stat-card">
        <h3>Total Utilisateurs</h3>
        <p>{{ totalutilisateur }}</p>
      </div>
      <div class="stat-card">
        <h3>Total Questionnaires</h3>
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
    
    <div class="additional-stats">
      <div class="stats-row">
        <div class="stat-card">
          <h3>Meilleure note</h3>
          <p>{{ bestNote }}/20</p>
        </div>
        <div class="stat-card">
          <h3>Note la plus basse</h3>
          <p>{{ worstNote }}/20</p>
        </div>
        <div class="stat-card">
          <h3>Taux de réussite</h3>
          <p>{{ successRate }}%</p>
        </div>
      </div>
    </div>
    
    <div class="chart-section">
      <h3>Répartition des notes par questionnaire</h3>
      <div class="chart-container">
        <canvas id="notesChart"></canvas>
      </div>
    </div>
    
    <div class="recent-activity">
      <h3>Activité récente</h3>
      <div class="table-container">
        <table class="activity-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Questionnaire</th>
              <th>Note</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="activity in recentActivity" :key="activity.id_passer">
              <td>{{ activity.utilisateur || 'Inconnu' }}</td>
              <td>{{ activity.questionnaire || 'Inconnu' }}</td>
              <td>{{ activity.note }}/20</td>
              <td>{{ formatDate(activity.date) }}</td>
            </tr>
            <tr v-if="recentActivity.length === 0">
              <td colspan="4" class="no-data">Aucune activité récente</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase';
import Chart from 'chart.js/auto';

const totalutilisateur = ref(0);
const totalquestionnaire = ref(0);
const totalPasser = ref(0);
const averageNote = ref(0);
const bestNote = ref(0);
const worstNote = ref(0);
const successRate = ref(0);
const recentActivity = ref([]);
let notesChart = null;

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

    // Récupérer le nombre total de questionnaires réalisés
    const { count: passerCount, error: passerError } = await supabase
      .from('passer')
      .select('*', { count: 'exact' });

    if (passerError) {
      console.error('Erreur lors de la récupération des questionnaires réalisés:', passerError);
    } else {
      totalPasser.value = passerCount;
    }

    // Calculer la moyenne des notes - assurez-vous que c'est sur 20
    const { data: notesData, error: notesError } = await supabase
      .from('passer')
      .select('note');

    if (notesError) {
      console.error('Erreur lors de la récupération des notes:', notesError);
    } else if (notesData && notesData.length > 0) {
      const totalNotes = notesData.reduce((acc, item) => acc + parseFloat(item.note || 0), 0);
      averageNote.value = (totalNotes / notesData.length).toFixed(2);
      
      // Déterminer la meilleure et la pire note
      const allNotes = notesData.map(item => parseFloat(item.note || 0));
      bestNote.value = Math.max(...allNotes).toFixed(2);
      worstNote.value = Math.min(...allNotes).toFixed(2);
      
      // Calculer le taux de réussite (notes >= 10/20)
      const passedCount = notesData.filter(item => parseFloat(item.note || 0) >= 10).length;
      successRate.value = ((passedCount / notesData.length) * 100).toFixed(1);
    }

    // Récupérer l'activité récente
    await fetchRecentActivity();
    
    // Récupérer les données pour le graphique
    await fetchChartData();

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
  }
};

const fetchRecentActivity = async () => {
  try {
    // Récupérer les 10 derniers questionnaires passés
    const { data: passerData, error: passerError } = await supabase
      .from('passer')
      .select('id_passer, id_utilisateur, id_questionnaire, note, date')
      .order('date', { ascending: false })
      .limit(10);
      
    if (passerError) throw passerError;
    
    if (!passerData || passerData.length === 0) {
      recentActivity.value = [];
      return;
    }
    
    // Récupérer les noms des utilisateurs
    const userIds = [...new Set(passerData.map(item => item.id_utilisateur))];
    const { data: userData, error: userError } = await supabase
      .from('utilisateur')
      .select('id_utilisateur, pseudo')
      .in('id_utilisateur', userIds);
      
    if (userError) throw userError;
    
    const userMap = {};
    if (userData) {
      userData.forEach(user => {
        userMap[user.id_utilisateur] = user.pseudo;
      });
    }
    
    // Récupérer les noms des questionnaires
    const questionnaireIds = [...new Set(passerData.map(item => item.id_questionnaire))];
    const { data: questionnaireData, error: questionnaireError } = await supabase
      .from('questionnaire')
      .select('id_questionnaire, nom')
      .in('id_questionnaire', questionnaireIds);
      
    if (questionnaireError) throw questionnaireError;
    
    const questionnaireMap = {};
    if (questionnaireData) {
      questionnaireData.forEach(q => {
        questionnaireMap[q.id_questionnaire] = q.nom;
      });
    }
    
    // Combiner les données
    recentActivity.value = passerData.map(item => ({
      id_passer: item.id_passer,
      utilisateur: userMap[item.id_utilisateur] || 'Inconnu',
      questionnaire: questionnaireMap[item.id_questionnaire] || 'Inconnu',
      note: parseFloat(item.note || 0).toFixed(2),
      date: item.date
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération de l'activité récente:", error);
    recentActivity.value = [];
  }
};

const fetchChartData = async () => {
  try {
    // Récupérer les questionnaires
    const { data: questionnairesData, error: questionnairesError } = await supabase
      .from('questionnaire')
      .select('id_questionnaire, nom')
      .limit(5); // Limiter à 5 questionnaires pour la lisibilité
      
    if (questionnairesError) throw questionnairesError;
    
    if (!questionnairesData || questionnairesData.length === 0) return;
    
    // Pour chaque questionnaire, récupérer les notes moyennes
    const chartData = {
      labels: [],
      datasets: [{
        label: 'Note moyenne sur 20',
        data: [],
        backgroundColor: 'rgba(110, 142, 251, 0.6)',
        borderColor: 'rgba(110, 142, 251, 1)',
        borderWidth: 1
      }]
    };
    
    for (const questionnaire of questionnairesData) {
      chartData.labels.push(questionnaire.nom);
      
      const { data: notesData, error: notesError } = await supabase
        .from('passer')
        .select('note')
        .eq('id_questionnaire', questionnaire.id_questionnaire);
        
      if (notesError) {
        console.error(`Erreur lors de la récupération des notes pour le questionnaire ${questionnaire.id_questionnaire}:`, notesError);
        chartData.datasets[0].data.push(0);
        continue;
      }
      
      if (!notesData || notesData.length === 0) {
        chartData.datasets[0].data.push(0);
        continue;
      }
      
      const averageNoteForQuestionnaire = notesData.reduce((acc, item) => acc + parseFloat(item.note || 0), 0) / notesData.length;
      chartData.datasets[0].data.push(parseFloat(averageNoteForQuestionnaire.toFixed(2)));
    }
    
    // Créer le graphique
    renderChart(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des données du graphique:", error);
  }
};

const renderChart = (chartData) => {
  const ctx = document.getElementById('notesChart');
  
  // Détruire le graphique existant s'il y en a un
  if (notesChart) {
    notesChart.destroy();
  }
  
  notesChart = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 20,
          title: {
            display: true,
            text: 'Note sur 20'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Questionnaires'
          }
        }
      }
    }
  });
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
  fetchStats();
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

h3 {
  margin-top: 0;
  color: #333;
}

.dashboard-container {
  padding: 20px;
}

.stat-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  flex: 1;
  min-width: 200px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card h3 {
  margin-bottom: 10px;
  font-size: 1rem;
  color: #555;
}

.stat-card p {
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
  color: #6e8efb;
}

.additional-stats {
  margin-bottom: 30px;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.chart-section {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.chart-container {
  height: 300px;
  margin-top: 20px;
}

.recent-activity {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.table-container {
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.activity-table {
  width: 100%;
  border-collapse: collapse;
}

.activity-table th, 
.activity-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.activity-table th {
  background-color: #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.activity-table tr:hover {
  background-color: #f5f5f5;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #777;
  font-style: italic;
}

@media (max-width: 768px) {
  .stat-cards, .stats-row {
    flex-direction: column;
  }
  
  .stat-card {
    width: 100%;
  }
}
</style>