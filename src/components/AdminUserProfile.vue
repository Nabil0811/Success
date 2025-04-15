<template>
    <div class="admin-user-profile">
      <header>
        <h1>Gestion des Profils Utilisateurs</h1>
      </header>
  
      <div class="search-section">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Rechercher un utilisateur..."
          @input="filterUsers"
        />
      </div>
  
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Niveau</th>
              <th>Points</th>
              <th>Badges</th>
              <th>Tests complétés</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id_utilisateur">
              <td>{{ user.pseudo }}</td>
              <td>
                <span class="level-badge" :style="{ backgroundColor: getLevelColor(user.niveau) }">
                  {{ user.niveau }}
                </span>
              </td>
              <td>{{ user.points }} pts</td>
              <td>
                <div class="badges-preview">
                  <div v-if="user.badges.length === 0" class="no-badges">-</div>
                  <div v-else class="badge-icons">
                    <span 
                      v-for="(badge, index) in user.badges.slice(0, 3)" 
                      :key="index" 
                      class="material-icons badge-icon-small"
                      :title="badge.nom"
                    >
                      {{ getBadgeIcon(badge) }}
                    </span>
                    <span v-if="user.badges.length > 3" class="more-badges">+{{ user.badges.length - 3 }}</span>
                  </div>
                </div>
              </td>
              <td>{{ user.testsCount }}</td>
              <td>
                <button @click="viewUserDetails(user)" class="view-btn">Voir détails</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  
      <!-- Modal de détails utilisateur -->
      <div v-if="selectedUser" class="user-details-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Profil de {{ selectedUser.pseudo }}</h2>
            <button @click="closeModal" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="detail-section">
              <h3>Informations générales</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Niveau</div>
                  <div class="info-value">
                    <span class="level-badge" :style="{ backgroundColor: getLevelColor(selectedUser.niveau) }">
                      {{ selectedUser.niveau }}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Points</div>
                  <div class="info-value">{{ selectedUser.points }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Tests complétés</div>
                  <div class="info-value">{{ selectedUser.testsCount }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Score moyen</div>
                  <div class="info-value">{{ calculateAverageScore(selectedUser.tests) }}/20</div>
                </div>
              </div>
            </div>
            
            <div class="detail-section">
              <h3>Badges obtenus</h3>
              <div class="badges-detail">
                <div v-if="selectedUser.badges.length === 0" class="no-badges">
                  Aucun badge obtenu pour le moment
                </div>
                <div v-else class="badges-grid">
                  <div v-for="badge in selectedUser.badges" :key="badge.id_badge" class="badge-detail-item">
                    <div class="badge-icon-large">
                      <span class="material-icons">{{ getBadgeIcon(badge) }}</span>
                    </div>
                    <div class="badge-detail-info">
                      <div class="badge-name">{{ badge.nom }}</div>
                      <div class="badge-description">{{ badge.description }}</div>
                      <div class="badge-date">Obtenu le {{ formatDate(badge.date_obtention) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="detail-section">
              <h3>Historique des tests</h3>
              <div class="tests-history">
                <div v-if="selectedUser.tests.length === 0" class="no-tests">
                  Aucun test réalisé pour le moment
                </div>
                <div v-else class="tests-table-container">
                  <table class="tests-table">
                    <thead>
                      <tr>
                        <th>Questionnaire</th>
                        <th>Date</th>
                        <th>Note</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="test in selectedUser.tests" :key="test.id_passer">
                        <td>{{ test.nom_questionnaire || 'Questionnaire #' + test.id_questionnaire }}</td>
                        <td>{{ formatDate(test.date) }}</td>
                        <td :class="{ 'good-score': test.note >= 16, 'average-score': test.note >= 10 && test.note < 16, 'bad-score': test.note < 10 }">
                          {{ test.note }}/20
                        </td>
                        <td>
                          <button @click="viewCorrection(test)" class="correction-btn">Correction</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div class="detail-section">
              <h3>Actions administrateur</h3>
              <div class="admin-actions">
                <button @click="addBadge" class="admin-btn">Attribuer un badge</button>
                <button @click="adjustPoints" class="admin-btn">Ajuster les points</button>
                <button @click="resetProgress" class="admin-btn danger">Réinitialiser la progression</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modal d'attribution de badge -->
      <div v-if="showBadgeModal" class="badge-modal">
        <div class="modal-content badge-modal-content">
          <div class="modal-header">
            <h2>Attribuer un badge à {{ selectedUser.pseudo }}</h2>
            <button @click="showBadgeModal = false" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="available-badges">
              <div 
                v-for="badge in availableBadges" 
                :key="badge.id_badge" 
                class="badge-option"
                :class="{ selected: selectedBadge === badge.id_badge }"
                @click="selectedBadge = badge.id_badge"
              >
                <div class="badge-icon-medium">
                  <span class="material-icons">{{ getBadgeIcon(badge) }}</span>
                </div>
                <div class="badge-option-info">
                  <div class="badge-option-name">{{ badge.nom }}</div>
                  <div class="badge-option-description">{{ badge.description }}</div>
                </div>
              </div>
            </div>
            
            <div class="modal-actions">
              <button @click="assignBadge" class="confirm-btn" :disabled="!selectedBadge">Attribuer</button>
              <button @click="showBadgeModal = false" class="cancel-btn">Annuler</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modal d'ajustement des points -->
      <div v-if="showPointsModal" class="points-modal">
        <div class="modal-content points-modal-content">
          <div class="modal-header">
            <h2>Ajuster les points de {{ selectedUser.pseudo }}</h2>
            <button @click="showPointsModal = false" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="points-adjustment">
              <div class="current-points">
                Points actuels: <span>{{ selectedUser.points }}</span>
              </div>
              
              <div class="adjustment-controls">
                <button @click="pointsToAdd -= 5" class="adjust-btn" :disabled="pointsToAdd <= -100">-</button>
                <input v-model.number="pointsToAdd" type="number" class="points-input" />
                <button @click="pointsToAdd += 5" class="adjust-btn" :disabled="pointsToAdd >= 100">+</button>
              </div>
              
              <div class="new-points">
                Nouveaux points: <span>{{ selectedUser.points + pointsToAdd }}</span>
              </div>
            </div>
            
            <div class="modal-actions">
              <button @click="updatePoints" class="confirm-btn">Confirmer</button>
              <button @click="showPointsModal = false" class="cancel-btn">Annuler</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modal de confirmation de réinitialisation -->
      <div v-if="showResetModal" class="reset-modal">
        <div class="modal-content reset-modal-content">
          <div class="modal-header">
            <h2>Réinitialiser la progression</h2>
            <button @click="showResetModal = false" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="reset-warning">
              <p>Voulez-vous vraiment réinitialiser la progression de <strong>{{ selectedUser.pseudo }}</strong>?</p>
              <p>Cette action va:</p>
              <ul>
                <li>Remettre les points à zéro</li>
                <li>Supprimer tous les badges</li>
                <li>Conserver l'historique des tests</li>
              </ul>
              <p>Cette action est <strong>irréversible</strong>.</p>
            </div>
            
            <div class="modal-actions">
              <button @click="confirmReset" class="danger-btn">Réinitialiser</button>
              <button @click="showResetModal = false" class="cancel-btn">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { supabase } from '../supabase';
  
  const router = useRouter();
  const users = ref([]);
  const filteredUsers = ref([]);
  const searchQuery = ref('');
  const selectedUser = ref(null);
  const niveaux = ref([]);
  const allBadges = ref([]);
  
  // Modales
  const showBadgeModal = ref(false);
  const showPointsModal = ref(false);
  const showResetModal = ref(false);
  const selectedBadge = ref(null);
  const pointsToAdd = ref(0);
  
  // Récupérer les données des utilisateurs
  const fetchUsers = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('utilisateur')
        .select('id_utilisateur, pseudo, points');
      
      if (userError) throw userError;
      
      const usersWithDetails = [];
      
      for (const user of userData) {
        // Récupérer le niveau de l'utilisateur
        const niveau = getUserLevel(user.points);
        
        // Récupérer les badges de l'utilisateur
        const { data: badgesData, error: badgesError } = await supabase
          .from('utilisateur_badge')
          .select(`
            badge (id_badge, nom, description, icone),
            date_obtention
          `)
          .eq('id_utilisateur', user.id_utilisateur);
        
        if (badgesError) throw badgesError;
        
        const badges = badgesData.map(item => ({
          ...item.badge,
          date_obtention: item.date_obtention
        }));
        
        // Récupérer les tests de l'utilisateur
        const { data: testsData, error: testsError } = await supabase
          .from('passer')
          .select('id_passer, note, date, id_questionnaire')
          .eq('id_utilisateur', user.id_utilisateur);
        
        if (testsError) throw testsError;
        
        // Enrichir les tests avec les noms des questionnaires
        const tests = await enrichTestsWithQuestionnaireNames(testsData);
        
        usersWithDetails.push({
          ...user,
          niveau,
          badges,
          tests,
          testsCount: tests.length
        });
      }
      
      users.value = usersWithDetails;
      filteredUsers.value = usersWithDetails;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
    }
  };
  
  // Enrichir les tests avec les noms des questionnaires
  const enrichTestsWithQuestionnaireNames = async (tests) => {
    if (!tests.length) return [];
    
    const questionnaireIds = tests.map(test => test.id_questionnaire);
    
    const { data: questionnairesData, error } = await supabase
      .from('questionnaire')
      .select('id_questionnaire, nom')
      .in('id_questionnaire', questionnaireIds);
    
    if (error) {
      console.error('Erreur lors de la récupération des noms de questionnaires:', error);
      return tests;
    }
    
    const questionnaireMap = {};
    questionnairesData.forEach(q => {
      questionnaireMap[q.id_questionnaire] = q.nom;
    });
    
    return tests.map(test => ({
      ...test,
      nom_questionnaire: questionnaireMap[test.id_questionnaire]
    }));
  };
  
  // Récupérer tous les niveaux
  const fetchNiveaux = async () => {
    try {
      const { data, error } = await supabase
        .from('niveau')
        .select('*')
        .order('points_min', { ascending: true });
      
      if (error) throw error;
      
      niveaux.value = data;
    } catch (error) {
      console.error('Erreur lors de la récupération des niveaux:', error);
    }
  };
  
  // Récupérer tous les badges
  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badge')
        .select('*');
      
      if (error) throw error;
      
      allBadges.value = data;
    } catch (error) {
      console.error('Erreur lors de la récupération des badges:', error);
    }
  };
  
  // Filtrer les utilisateurs selon la recherche
  const filterUsers = () => {
    if (!searchQuery.value) {
      filteredUsers.value = users.value;
      return;
    }
    
    const query = searchQuery.value.toLowerCase();
    filteredUsers.value = users.value.filter(user => 
      user.pseudo.toLowerCase().includes(query)
    );
  };
  
  // Obtenir le niveau d'un utilisateur en fonction de ses points
  const getUserLevel = (points) => {
    if (!niveaux.value.length) return 'Inconnu';
    
    let userLevel = niveaux.value[0].nom;
    
    for (const level of niveaux.value) {
      if (points >= level.points_min) {
        userLevel = level.nom;
      } else {
        break;
      }
    }
    
    return userLevel;
  };
  
  // Obtenir une couleur pour un niveau
  const getLevelColor = (levelName) => {
    switch(levelName) {
      case 'Débutant': return '#4caf50';
      case 'Apprenti': return '#2196f3';
      case 'Expert': return '#ff9800';
      case 'Maître': return '#9c27b0';
      default: return '#757575';
    }
  };
  
  // Obtenir l'icône du badge
  const getBadgeIcon = (badge) => {
    if (badge.icone) return badge.icone;
    
    // Icônes par défaut
    if (badge.nom === 'Premier test') return 'emoji_events';
    if (badge.nom === 'Maître du QCM') return 'military_tech';
    if (badge.nom === 'Performer') return 'workspace_premium';
    return 'star'; // Icône par défaut
  };
  
  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };
  
  // Calculer le score moyen
  const calculateAverageScore = (tests) => {
    if (!tests || tests.length === 0) return 0;
    
    const totalScore = tests.reduce((sum, test) => sum + parseFloat(test.note || 0), 0);
    return (totalScore / tests.length).toFixed(1);
  };
  
  // Badges disponibles pour attribution
  const availableBadges = computed(() => {
    if (!selectedUser.value) return [];
    
    // IDs des badges déjà attribués à l'utilisateur
    const userBadgeIds = selectedUser.value.badges.map(badge => badge.id_badge);
    
    // Renvoyer seulement les badges qui n'ont pas encore été attribués
    return allBadges.value.filter(badge => !userBadgeIds.includes(badge.id_badge));
  });
  
  // Voir les détails d'un utilisateur
  const viewUserDetails = (user) => {
    selectedUser.value = user;
  };
  
  // Fermer la modal de détails
  const closeModal = () => {
    selectedUser.value = null;
  };
  
  // Voir la correction d'un test
  const viewCorrection = (test) => {
    router.push(`/administrateur/correction/${test.id_questionnaire}/${selectedUser.value.id_utilisateur}`);
  };
  
  // Ouvrir la modal d'attribution de badge
  const addBadge = () => {
    selectedBadge.value = null;
    showBadgeModal.value = true;
  };
  
  // Attribuer un badge à l'utilisateur
  const assignBadge = async () => {
    if (!selectedBadge.value) return;
    
    try {
      const { error } = await supabase
        .from('utilisateur_badge')
        .insert({
          id_utilisateur: selectedUser.value.id_utilisateur,
          id_badge: selectedBadge.value,
          date_obtention: new Date().toISOString().split('T')[0]
        });
      
      if (error) throw error;
      
      // Ajouter le badge à la liste des badges de l'utilisateur
      const badgeToAdd = allBadges.value.find(badge => badge.id_badge === selectedBadge.value);
      
      if (badgeToAdd) {
        selectedUser.value.badges.push({
          ...badgeToAdd,
          date_obtention: new Date().toISOString().split('T')[0]
        });
      }
      
      showBadgeModal.value = false;
    } catch (error) {
      console.error('Erreur lors de l\'attribution du badge:', error);
    }
  };
  
  // Ouvrir la modal d'ajustement des points
  const adjustPoints = () => {
    pointsToAdd.value = 0;
    showPointsModal.value = true;
  };
  
  // Mettre à jour les points de l'utilisateur
  const updatePoints = async () => {
    try {
      const newPoints = selectedUser.value.points + pointsToAdd.value;
      
      const { error } = await supabase
        .from('utilisateur')
        .update({ points: newPoints })
        .eq('id_utilisateur', selectedUser.value.id_utilisateur);
      
      if (error) throw error;
      
      // Mettre à jour l'interface
      selectedUser.value.points = newPoints;
      selectedUser.value.niveau = getUserLevel(newPoints);
      
      // Mettre à jour les données dans la liste des utilisateurs
      const userIndex = users.value.findIndex(u => u.id_utilisateur === selectedUser.value.id_utilisateur);
      if (userIndex !== -1) {
        users.value[userIndex].points = newPoints;
        users.value[userIndex].niveau = selectedUser.value.niveau;
      }
      
      showPointsModal.value = false;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des points:', error);
    }
  };
  
  // Ouvrir la modal de réinitialisation
  const resetProgress = () => {
    showResetModal.value = true;
  };
  
  // Confirmer la réinitialisation de la progression
  const confirmReset = async () => {
    try {
      // Réinitialiser les points
      const { error: pointsError } = await supabase
        .from('utilisateur')
        .update({ points: 0 })
        .eq('id_utilisateur', selectedUser.value.id_utilisateur);
      
      if (pointsError) throw pointsError;
      
      // Supprimer tous les badges
      const { error: badgesError } = await supabase
        .from('utilisateur_badge')
        .delete()
        .eq('id_utilisateur', selectedUser.value.id_utilisateur);
      
      if (badgesError) throw badgesError;
      
      // Mettre à jour l'interface
      selectedUser.value.points = 0;
      selectedUser.value.niveau = getUserLevel(0);
      selectedUser.value.badges = [];
      
      // Mettre à jour les données dans la liste des utilisateurs
      const userIndex = users.value.findIndex(u => u.id_utilisateur === selectedUser.value.id_utilisateur);
      if (userIndex !== -1) {
        users.value[userIndex].points = 0;
        users.value[userIndex].niveau = selectedUser.value.niveau;
        users.value[userIndex].badges = [];
      }
      
      showResetModal.value = false;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation de la progression:', error);
    }
  };
  
  onMounted(() => {
    fetchNiveaux();
    fetchBadges();
    fetchUsers();
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
  
  .search-section {
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
    max-height: 600px;
    overflow-y: auto;
    border: 1px solid #eee;
    border-radius: 5px;
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .data-table th, .data-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  
  .data-table th {
    background-color: #f5f5f5;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  
  .data-table tr:hover {
    background-color: #f9f9f9;
  }
  
  .level-badge {
    display: inline-block;
    padding: 5px 10px;
    border-radius: 20px;
    color: white;
    font-size: 0.9rem;
  }
  
  .badges-preview {
    display: flex;
    align-items: center;
  }
  
  .badge-icons {
    display: flex;
    align-items: center;
  }
  
  .badge-icon-small {
    font-size: 20px;
    margin-right: 5px;
    color: #6e8efb;
  }
  
  .more-badges {
    font-size: 0.8rem;
    color: #777;
    margin-left: 5px;
  }
  
  .view-btn {
    background-color: #6e8efb;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .view-btn:hover {
    background-color: #5a75d6;
  }
  
  .user-details-modal, .badge-modal, .points-modal, .reset-modal {
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
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    width: 900px;
    max-width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .badge-modal-content, .points-modal-content, .reset-modal-content {
    width: 500px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
  }
  
  .modal-header h2 {
    margin: 0;
    color: #333;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #777;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .detail-section {
    margin-bottom: 30px;
  }
  
  .detail-section h3 {
    margin-top: 0;
    color: #333;
    font-size: 1.2rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }
  
  .info-item {
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s;
  }
  
  .info-item:hover {
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);      
  }
</style>