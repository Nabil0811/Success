<template>
  <div class="popup-overlay">
    <div class="popup-content">
      <h2>Créer un nouvel utilisateur</h2>
      <form @submit.prevent="createUser">
        <label>Nom d'utilisateur:
          <input v-model="user.pseudo" type="text" required />
        </label>
        <label>Mot de passe:
          <input v-model="user.mot_de_passe" type="password" required />
        </label>
        <label>Confirmation du mot de passe:
          <input v-model="user.confirmation_mot_de_passe" type="password" required />
        </label>
        <label>Groupe:
          <select v-model="user.groupe" @change="fetchRoles" required>
            <option v-for="g in groupes" :key="g.id_groupe" :value="g.id_groupe">
              {{ g.nom }}
            </option>
          </select>
        </label>
        <label>Rôle:
          <select v-model="user.role" required>
            <option v-for="role in roles" :key="role" :value="role">
              {{ role }}
            </option>
          </select>
        </label>
        <div class="button-group">
          <button type="submit">Valider</button>
          <button type="button" @click="cancel">Retour</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase';

const emit = defineEmits(['refresh', 'cancel']);

const user = ref({
  pseudo: '',
  mot_de_passe: '',
  confirmation_mot_de_passe: '',
  groupe: null,
  role: ''
});

const groupes = ref([]);
const roles = ref([]);

// Récupérer les groupes depuis la base de données
const fetchGroupes = async () => {
  const { data, error } = await supabase.from('groupe').select('*');
  if (error) {
    console.error('Erreur lors de la récupération des groupes:', error);
  } else {
    groupes.value = data;
  }
};

const fetchRoles = async () => {
  const selectedGroup = groupes.value.find(g => g.id_groupe === user.value.groupe);
  roles.value = selectedGroup ? [selectedGroup.role] : [];
};

onMounted(() => {
  fetchGroupes();
});

const createUser = async () => {
  if (user.value.mot_de_passe !== user.value.confirmation_mot_de_passe) {
    alert('Les mots de passe ne correspondent pas.');
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(user.value.mot_de_passe, 10);

    const { data: userData, error: userError } = await supabase
      .from('utilisateur')  
      .insert([{
        pseudo: user.value.pseudo, 
        mot_de_passe: hashedPassword 
      }])
      .select();

    if (userError) {
      console.error('Erreur lors de la création de l\'utilisateur:', userError.message);
      alert('Erreur lors de la création de l\'utilisateur: ' + userError.message);
      return;
    }

    if (!userData || !userData[0]) {
      console.error('Aucune donnée retournée pour l\'utilisateur');
      alert('Aucune donnée retournée lors de la création de l\'utilisateur.');
      return;
    }

    const userId = userData[0].id_utilisateur;

    const { error: groupError } = await supabase
      .from('appartenir')
      .insert([{
        id_utilisateur: userId,
        id_groupe: user.value.groupe
      }]);

    if (groupError) {
      console.error('Erreur lors de l\'association de l\'utilisateur au groupe:', groupError.message);
      alert('Erreur lors de l\'association de l\'utilisateur au groupe: ' + groupError.message);
      return;
    }

    if (groupError) {
      console.error('Erreur lors de l\'association de l\'utilisateur au groupe:', groupError.message);
      alert('Erreur lors de l\'association de l\'utilisateur au groupe: ' + groupError.message);
      return;
    }

    user.value = { pseudo: '', mot_de_passe: '', confirmation_mot_de_passe: '', groupe: null, role: '' };
    emit('refresh'); 
    emit('cancel');
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    alert('Une erreur s\'est produite lors de la création de l\'utilisateur: ' + error.message);
  }
};

const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.popup-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.2);
}

form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.button-group {
  display: flex;
  justify-content: space-between;
}

button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border: none;
  padding: 8px 12px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #b48ac6;
}
</style>
