import { createRouter, createWebHistory } from 'vue-router';
import Administrateur from '../components/Administrateur.vue';
import Collaborateur from '../components/Collaborateur.vue';
import { useAuthStore } from '@/store/authStore';

// Sous-composants pour les sections
import Utilisateurs from '../components/Utilisateur.vue';
import Questionnaires from '../components/Questionnaires.vue';
import Dashboard from '../components/Dashboard.vue';
import Correction from '../components/Correction.vue';
import ListeCorrection from '../components/ListeCorrection.vue';
import EditQuestions from '../components/EditQuestions.vue';
import Evaluation from '../components/Evaluation.vue';
import CreationQ from '../components/CreationQ.vue';
import CreationQu from '../components/CreationQu.vue';
import CreationU from '../components/CreationU.vue';
import CreationG from '../components/CreationG.vue';
import DebutTest from '../components/DebutTest.vue';
import Fin from '../components/Fin.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../App.vue'),
  },
  {
    path: '/administrateur',
    name: 'Administrateur',
    component: Administrateur,
    children: [
      {
        path: 'utilisateurs',
        name: 'Utilisateurs',
        component: Utilisateurs,
      },
      {
        path: 'questionnaires',
        name: 'Questionnaires',
        component: Questionnaires,
        children: [
          {
            path: 'creation-questionnaire',
            name: 'CreationQ',
            component: CreationQ,
            children: [
              {
                path: 'creation-questions/:id_questionnaire',
                name: 'CreationQu',
                component: CreationQu,
                props: true,
              },
            ],
          },
        ],
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
      },
      {
        path: 'correction',
        name: 'ListeCorrection',
        component: ListeCorrection,
        children: [
          {
            path: 'correction-question/:idQuestionnaire/:idUtilisateur',
            name: 'Correction',
            component: Correction,
            props: true,
          },
        ],
      },
    ],
  },
  {
    path: '/collaborateur',
    name: 'Collaborateur',
    component: Collaborateur,
    children: [
      {
        path: 'debut',
        name: 'DebutTest',
        component: DebutTest,
        children: [
          {
            path: 'evaluation/:id_questionnaire',
            name: 'Evaluation',
            component: Evaluation,
            props: true,
            children: [
              {
                path: 'fin',
                name: 'Fin',
                component: Fin,
              },
            ],
          },
        ],
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;