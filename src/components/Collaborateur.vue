<template>
  <div class="box-principale">
    <div v-if="!showDebutTest && !showEvaluation">
      <div class="header">
        <h1>Accueil Collaborateur</h1>
        <div class="user-info">
          <span>{{ authStore.user }}</span>
          <button @click="logout" class="logout-button">Déconnexion</button>
        </div>
      </div>

      <div class="collaborateur-container">
        <div class="main-content">
          <div class="sidebar">
            <button 
              class="sidebar-btn" 
              :class="{ 'active': activeTab === 'questionnaires' }"
              @click="activeTab = 'questionnaires'"
            >
              Questionnaires
            </button>
            <button 
              class="sidebar-btn" 
              :class="{ 'active': activeTab === 'profil' }"
              @click="activeTab = 'profil'"
            >
              Mon profil
            </button>
            <button 
              class="sidebar-btn" 
              :class="{ 'active': activeTab === 'statistiques' }"
              @click="activeTab = 'statistiques'"
            >
              Statistiques
            </button>
          </div>

          <div class="content-section">
            <!-- Questionnaires -->
            <div v-if="activeTab === 'questionnaires'" class="questionnaire-section">
              <div class="code-input">
                <label for="code">CODE :</label>
                <input type="text" id="code" v-model="inputCode" placeholder="*code*" />
                <button class="code-btn" @click="checkCode">OK</button>
              </div>

              <div v-if="questionnaireData" class="questionnaire-preview">
                <h3>Nom du questionnaire :</h3>
                <p>{{ questionnaireData.nom }}</p>
                <h3>Temps du questionnaire :</h3>
                <p>{{ questionnaireData.temps_de_passage }} minutes</p>
                <h3>Note sur :</h3>
                <p>{{ totalPoints }} points</p>

                <button class="start-btn" @click="startEvaluation">Démarrer</button>
              </div>

              <div class="questionnaire-list">
                <h3>Questionnaires réalisés :</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Date de création</th>
                      <th>Temps de passage</th>
                      <th>Date</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="passage in passages" :key="passage.id_passer">
                      <td>{{ passage.nom_questionnaire }}</td>
                      <td>{{ formatDate(passage.date_creation) }}</td>
                      <td>{{ passage.temps_de_passage }} minutes</td>
                      <td>{{ formatDate(passage.date) }}</td>
                      <td>{{ passage.note }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Profil utilisateur avec gamification -->
            <div v-if="activeTab === 'profil'" class="profil-section">
              <ProfilUtilisateur :username="authStore.user" />
            </div>

            <!-- Statistiques -->
            <div v-if="activeTab === 'statistiques'" class="statistiques-section">
              <h2>Mes statistiques</h2>
              <div class="stats-cards">
                <div class="stat-card">
                  <div class="stat-value">{{ totalTests }}</div>
                  <div class="stat-label">Tests réalisés</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ moyenneTests }}%</div>
                  <div class="stat-label">Moyenne</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ tempsTotal }}</div>
                  <div class="stat-label">Minutes totales</div>
                </div>
              </div>

              <div class="stats-detail">
                <h3>Progrès récent</h3>
                <div class="progress-chart">
                  <!-- On pourrait ajouter un graphique ici -->
                  <p v-if="passages.length === 0">Aucun test réalisé pour afficher vos progrès.</p>
                  <div v-else class="progress-bars">
                    <div v-for="(passage, index) in recentPassages" :key="index" class="progress-item">
                      <div class="progress-label">{{ passage.nom_questionnaire }}</div>
                      <div class="progress-bar-container">
                        <div 
                          class="progress-value" 
                          :style="{ width: (passage.note / totalPoints * 100) + '%' }"
                        ></div>
                      </div>
                      <div class="progress-percent">{{ Math.round(passage.note / totalPoints * 100) }}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DebutTest 
      v-if="showDebutTest" 
      :username="authStore.user" 
      :questionnaire="questionnaireData" 
      @startEvaluation="showEvaluation = true" 
    />
    
    <Evaluation 
      v-if="showEvaluation" 
      :username="authStore.user" 
      :questionnaire="questionnaireData" 
      :questions="questions" 
      @evaluationCompleted="handleEvaluationCompleted"
    />
    
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/authStore';
import DebutTest from './DebutTest.vue';
import Evaluation from './Evaluation.vue';
import ProfilUtilisateur from './ProfilUtilisateur.vue';

const authStore = useAuthStore();
const router = useRouter();
const passages = ref([]);
const inputCode = ref('');
const questionnaireData = ref(null);
const showDebutTest = ref(false);
const showEvaluation = ref(false);
const totalPoints = ref(0);
const questions = ref([]);
const activeTab = ref('questionnaires');

