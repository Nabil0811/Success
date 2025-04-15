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
import ProfilUtilisateur from '../components/ProfilUtilisateur.vue';
import AdminUserProfile from '../components/AdminUserProfile.vue';

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
    meta: { requiresAuth: true, role: 'administrateur' },
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
      },
      {
        path: 'questionnaires/creation',
        name: 'CreationQ',
        component: CreationQ,
      },
      {
        path: 'questionnaires/edit/:questionnaireId',
        name: 'EditQuestions',
        component: EditQuestions,
        props: true,
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
      },
      {
        path: 'correction/:idQuestionnaire/:idUtilisateur',
        name: 'Correction',
        component: Correction,
        props: true,
      },
      {
        path: 'profils',
        name: 'AdminUserProfile',
        component: AdminUserProfile,
      }
    ],
  },
  {
    path: '/collaborateur',
    name: 'Collaborateur',
    component: Collaborateur,
    meta: { requiresAuth: true, role: 'collaborateur' },
    children: [
      {
        path: 'profil',
        name: 'ProfilUtilisateur',
        component: ProfilUtilisateur,
        props: (route) => ({
          username: useAuthStore().user
        }),
      },
      {
        path: 'debut',
        name: 'DebutTest',
        component: DebutTest,
        props: true,
      },
      {
        path: 'evaluation/:id_questionnaire',
        name: 'Evaluation',
        component: Evaluation,
        props: true,
      },
      {
        path: 'fin',
        name: 'Fin',
        component: Fin,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  // Si la route requiert une authentification
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      // Rediriger vers la page de connexion si non authentifié
      next({ path: '/' });
    } else if (to.meta.role && to.meta.role !== authStore.role) {
      // Vérifier le rôle si spécifié
      if (authStore.role === 'administrateur') {
        next({ path: '/administrateur' });
      } else if (authStore.role === 'collaborateur') {
        next({ path: '/collaborateur' });
      } else {
        next({ path: '/' });
      }
    } else {
      next(); // Autorisé à accéder
    }
  } else {
    // Route publique
    next();
  }
});

export default router;