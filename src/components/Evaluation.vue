<template>
    <div class="evaluation">
        <div class="header">
            <h1>Évaluation</h1>
            <div class="user-info">
                <span>{{ username }}</span>
                <button class="logout-button" @click="logout">Déconnexion</button>
            </div>
        </div>

        <div class="timer">{{ formatTime() }}</div>

        <div class="questionnaire-content">
            <div v-if="loading" class="loading">
                <div class="spinner"></div>
                <p>Chargement du questionnaire...</p>
            </div>
            
            <div v-else-if="questions.length > 0" class="question-section">
                <div class="question-number">Question N°{{ currentQuestion + 1 }}</div>
                <div class="question">{{ questions[currentQuestion]?.titre }}</div>
                <div class="answers">
                    <button
                        v-for="(answer, index) in answers[currentQuestion]"
                        :key="answer.id_reponse"
                        :class="{ selected: selectedAnswers[currentQuestion]?.id_reponse === answer.id_reponse }"
                        @click="selectAnswer(answer)"
                    >
                        {{ answer.titre }}
                    </button>
                </div>
            </div>

            <div v-else class="no-questions">
                Aucune question disponible pour ce questionnaire.
            </div>

            <div class="navigation" v-if="questions.length > 0">
                <button class="btn prev" @click="prevQuestion" :disabled="currentQuestion === 0">Précédente</button>
                <button class="btn next" @click="submitQuestion">
                    {{ currentQuestion < questions.length - 1 ? 'Suivante' : 'Finir le questionnaire' }}
                </button>
            </div>
        </div>

        <div class="footer" v-if="questions.length > 0">
            <span>Question : {{ currentQuestion + 1 }}/{{ questions.length }}</span>
            <span class="progress-indicator">
                <div class="progress-bar">
                    <div class="progress" :style="{ width: `${(currentQuestion + 1) / questions.length * 100}%` }"></div>
                </div>
            </span>
        </div>
        
        <!-- Modal de confirmation de fin -->
        <div v-if="showConfirmation" class="confirmation-modal">
            <div class="confirmation-content">
                <h3>Terminer le questionnaire ?</h3>
                <p>Voulez-vous vraiment terminer ce questionnaire ? Cette action est irréversible.</p>
                <div class="confirmation-buttons">
                    <button @click="finishQuestionnaire" class="confirm-btn">Terminer</button>
                    <button @click="showConfirmation = false" class="cancel-btn">Annuler</button>
                </div>
            </div>
        </div>
        
        <!-- Modal de progression des réponses -->
        <div v-if="showProgressModal" class="progress-modal">
            <div class="progress-content">
                <h3>Enregistrement en cours...</h3>
                <div class="progress-container">
                    <div class="progress-text">{{ progressMessage }}</div>
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from 'vue-router';
import { supabase } from "../supabase";
import { useAuthStore } from '@/store/authStore';

const props = defineProps({
    userId: { type: String, default: null },
    questionnaire: { type: Object, required: true },
    username: { type: String, required: true }
});

const router = useRouter();
const authStore = useAuthStore();
const currentQuestion = ref(0);
const timer = ref(0);
const timerInterval = ref(null);
const questions = ref([]);
const answers = ref([]);
const selectedAnswers = ref([]);
const loading = ref(true);
const showConfirmation = ref(false);
const showProgressModal = ref(false);
const progressMessage = ref("");
const userId = ref(null);

// Calcul du temps restant en format lisible
const timeLeft = computed(() => {
    const minutes = Math.floor(timer.value / 60);
    const seconds = timer.value % 60;
    return { minutes, seconds };
});

onMounted(async () => {
    try {
        loading.value = true;
        
        // Récupérer l'ID utilisateur en fonction du nom d'utilisateur
        const { data: userData, error: userError } = await supabase
            .from('utilisateur')
            .select('id_utilisateur')
            .eq('pseudo', props.username)
            .single();

        if (userError) {
            throw new Error(userError.message);
        }

        userId.value = userData.id_utilisateur;
        console.log("ID utilisateur récupéré:", userId.value);

        // Initialiser le timer avec le temps de passage du questionnaire
        timer.value = props.questionnaire.temps_de_passage * 60;

        // Récupérer les questions liées au questionnaire
        const { data: questionIdsData, error: questionIdsError } = await supabase
            .from('contenir')
            .select('id_question')
            .eq('id_questionnaire', props.questionnaire.id_questionnaire);

        if (questionIdsError) {
            throw new Error(questionIdsError.message);
        }

        if (!questionIdsData || questionIdsData.length === 0) {
            console.log("Aucune question trouvée pour ce questionnaire");
            loading.value = false;
            return;
        }

        const questionIds = questionIdsData.map(q => q.id_question);
        console.log("IDs des questions récupérés:", questionIds);

        const { data: questionsData, error: questionsError } = await supabase
            .from('question')
            .select('*')
            .in('id_question', questionIds);

        if (questionsError) {
            throw new Error(questionsError.message);
        }

        questions.value = questionsData;
        console.log("Questions récupérées:", questions.value);

        // Récupérer les réponses pour chaque question
        for (const question of questionsData) {
            const { data: answersData, error: answersError } = await supabase
                .from("reponse")
                .select("*")
                .eq("id_question", question.id_question);

            if (answersError) {
                console.error("Erreur lors de la récupération des réponses:", answersError);
                continue;
            }

            answers.value.push(answersData);
            selectedAnswers.value.push(null);
        }

        startTimer();
        loading.value = false;
    } catch (error) {
        console.error("Erreur lors de l'initialisation :", error);
        loading.value = false;
    }
});