const logout = () => {
  authStore.logout();
  router.push('/');
};

const fetchPassages = async () => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('utilisateur')
      .select('id_utilisateur')
      .eq('pseudo', authStore.user)
      .single();

    if (userError) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', userError);
      return;
    }

    const userId = userData.id_utilisateur;

    const { data: passagesData, error: passagesError } = await supabase
      .from('passer')
      .select('id_passer, date, note, id_questionnaire')
      .eq('id_utilisateur', userId)
      .order('date', { ascending: false });

    if (passagesError) {
      console.error('Erreur lors de la récupération des passages:', passagesError);
      return;
    }

    const questionnaireIds = passagesData.map(p => p.id_questionnaire);
    
    if (questionnaireIds.length > 0) {
      const { data: questionnairesData, error: questionnairesError } = await supabase
        .from('questionnaire')
        .select('id_questionnaire, nom, date_creation, temps_de_passage')
        .in('id_questionnaire', questionnaireIds);

      if (questionnairesError) {
        console.error('Erreur lors de la récupération des questionnaires:', questionnairesError);
        return;
      }

      passages.value = passagesData.map(passage => {
        const questionnaire = questionnairesData.find(q => q.id_questionnaire === passage.id_questionnaire);
        return {
          ...passage,
          nom_questionnaire: questionnaire?.nom || 'Inconnu',
          date_creation: questionnaire?.date_creation || '',
          temps_de_passage: questionnaire?.temps_de_passage || 0
        };
      });
    } else {
      passages.value = [];
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des passages:', error);
  }
};

const formatDate = (date) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('fr-FR', options);
};

const checkCode = async () => {
  try {
    const { data, error } = await supabase
      .from('questionnaire')
      .select('id_questionnaire, nom, temps_de_passage, code')
      .eq('code', inputCode.value)
      .single();

    if (error || !data) {
      alert('Code incorrect');
    } else {
      questionnaireData.value = data;
      totalPoints.value = await fetchTotalPoints(data.id_questionnaire);
      showDebutTest.value = true;
    }
  } catch (error) {
    console.error("Erreur lors de la vérification du code :", error);
    alert('Erreur lors de la vérification du code');
  }
};

const fetchTotalPoints = async (questionnaireId) => {
  const { data, error } = await supabase
    .from('question')
    .select('points')
    .eq('id_questionnaire', questionnaireId);

  if (error) {
    console.error('Erreur lors de la récupération des points totaux :', error);
    return 0;
  } else {
    return data.reduce((acc, question) => acc + question.points, 0);
  }
};

const startEvaluation = async () => {
  showEvaluation.value = true;
  const { data: questionsData, error: questionsError } = await supabase
    .from('contenir')
    .select('question.*')
    .eq('id_questionnaire', questionnaireData.value.id_questionnaire)
    .join('question', 'contenir.id_question', 'question.id_question');

  if (questionsError) {
    console.error('Erreur lors de la récupération des questions :', questionsError);
  } else {
    questions.value = questionsData;
  }
};

// Statistiques calculées
const totalTests = computed(() => passages.value.length);

const moyenneTests = computed(() => {
  if (passages.value.length === 0) return 0;
  const sum = passages.value.reduce((acc, passage) => acc + parseFloat(passage.note || 0), 0);
  return Math.round((sum / passages.value.length) * 10) / 10;
});

const tempsTotal = computed(() => {
  return passages.value.reduce((acc, passage) => acc + (passage.temps_de_passage || 0), 0);
});

const recentPassages = computed(() => {
  return passages.value.slice(0, 5); // Les 5 passages les plus récents
});

// Gestion de la complétion d'une évaluation
const handleEvaluationCompleted = async (result) => {
  // Mise à jour des points de l'utilisateur
  await updateUserPoints(result.note);
  
  // Vérification des badges
  await checkAndAwardBadges(result);
  
  // Rafraîchir les données
  fetchPassages();
  
  // Revenir à l'onglet questionnaires
  showEvaluation.value = false;
  showDebutTest.value = false;
  activeTab.value = 'questionnaires';
};

