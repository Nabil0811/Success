<template>
  <div class="correction">
    <div class="header">
      <h1>Correction</h1>
      <div class="user-info">
        <span>{{ props.username }}</span>
        <button @click="goBack">Retour</button>
      </div>
    </div>
    
    <div class="questionnaire-content" v-if="!loading">
      <h2>QUESTION n°{{ currentQuestion + 1 }}</h2>

      <div class="question-section" v-if="questions.length > 0">
        <div class="question">{{ questions[currentQuestion]?.titre }}</div>
        <div class="answers">
          <div
            v-for="(answer, index) in answers[currentQuestion]"
            :key="index"
            :class="{
              'correct-answer': answer.etre_bonne_reponse,
              'incorrect-answer': isSelectedButIncorrect(answer, currentQuestion),
              'user-selected': isUserSelected(answer, currentQuestion)
            }"
          >
            {{ answer.titre }}
            <div class="answer-indicators">
              <span v-if="answer.etre_bonne_reponse" class="correct-indicator">✓ Bonne réponse</span>
              <span v-if="isUserSelected(answer, currentQuestion)" class="user-choice-indicator">
                {{ answer.etre_bonne_reponse ? '✓ Choix correct' : '✗ Choix incorrect' }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="!userAnswersMap[questions[currentQuestion]?.id_question]" class="no-answer-warning">
          Aucune réponse fournie pour cette question
        </div>
      </div>
      
      <div v-else class="loading-message">
        Chargement des questions...
      </div>

      <div class="question-info" v-if="questions.length > 0">
        <div class="points-info">
          Points pour cette question: <span>{{ questions[currentQuestion]?.points || 0 }}</span>
        </div>
        <div class="result-info" v-if="userAnswersMap[questions[currentQuestion]?.id_question]">
          {{ getUserAnswerForQuestion(currentQuestion)?.etre_bonne_reponse ? 'Réponse correcte! +' + (questions[currentQuestion]?.points || 0) + ' points' : 'Réponse incorrecte! +0 point' }}
        </div>
        <div class="result-info no-answer" v-else>
          Question sans réponse! +0 point
        </div>
      </div>

      <div class="navigation">
        <button class="btn back" @click="prevQuestion" :disabled="currentQuestion === 0">← Précédente</button>
        <button class="btn next" @click="nextQuestion" :disabled="currentQuestion === questions.length - 1">Suivante →</button>
      </div>
      
      <div class="progress-indicator">
        <div class="progress-text">Question {{ currentQuestion + 1 }} sur {{ questions.length }}</div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: `${(currentQuestion + 1) / questions.length * 100}%` }"></div>
        </div>
      </div>
    </div>
    
    <div v-else class="loading">
      <div class="spinner"></div>
      <p>Chargement de la correction...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watchEffect } from 'vue';
import { supabase } from '../supabase';
import { useRoute } from 'vue-router';

const route = useRoute();
const props = defineProps({
  username: {
    type: String,
    required: true
  },
  idQuestionnaire: {
    type: [String, Number],
    required: true
  },
  idUtilisateur: {
    type: [String, Number],
    required: true
  }
});

const currentQuestion = ref(0);
const questions = ref([]);
const answers = ref([]);
const userAnswersMap = ref({});
const loading = ref(true);

const fetchCorrection = async () => {
  try {
    loading.value = true;
    
    console.log("Récupération des données pour ID questionnaire:", props.idQuestionnaire);
    console.log("Récupération des données pour ID utilisateur:", props.idUtilisateur);
    
    // Récupérer les questions liées au questionnaire
    const { data: contientData, error: contientError } = await supabase
      .from('contenir')
      .select('id_question')
      .eq('id_questionnaire', props.idQuestionnaire);

    if (contientError) {
      console.error("Erreur lors de la récupération des questions du questionnaire:", contientError);
      throw contientError;
    }
    
    if (!contientData || contientData.length === 0) {
      console.log("Aucune question trouvée pour ce questionnaire");
      loading.value = false;
      return;
    }
    
    const questionIds = contientData.map(q => q.id_question);
    
    // Récupérer les détails des questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('question')
      .select('*')
      .in('id_question', questionIds);

    if (questionsError) {
      console.error("Erreur lors de la récupération des détails des questions:", questionsError);
      throw questionsError;
    }
    
    questions.value = questionsData;
    answers.value = [];
    
    // Récupérer toutes les réponses de l'utilisateur en une seule requête
    const { data: userResponsesData, error: userResponsesError } = await supabase
      .from('reponse_utilisateur')
      .select('id_question, id_reponse')
      .eq('id_utilisateur', props.idUtilisateur);

    if (userResponsesError) {
      console.error("Erreur lors de la récupération des réponses de l'utilisateur:", userResponsesError);
    }
    
    // Créer une map des réponses de l'utilisateur par question
    const userResponsesMap = {};
    if (userResponsesData) {
      userResponsesData.forEach(response => {
        userResponsesMap[response.id_question] = response.id_reponse;
      });
    }
    
    userAnswersMap.value = userResponsesMap;
    console.log("Réponses de l'utilisateur:", userResponsesMap);
    
    // Pour chaque question, récupérer les réponses possibles
    for (const question of questionsData) {
      // Récupérer toutes les réponses possibles pour cette question
      const { data: answersData, error: answersError } = await supabase
        .from('reponse')
        .select('*')
        .eq('id_question', question.id_question);

      if (answersError) {
        console.error("Erreur lors de la récupération des réponses:", answersError);
        throw answersError;
      }
      
      answers.value.push(answersData);
      console.log(`Réponses pour la question ${question.id_question}:`, answersData);
    }
    
    loading.value = false;
  } catch (error) {
    console.error("Erreur lors de la récupération des corrections:", error);
    loading.value = false;
  }
};

