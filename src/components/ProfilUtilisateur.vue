<template>
    <div class="profil-container">
      <div class="profil-header">
        <h2>Profil de {{ username }}</h2>
      </div>
      
      <div class="profil-content">
        <div class="niveau-section">
          <h3>Niveau: {{ niveau ? niveau.nom : 'Chargement...' }}</h3>
          <div class="progress-bar">
            <div 
              class="progress" 
              :style="{ width: progressPercent + '%' }"
              :title="`${userPoints}/${prochainNiveau ? prochainNiveau.points_min : '∞'} points`"
            ></div>
          </div>
          <p class="points-info">{{ userPoints }} points {{ prochainNiveau ? '/ ' + prochainNiveau.points_min + ' pour le niveau suivant' : '(niveau max atteint)' }}</p>
        </div>
        
        <div class="badges-section">
          <h3>Badges</h3>
          <div class="badges-container">
            <div v-if="userBadges.length === 0" class="no-badges">
              Aucun badge obtenu pour le moment
            </div>
            <div v-for="badge in userBadges" :key="badge.id_badge" class="badge-item">
              <div class="badge-icon">
                <span class="material-icons">{{ getBadgeIcon(badge) }}</span>
              </div>
              <div class="badge-info">
                <h4>{{ badge.nom }}</h4>
                <p>{{ badge.description }}</p>
                <small>Obtenu le {{ formatDate(badge.date_obtention) }}</small>
              </div>
            </div>
          </div>
        </div>
        
        <div class="classement-section">
          <h3>Classement</h3>
          <div v-if="classement.length > 0" class="ranking-list">
            <div v-for="(user, index) in classement" :key="user.id_utilisateur" 
                 class="ranking-item" 
                 :class="{ 'current-user': user.pseudo === username }">
              <div class="rank">{{ index + 1 }}</div>
              <div class="user-name">{{ user.pseudo }}</div>
              <div class="user-points">{{ user.points }} pts</div>
            </div>
          </div>
          <div v-else class="no-ranking">
            Chargement du classement...
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { supabase } from '../supabase';
  import { useAuthStore } from '@/store/authStore';
  
  const props = defineProps({
    username: {
      type: String,
      required: true
    }
  });
  
  const authStore = useAuthStore();
  const userPoints = ref(0);
  const niveau = ref(null);
  const prochainNiveau = ref(null);
  const userBadges = ref([]);
  const classement = ref([]);
  const niveaux = ref([]);
  
  // Calculer le pourcentage de progression vers le niveau suivant
  const progressPercent = computed(() => {
    if (!niveau.value || !prochainNiveau.value) return 100;
    
    const currentMin = niveau.value.points_min;
    const nextMin = prochainNiveau.value.points_min;
    const range = nextMin - currentMin;
    
    if (range <= 0) return 100;
    
    const progress = userPoints.value - currentMin;
    return Math.min(Math.floor((progress / range) * 100), 100);
  });
  
  // Récupérer les informations de l'utilisateur
  const fetchUserInfo = async () => {
    try {
      // Récupération de l'ID utilisateur
      const { data: userData, error: userError } = await supabase
        .from('utilisateur')
        .select('id_utilisateur, points')
        .eq('pseudo', props.username)
        .single();
      
      if (userError) throw userError;
      
      userPoints.value = userData.points || 0;
      
      // Déterminer le niveau actuel
      determineUserLevel();
      
      // Récupérer les badges de l'utilisateur
      await fetchUserBadges(userData.id_utilisateur);
    } catch (error) {
      console.error('Erreur lors de la récupération des informations utilisateur:', error);
    }
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
      determineUserLevel();
    } catch (error) {
      console.error('Erreur lors de la récupération des niveaux:', error);
    }
  };
  
  // Déterminer le niveau actuel de l'utilisateur
  const determineUserLevel = () => {
    if (niveaux.value.length === 0 || userPoints.value === undefined) return;
    
    let currentLevel = null;
    let nextLevel = null;
    
    for (let i = 0; i < niveaux.value.length; i++) {
      if (userPoints.value >= niveaux.value[i].points_min) {
        currentLevel = niveaux.value[i];
        nextLevel = niveaux.value[i + 1] || null;
      } else {
        break;
      }
    }
    
    niveau.value = currentLevel;
    prochainNiveau.value = nextLevel;
  };
  
  // Récupérer les badges de l'utilisateur
  const fetchUserBadges = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('utilisateur_badge')
        .select(`
          date_obtention,
          badge (
            id_badge,
            nom,
            description,
            icone
          )
        `)
        .eq('id_utilisateur', userId);
      
      if (error) throw error;
      
      userBadges.value = data.map(item => ({
        ...item.badge,
        date_obtention: item.date_obtention
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des badges:', error);
    }
  };
  
  // Récupérer le classement des utilisateurs
  const fetchClassement = async () => {
    try {
      const { data, error } = await supabase
        .from('utilisateur')
        .select('id_utilisateur, pseudo, points')
        .order('points', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      classement.value = data;
    } catch (error) {
      console.error('Erreur lors de la récupération du classement:', error);
    }
  };
  
  // Obtenir l'icône du badge (utilise des icônes génériques si le chemin d'icône n'est pas disponible)
  const getBadgeIcon = (badge) => {
    if (badge.nom === 'Premier test') return 'emoji_events';
    if (badge.nom === 'Maître du QCM') return 'military_tech';
    if (badge.nom === 'Performer') return 'workspace_premium';
    return 'star'; // Icône par défaut
  };
  
  // Formater la date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };
  
  onMounted(() => {
    fetchNiveaux();
    fetchUserInfo();
    fetchClassement();
  });
  </script>
  
  <style scoped>
  .profil-container {
    background-color: #f5f5f5;
    border-radius: 10px;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .profil-header {
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ddd;
  }
  
  .niveau-section {
    margin-bottom: 30px;
  }
  
  .progress-bar {
    height: 20px;
    background-color: #e0e0e0;
    border-radius: 10px;
    margin: 10px 0;
    overflow: hidden;
  }
  
  .progress {
    height: 100%;
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    border-radius: 10px;
    transition: width 0.5s ease;
  }
  
  .points-info {
    font-size: 14px;
    color: #777;
  }
  
  .badges-section {
    margin-bottom: 30px;
  }
  
  .badges-container {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
  }
  
  .badge-item {
    display: flex;
    background-color: white;
    border-radius: 8px;
    padding: 10px;
    width: calc(50% - 15px);
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  }
  
  .badge-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    border-radius: 50%;
    margin-right: 15px;
    color: white;
  }
  
  .badge-icon .material-icons {
    font-size: 30px;
  }
  
  .badge-info h4 {
    margin: 0 0 5px 0;
    color: #333;
  }
  
  .badge-info p {
    margin: 0 0 5px 0;
    font-size: 14px;
    color: #666;
  }
  
  .badge-info small {
    color: #999;
    font-size: 12px;
  }
  
  .no-badges {
    color: #999;
    font-style: italic;
    padding: 10px;
  }
  
  .classement-section {
    background-color: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  }
  
  .ranking-list {
    margin-top: 10px;
  }
  
  .ranking-item {
    display: flex;
    padding: 10px;
    border-bottom: 1px solid #eee;
  }
  
  .ranking-item:last-child {
    border-bottom: none;
  }
  
  .ranking-item.current-user {
    background-color: rgba(110, 142, 251, 0.1);
    font-weight: bold;
  }
  
  .rank {
    width: 30px;
    font-weight: bold;
  }
  
  .user-name {
    flex-grow: 1;
  }
  
  .user-points {
    font-weight: bold;
    color: #6e8efb;
  }
  
  .no-ranking {
    color: #999;
    font-style: italic;
    padding: 10px;
  }
  
  @media (max-width: 768px) {
    .badge-item {
      width: 100%;
    }
  }
  </style>