// Mettre à jour les points de l'utilisateur
const updateUserPoints = async (note) => {
  try {
    // Récupérer l'ID utilisateur et les points actuels
    const { data: userData, error: userError } = await supabase
      .from('utilisateur')
      .select('id_utilisateur, points')
      .eq('pseudo', authStore.user)
      .single();
    
    if (userError) throw userError;
    
    // Points gagnés = points du questionnaire × (note / 20)
    const pointsGagnes = Math.round(totalPoints.value * (note / 20));
    const nouveauxPoints = (userData.points || 0) + pointsGagnes;
    
    // Mettre à jour les points de l'utilisateur
    const { error: updateError } = await supabase
      .from('utilisateur')
      .update({ points: nouveauxPoints })
      .eq('id_utilisateur', userData.id_utilisateur);
    
    if (updateError) throw updateError;
    
    console.log(`Points mis à jour: +${pointsGagnes} points`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des points:', error);
  }
};

// Vérifier et attribuer des badges
const checkAndAwardBadges = async (result) => {
  try {
    // Récupérer l'ID utilisateur
    const { data: userData, error: userError } = await supabase
      .from('utilisateur')
      .select('id_utilisateur')
      .eq('pseudo', authStore.user)
      .single();
    
    if (userError) throw userError;
    
    const userId = userData.id_utilisateur;
    
    // Récupérer les badges actuels de l'utilisateur
    const { data: userBadges, error: badgesError } = await supabase
      .from('utilisateur_badge')
      .select('badge_id')
      .eq('id_utilisateur', userId);
    
    if (badgesError) throw badgesError;
    
    const badgeIds = userBadges.map(b => b.badge_id);
    
    // Récupérer tous les badges disponibles
    const { data: allBadges, error: allBadgesError } = await supabase
      .from('badge')
      .select('*');
    
    if (allBadgesError) throw allBadgesError;
    
    // Vérifier les conditions pour chaque badge
    const badgesToAward = [];
    
    // Badge "Premier test"
    const badgePremierTest = allBadges.find(b => b.nom === 'Premier test');
    if (badgePremierTest && !badgeIds.includes(badgePremierTest.id_badge)) {
      badgesToAward.push({
        id_utilisateur: userId,
        id_badge: badgePremierTest.id_badge,
        date_obtention: new Date().toISOString().split('T')[0]
      });
    }
    
    // Badge "Maître du QCM" (score parfait)
    const badgeMaitreQCM = allBadges.find(b => b.nom === 'Maître du QCM');
    if (badgeMaitreQCM && !badgeIds.includes(badgeMaitreQCM.id_badge) && result.note >= 20) {
      badgesToAward.push({
        id_utilisateur: userId,
        id_badge: badgeMaitreQCM.id_badge,
        date_obtention: new Date().toISOString().split('T')[0]
      });
    }
    
    // Badge "Performer" (3 tests avec plus de 15/20)
    const badgePerformer = allBadges.find(b => b.nom === 'Performer');
    if (badgePerformer && !badgeIds.includes(badgePerformer.id_badge)) {
      // Vérifier si l'utilisateur a réussi 3 tests avec plus de 15/20
      const { data: highScores, error: highScoresError } = await supabase
        .from('passer')
        .select('note')
        .eq('id_utilisateur', userId)
        .gte('note', 15);
      
      if (!highScoresError && highScores.length >= 3) {
        badgesToAward.push({
          id_utilisateur: userId,
          id_badge: badgePerformer.id_badge,
          date_obtention: new Date().toISOString().split('T')[0]
        });
      }
    }
    
    // Attribuer les nouveaux badges
    if (badgesToAward.length > 0) {
      const { error: insertError } = await supabase
        .from('utilisateur_badge')
        .insert(badgesToAward);
      
      if (insertError) throw insertError;
      
      console.log(`${badgesToAward.length} nouveau(x) badge(s) attribué(s)!`);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des badges:', error);
  }
};

onMounted(() => {
  fetchPassages();
});
</script>

<style scoped>
.box-principale {
  box-shadow: #ccc;
}
.header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  width: 98%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  color: white;
  font-size: 2rem;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 20px;
  color: white;
  font-size: 1rem;
}

.logout-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;
}

.logout-button:hover {
  background-color: #b48ac6;
}

.collaborateur-container {
  background-color: #f5f5f5;
  padding: 80px 20px 20px;
}

.main-content {
  display: flex;
  width: 100%;
  margin-top: 20px;
}

.sidebar {
  width: 200px;
  background-color: #d9d9d9;
  padding: 10px;
}

.sidebar-btn {
  width: 100%;
  padding: 10px;
  font-size: 1.2rem;
  background-color: #d9d9d9;
  color: black;
  border: none;
  text-align: center;
  cursor: pointer;
}

.questionnaire-section {
  flex: 1;
  padding: 20px;
}

.code-input {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.code-input label {
  font-size: 1.1rem;
  margin-right: 10px;
}

.code-input input {
  padding: 5px;
  width: 100px;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.code-btn {
  margin-left: 10px;
  padding: 5px 10px;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border-radius: 10px;
  cursor: pointer;
}

.start-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  margin-top: 20px;
}

.questionnaire-list h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 10px;
  text-align: left;
}

.back-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #c59edb;
  color: white;
  border: none;
  cursor: pointer;
}
</style>