// Obtenir la réponse de l'utilisateur pour une question donnée
const getUserAnswerForQuestion = (questionIndex) => {
  const question = questions.value[questionIndex];
  if (!question) return null;
  
  const questionId = question.id_question;
  const userResponseId = userAnswersMap.value[questionId];
  
  if (!userResponseId) return null;
  
  const questionAnswers = answers.value[questionIndex];
  return questionAnswers.find(answer => answer.id_reponse === userResponseId);
};

// Vérifie si une réponse a été sélectionnée par l'utilisateur
const isUserSelected = (answer, questionIndex) => {
  const question = questions.value[questionIndex];
  if (!question) return false;
  
  const userResponseId = userAnswersMap.value[question.id_question];
  return userResponseId === answer.id_reponse;
};

// Vérifie si une réponse est incorrecte ET a été sélectionnée par l'utilisateur
const isSelectedButIncorrect = (answer, questionIndex) => {
  return isUserSelected(answer, questionIndex) && !answer.etre_bonne_reponse;
};

const prevQuestion = () => {
  if (currentQuestion.value > 0) {
    currentQuestion.value--;
  }
};

const nextQuestion = () => {
  if (currentQuestion.value < questions.value.length - 1) {
    currentQuestion.value++;
  }
};

const goBack = () => {
  window.history.back();
};

onMounted(() => {
  fetchCorrection();
});

watchEffect(() => {
  if (route.params.idQuestionnaire && route.params.idQuestionnaire !== props.idQuestionnaire) {
    fetchCorrection();
  }
});
</script>

<style scoped>
.correction {
  font-family: Arial, sans-serif;
  color: #333;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border-radius: 10px;
  width: 100%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
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

button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #c0392b;
}

.questionnaire-content {
  background-color: #f8f9fa;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #6e8efb;
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
}

.question-section {
  margin: 20px 0 30px;
}

.question {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 20px;
  line-height: 1.5;
}

.answers {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.answers div {
  padding: 15px 20px;
  border-radius: 8px;
  font-size: 1.1rem;
  background-color: #fff;
  border: 2px solid #e9ecef;
  position: relative;
  transition: all 0.3s ease;
}

.answers div:hover {
  transform: translateX(5px);
}

.correct-answer {
  background-color: #d4edda !important;
  border-color: #c3e6cb !important;
  color: #155724 !important;
}

.incorrect-answer {
  background-color: #f8d7da !important;
  border-color: #f5c6cb !important;
  color: #721c24 !important;
}

.user-selected {
  border-left: 6px solid #6e8efb !important;
}

.answer-indicators {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.correct-indicator, .user-choice-indicator {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.9rem;
  margin-left: 10px;
  font-weight: bold;
}

.correct-indicator {
  background-color: #d4edda;
  color: #155724;
}

.user-choice-indicator {
  background-color: #6e8efb;
  color: white;
}

.no-answer-warning {
  margin-top: 20px;
  padding: 15px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  border-radius: 8px;
  font-weight: bold;
  text-align: center;
}

.question-info {
  margin: 20px 0;
  padding: 15px;
  background-color: #e9ecef;
  border-radius: 8px;
}

.points-info, .result-info {
  margin: 10px 0;
}

.points-info span {
  font-weight: bold;
  color: #6e8efb;
}

.result-info {
  font-weight: bold;
}

.result-info.no-answer {
  color: #856404;
}

.navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}

.navigation .btn {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.3s, box-shadow 0.3s;
}

.navigation .btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.navigation .btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.progress-indicator {
  margin-top: 30px;
}

.progress-text {
  text-align: center;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: #6c757d;
}

.progress-bar {
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  transition: width 0.3s ease;
}

.loading, .loading-message {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #6e8efb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>