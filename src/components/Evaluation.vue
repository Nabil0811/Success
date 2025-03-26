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
            <div class="question-section">
                <div class="question-number">Question N°{{ currentQuestion + 1 }}</div>
                <div class="question">{{ questions[currentQuestion]?.titre }}</div>
                <div class="answers">
                    <button
                        v-for="(answer, index) in answers[currentQuestion]"
                        :key="index"
                        :class="{ selected: selectedAnswers[currentQuestion] === answer }"
                        @click="selectAnswer(answer)"
                    >
                        {{ answer.titre }}
                    </button>
                </div>
            </div>

            <div class="navigation">
                <button class="btn next" @click="submitQuestion">
                    {{ currentQuestion < questions.length - 1 ? 'Suivante' : 'Finir le questionnaire' }}
                </button>
            </div>
        </div>

        <div class="footer">
            <span>Question : {{ currentQuestion + 1 }}/{{ questions.length }}</span>
        </div>
        <router-view></router-view>
    </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from 'vue-router';
import { supabase } from "../supabase";

export default {
    props: {
        userId: { type: String, required: true },
        questionnaire: { type: Object, required: true },
        username: { type: String, required: true }
    },
    setup(props) {
        const router = useRouter();
        const currentQuestion = ref(0);
        const timer = ref(0);
        const timerInterval = ref(null);
        const questions = ref([]);
        const answers = ref([]);
        const selectedAnswers = ref([]);
        const questionnaire = ref(props.questionnaire);

        onMounted(async () => {
            try {
                // Initialiser le timer avec le temps de passage du questionnaire
                timer.value = questionnaire.value.temps_de_passage * 60;

                // Récupérer les questions liées au questionnaire
                const { data: questionIdsData, error: questionIdsError } = await supabase
                    .from('contenir')
                    .select('id_question')
                    .eq('id_questionnaire', questionnaire.value.id_questionnaire);

                if (questionIdsError) {
                    throw new Error(questionIdsError.message);
                }

                const questionIds = questionIdsData.map(q => q.id_question);

                const { data: questionsData, error: questionsError } = await supabase
                    .from('question')
                    .select('*')
                    .in('id_question', questionIds);

                if (questionsError) {
                    throw new Error(questionsError.message);
                }

                questions.value = questionsData;

                // Récupérer les réponses pour chaque question
                for (const question of questionsData) {
                    const { data: answersData } = await supabase
                        .from("reponse")
                        .select("*")
                        .eq("id_question", question.id_question);

                    answers.value.push(answersData);
                    selectedAnswers.value.push(null);
                }

                startTimer();
            } catch (error) {
                console.error("Erreur lors de l'initialisation :", error);
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
                    saveResults();
                }
            }, 1000);
        };

        const formatTime = () => {
            const minutes = Math.floor(timer.value / 60);
            const seconds = timer.value % 60;
            return `${minutes}:${seconds.toString().padStart(2, "0")}`;
        };

        const selectAnswer = (answer) => {
            selectedAnswers.value[currentQuestion.value] = answer;
        };

        const submitQuestion = async () => {
            if (currentQuestion.value < questions.value.length - 1) {
                currentQuestion.value++;
            } else {
                // Calculer et sauvegarder les résultats ici
                await saveResults();
                alert("Le questionnaire est bien terminé");
                history.back(); // Retourner à la page précédente
            }
        };

        const saveResults = async () => {
            try {
                const score = selectedAnswers.value.reduce((total, answer, index) => {
                    if (answer && answer.etre_bonne_reponse) {
                        return total + questions.value[index].points;
                    }
                    return total;
                }, 0);

                // Récupérer l'id_utilisateur basé sur le username
                const { data: userData, error: userError } = await supabase
                    .from('utilisateur')
                    .select('id_utilisateur')
                    .eq('pseudo', props.username)
                    .single();

                if (userError) {
                    throw new Error(userError.message);
                }

                const userId = userData.id_utilisateur;

                // Insérer les résultats dans la table 'passer'
                const { error: insertError } = await supabase.from('passer').insert({
                    id_utilisateur: userId,
                    id_questionnaire: questionnaire.value.id_questionnaire,
                    note: score,
                    date: new Date().toISOString().split('T')[0]
                });

                if (insertError) {
                    throw new Error(insertError.message);
                }

                alert(`Votre score est de ${score}`);
                history.back(); // Retourner à la page précédente
            } catch (error) {
                console.error("Erreur lors de la sauvegarde des résultats :", error);
            }
        };

        const logout = async () => {
            await supabase.auth.signOut();
            router.push({ name: 'Login' });
        };

        return {
            currentQuestion,
            questions,
            answers,
            selectedAnswers,
            questionnaire,
            timer,
            formatTime,
            selectAnswer,
            submitQuestion,
            saveResults,
            logout
        };
    },
};
</script>

<style scoped>
.evaluation {
    font-family: Arial, sans-serif;
    color: #333;
    padding: 20px;
    max-width: 800px;
    margin: auto;
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
}

.logout-button:hover {
    background-color: #c0392b;
}

.timer {
    font-size: 1.5rem;
    margin: 10px 0;
    text-align: center;
    color: #555;
}

.questionnaire-content {
    margin-top: 80px;
    background-color: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.question-section {
    margin: 20px 0;
}

.question-number {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 10px;
}

.answers {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.answers button {
    background-color: #d9c2f0;
    border: none;
    padding: 10px;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
}

.answers button.selected {
    background-color: #a983db;
    color: white;
}

.navigation {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
}

.navigation .btn {
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
}

.navigation .btn:hover {
    background-color: #a070c2;
}

.footer {
    text-align: center;
    margin-top: 20px;
}
</style>