import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import router from '../router'; // Import the router

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    role: null,
    isAuthenticated: false,
    inactivityTimer: null,
  }),

  actions: {
    async login(username, password) {
      const { data, error } = await supabase
        .from('utilisateur')
        .select('*, appartenir (groupe (role))')
        .eq('pseudo', username)
        .single();

      if (error || !data) {
        throw new Error('Nom d’utilisateur ou mot de passe incorrect');
      }

      this.user = username;
      this.role = data.appartenir?.[0]?.groupe?.role || null;
      this.isAuthenticated = true;

      if (!this.role) {
        throw new Error("Impossible de déterminer le rôle de l'utilisateur.");
      }

      // Sauvegarder la session avec une date d'expiration
      const expiry = Date.now() + 15 * 60 * 1000; // TTL : 15 minutes
      localStorage.setItem(
        'session',
        JSON.stringify({
          username: this.user,
          role: this.role,
          expiry: expiry,
        })
      );

      // Démarrer le timer d'inactivité
      this.startInactivityTimer();

      // Rediriger en fonction du rôle uniquement si l'utilisateur n'est pas déjà sur la bonne page
      if (!this.isCurrentRouteCorrect()) {
        this.redirectBasedOnRole();
      }
    },

    logout() {
      this.user = null;
      this.role = null;
      this.isAuthenticated = false;
      localStorage.removeItem('session');
      this.clearInactivityTimer();
      router.push('/');
    },

    loadSession() {
      const storedSession = localStorage.getItem('session');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);

        // Vérifier si la session a expiré
        if (Date.now() > sessionData.expiry) {
          this.logout(); // Déconnecter si la session est expirée
          alert('Votre session a expiré. Veuillez vous reconnecter.');
          return;
        }

        // Charger les données de session si elles sont encore valides
        this.user = sessionData.username;
        this.role = sessionData.role;
        this.isAuthenticated = true;

        // Démarrer le timer d'inactivité
        this.startInactivityTimer();

        // Rediriger en fonction du rôle uniquement si l'utilisateur n'est pas déjà sur la bonne page
        if (!this.isCurrentRouteCorrect()) {
          this.redirectBasedOnRole();
        }
      }
    },

    startInactivityTimer() {
      this.clearInactivityTimer();
      this.inactivityTimer = setTimeout(() => {
        this.logout();
        alert('Votre session a expiré en raison de l\'inactivité.');
      }, 30 * 60 * 1000);
    },

    clearInactivityTimer() {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = null;
      }
    },

    resetInactivityTimer() {
      if (this.isAuthenticated) {
        this.startInactivityTimer();
      }
    },

    redirectBasedOnRole() {
      if (this.role === 'administrateur') {
        router.push('/administrateur');
      } else if (this.role === 'collaborateur') {
        router.push('/collaborateur');
      }
    },

    isCurrentRouteCorrect() {
      const currentRoute = router.currentRoute.value;
      if (this.role === 'administrateur' && currentRoute.path.startsWith('/administrateur')) {
        return true;
      }
      if (this.role === 'collaborateur' && currentRoute.path.startsWith('/collaborateur')) {
        return true;
      }
      return false;
    },
  },
});