onUnmounted(() => {
    clearInterval(timerInterval.value);
});

const startTimer = () => {
    timerInterval.value = setInterval(() => {
        if (timer.value > 0) {
            timer.value--;
        } else {
            clearInterval(timerInterval.value);
            // Logique pour terminer le questionnaire lorsque le temps est écoulé
            finishQuestionnaire(true);
        }
    }, 1000);
};

const formatTime = () => {
    const minutes = timeLeft.value.minutes;
    const seconds = timeLeft.value.seconds;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const selectAnswer = (answer) => {
    selectedAnswers.value[currentQuestion.value] = answer;
};

const prevQuestion = () => {
    if (currentQuestion.value > 0) {
        currentQuestion.value--;
    }
};

const submitQuestion = () => {
    if (currentQuestion.value < questions.value.length - 1) {
        currentQuestion.value++;
    } else {
        // Demande de confirmation avant de finir le questionnaire
        showConfirmation.value = true;
    }
};

const finishQuestionnaire = async (isTimeout = false) => {
    showConfirmation.value = false;
    showProgressModal.value = true;
    progressMessage.value = "Enregistrement de vos réponses...";
    
    try {
        // Enregistrer les réponses dans la table reponse_utilisateur
        progressMessage.value = "Enregistrement des réponses...";
        
        console.log("Enregistrement des réponses de l'utilisateur", userId.value);
        console.log("Réponses sélectionnées:", selectedAnswers.value);
        
        // Supprimer d'abord toutes les réponses existantes de l'utilisateur pour ce questionnaire
        const { error: deleteError } = await supabase
            .from('reponse_utilisateur')
            .delete()
            .eq('id_utilisateur', userId.value)
            .eq('id_questionnaire', props.questionnaire.id_questionnaire);
            
        if (deleteError) {
            console.error("Erreur lors de la suppression des réponses existantes:", deleteError);
        }
        
        // Enregistrer chaque réponse de l'utilisateur
        for (let i = 0; i < selectedAnswers.value.length; i++) {
            if (selectedAnswers.value[i]) {
                const questionId = questions.value[i].id_question;
                const responseId = selectedAnswers.value[i].id_reponse;
                
                console.log(`Enregistrement: Question ${questionId}, Réponse ${responseId}`);
                
                const { error: responseError } = await supabase
                    .from('reponse_utilisateur')
                    .insert({
                        id_utilisateur: userId.value,
                        id_question: questionId,
                        id_reponse: responseId,
                        id_questionnaire: props.questionnaire.id_questionnaire
                    });

                if (responseError) {
                    console.error(`Erreur lors de l'enregistrement de la réponse pour la question ${i+1}:`, responseError);
                }
            }
        }
        
        // Calculer le score et enregistrer le résultat
        progressMessage.value = "Calcul de votre score...";
        
        const result = await saveResults();
        
        if (result.success) {
            progressMessage.value = `Félicitations! Votre score: ${result.note}/20`;
            
            // Attendre 2 secondes avant de rediriger
            setTimeout(() => {
                showProgressModal.value = false;
                if (isTimeout) {
                    alert("Le temps est écoulé! Votre questionnaire a été automatiquement terminé.");
                } else {
                    alert("Le questionnaire est bien terminé");
                }
                router.push('/collaborateur');
            }, 2000);
        } else {
            throw new Error("Échec de l'enregistrement des résultats");
        }
    } catch (error) {
        console.error("Erreur lors de la finalisation du questionnaire:", error);
        progressMessage.value = "Une erreur est survenue. Veuillez réessayer.";
        
        setTimeout(() => {
            showProgressModal.value = false;
            alert("Une erreur est survenue lors de l'enregistrement de vos résultats.");
        }, 2000);
    }
};

const saveResults = async () => {
    try {
        // Vérifier d'abord si l'utilisateur a répondu à toutes les questions
        const unansweredQuestions = selectedAnswers.value.filter(answer => answer === null).length;
        
        // Calculer le score basé sur les réponses correctes
        const score = selectedAnswers.value.reduce((total, answer, index) => {
            if (answer && answer.etre_bonne_reponse) {
                return total + questions.value[index].points;
            }
            return total;
        }, 0);

        // Calculer la note sur 20
        const totalPossiblePoints = questions.value.reduce((total, q) => total + q.points, 0);
        const scoreOn20 = totalPossiblePoints > 0 ? (score / totalPossiblePoints) * 20 : 0;

        // Vérifier s'il existe déjà un enregistrement pour cet utilisateur et ce questionnaire
        const { data: existingRecord, error: existingError } = await supabase
            .from('passer')
            .select('id_passer')
            .eq('id_utilisateur', userId.value)
            .eq('id_questionnaire', props.questionnaire.id_questionnaire);
            
        if (existingError) {
            console.error("Erreur lors de la vérification des enregistrements existants:", existingError);
        }
        
        // Si un enregistrement existe, le mettre à jour, sinon en créer un nouveau
        let result;
        
        if (existingRecord && existingRecord.length > 0) {
            const { data, error } = await supabase
                .from('passer')
                .update({
                    note: scoreOn20.toFixed(2),
                    date: new Date().toISOString().split('T')[0]
                })
                .eq('id_utilisateur', userId.value)
                .eq('id_questionnaire', props.questionnaire.id_questionnaire)
                .select();
                
            if (error) throw new Error(error.message);
            result = data;
        } else {
            const { data, error } = await supabase
                .from('passer')
                .insert({
                    id_utilisateur: userId.value,
                    id_questionnaire: props.questionnaire.id_questionnaire,
                    note: scoreOn20.toFixed(2),
                    date: new Date().toISOString().split('T')[0]
                })
                .select();

            if (error) throw new Error(error.message);
            result = data;
        }
        
        // Mettre à jour les points de l'utilisateur
        await updateUserPoints(score);

        // Retourner le résultat pour permettre l'ajout de badges ou autres fonctionnalités
        return {
            success: true,
            note: scoreOn20.toFixed(2),
            questionnaire: props.questionnaire
        };
    } catch (error) {
        console.error("Erreur lors de la sauvegarde des résultats:", error);
        return { success: false, error };
    }
};

// Mettre à jour les points de l'utilisateur
const updateUserPoints = async (earnedPoints) => {
    try {
        // Récupérer les points actuels de l'utilisateur
        const { data, error } = await supabase
            .from('utilisateur')
            .select('points')
            .eq('id_utilisateur', userId.value)
            .single();
            
        if (error) throw error;
        
        const currentPoints = data.points || 0;
        const newPoints = currentPoints + earnedPoints;
        
        // Mettre à jour les points
        const { error: updateError } = await supabase
            .from('utilisateur')
            .update({ points: newPoints })
            .eq('id_utilisateur', userId.value);
            
        if (updateError) throw updateError;
        
        // Vérifier si l'utilisateur peut obtenir de nouveaux badges
        await checkForBadges(earnedPoints);
        
        return true;
    } catch (error) {
        console.error("Erreur lors de la mise à jour des points:", error);
        return false;
    }
};

// Vérifier si l'utilisateur peut obtenir de nouveaux badges
const checkForBadges = async (earnedPoints) => {
    try {
        // Vérifier le badge "Premier test"
        const { data: firstTestBadge } = await supabase
            .from('badge')
            .select('id_badge')
            .eq('nom', 'Premier test')
            .single();
            
        if (firstTestBadge) {
            // Vérifier si l'utilisateur a déjà ce badge
            const { data: hasFirstTestBadge, error } = await supabase
                .from('utilisateur_badge')
                .select('id_utilisateur_badge')
                .eq('id_utilisateur', userId.value)
                .eq('id_badge', firstTestBadge.id_badge);
                
            if (error) throw error;
            
            // S'il n'a pas encore ce badge, le lui attribuer
            if (!hasFirstTestBadge || hasFirstTestBadge.length === 0) {
                await supabase
                    .from('utilisateur_badge')
                    .insert({
                        id_utilisateur: userId.value,
                        id_badge: firstTestBadge.id_badge,
                        date_obtention: new Date().toISOString().split('T')[0]
                    });
            }
        }
        
        // Vérifier le badge "Maître du QCM" (score parfait)
        if (earnedPoints === questions.value.reduce((total, q) => total + q.points, 0)) {
            const { data: perfectBadge } = await supabase
                .from('badge')
                .select('id_badge')
                .eq('nom', 'Maître du QCM')
                .single();
                
            if (perfectBadge) {
                // Vérifier si l'utilisateur a déjà ce badge
                const { data: hasPerfectBadge, error } = await supabase
                    .from('utilisateur_badge')
                    .select('id_utilisateur_badge')
                    .eq('id_utilisateur', userId.value)
                    .eq('id_badge', perfectBadge.id_badge);
                    
                if (error) throw error;
                
                // S'il n'a pas encore ce badge, le lui attribuer
                if (!hasPerfectBadge || hasPerfectBadge.length === 0) {
                    await supabase
                        .from('utilisateur_badge')
                        .insert({
                            id_utilisateur: userId.value,
                            id_badge: perfectBadge.id_badge,
                            date_obtention: new Date().toISOString().split('T')[0]
                        });
                }
            }
        }
        
        // Vérifier le badge "Performer" (3 tests avec plus de 15/20)
        const { data: testsData, error: testsError } = await supabase
            .from('passer')
            .select('note')
            .eq('id_utilisateur', userId.value)
            .gte('note', 15);
            
        if (testsError) throw testsError;
        
        if (testsData && testsData.length >= 3) {
            const { data: performerBadge } = await supabase
                .from('badge')
                .select('id_badge')
                .eq('nom', 'Performer')
                .single();
                
            if (performerBadge) {
                // Vérifier si l'utilisateur a déjà ce badge
                const { data: hasPerformerBadge, error } = await supabase
                    .from('utilisateur_badge')
                    .select('id_utilisateur_badge')
                    .eq('id_utilisateur', userId.value)
                    .eq('id_badge', performerBadge.id_badge);
                    
                if (error) throw error;
                
                // S'il n'a pas encore ce badge, le lui attribuer
                if (!hasPerformerBadge || hasPerformerBadge.length === 0) {
                    await supabase
                        .from('utilisateur_badge')
                        .insert({
                            id_utilisateur: userId.value,
                            id_badge: performerBadge.id_badge,
                            date_obtention: new Date().toISOString().split('T')[0]
                        });
                }
            }
        }
    } catch (error) {
        console.error("Erreur lors de la vérification des badges:", error);
    }
};

const logout = async () => {
    await authStore.logout();
    router.push({ name: 'Home' });
};
</script>

<style scoped>
.evaluation {
    font-family: Arial, sans-serif;
    color: #333;
    padding: 20px;
    max-width: 800px;
    margin: auto;
    position: relative;
}

.header {
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    width: 98%;
    padding: 20px;
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
}

.header h1 {
    margin: 0;
    color: white;
    font-size: 2rem;
    flex-grow: 1;
    text-align: center;
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
    transition: background-color 0.3s;
}

.logout-button:hover {
    background-color: #c0392b;
}

.timer {
    font-size: 1.5rem;
    margin: 80px 0 20px;
    text-align: center;
    color: #e74c3c;
    font-weight: bold;
    padding: 10px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.questionnaire-content {
    margin-top: 20px;
    background-color: #f5f5f5;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    min-height: 400px;
    display: flex;
    flex-direction: column;
}

.question-section {
    margin: 20px 0;
    flex-grow: 1;
}

.question-number {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 15px;
    color: #6e8efb;
}

.question {
    font-size: 1.4rem;
    margin-bottom: 25px;
    line-height: 1.5;
}

.answers {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.answers button {
    background-color: white;
    border: 1px solid #d9d9d9;
    padding: 15px;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    text-align: left;
    transition: all 0.3s ease;
}

.answers button:hover {
    background-color: #f0f0f0;
    border-color: #aaa;
}

.answers button.selected {
    background-color: #a983db;
    color: white;
    border-color: #8e69c2;
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
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    transition: opacity 0.3s;
}

.navigation .btn:hover {
    opacity: 0.9;
}

.navigation .btn:disabled {
    background: #cccccc;
    cursor: not-allowed;
}

.footer {
    text-align: center;
    margin-top: 20px;
    padding: 15px;
    font-size: 1rem;
    color: #666;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.progress-indicator {
    width: 100%;
    margin-top: 10px;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
}

.progress {
    height: 100%;
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    transition: width 0.3s ease;
}

.loading, .no-questions {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    font-size: 1.2rem;
    color: #666;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #6e8efb;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.confirmation-modal, .progress-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.confirmation-content, .progress-content {
    background-color: white;
    padding: 30px;
    border-radius: 8px;
    width: 400px;
    max-width: 90%;
    text-align: center;
}

.confirmation-content h3, .progress-content h3 {
    margin-top: 0;
    color: #333;
}

.confirmation-buttons {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 25px;
}

.confirm-btn {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
}

.cancel-btn {
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
}

.progress-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 20px;
}

.progress-text {
    margin-bottom: 20px;
    font-size: 1.1rem;
}
</style>