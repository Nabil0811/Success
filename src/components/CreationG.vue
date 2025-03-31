<template>
  <div class="popup-overlay">
    <div class="popup-content">
      <h2>Créer un nouveau groupe</h2>
      <form @submit.prevent="createGroup">
        <label>Nom du groupe:
          <input v-model="group.nom" type="text" required />
        </label>
        
        <label>Rôle:
          <select v-model="group.role" required>
            <option value="administrateur">Administrateur</option>
            <option value="collaborateur">Collaborateur</option>
          </select>
        </label>
        
        <div class="modal-actions">
          <button type="submit">Créer</button>
          <button type="button" @click="cancel">Annuler</button>
        </div>
      </form>
      
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase';

const emit = defineEmits(['refresh', 'cancel']);

const group = ref({
  nom: '',
  role: ''
});

const usersWithoutGroup = ref([]);
const selectedUsers = ref([]);
const errorMessage = ref(null);
const successMessage = ref(null);

const fetchUsersWithoutGroup = async () => {
  const { data, error } = await supabase
    .from('utilisateur')
    .select('*')
    .not('id_utilisateur', 'in', supabase.from('appartenir').select('id_utilisateur'))
    .is('role', null);

  if (error) {
    console.error('Erreur lors de la récupération des utilisateurs sans groupe et sans rôle:', error);
  } else {
    usersWithoutGroup.value = data;
  }
};

const createGroup = async () => {
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const { data: groupData, error: groupError } = await supabase
      .from('groupe')
      .insert([{ nom: group.value.nom, role: group.value.role }])
      .select();

    if (groupError) {
      throw new Error(groupError.message);
    }

    const groupId = groupData[0].id_groupe;

    const { error: belongError } = await supabase
      .from('appartenir')
      .insert(selectedUsers.value.map(userId => ({
        id_utilisateur: userId,
        id_groupe: groupId
      })));

    if (belongError) {
      throw new Error(belongError.message);
    }

    successMessage.value = 'Groupe créé avec succès !';
    emit('refresh');
    emit('cancel');
  } catch (error) {
    errorMessage.value = `Erreur: ${error.message}`;
  }
};

const cancel = () => {
  emit('cancel');
};

onMounted(() => {
  fetchUsersWithoutGroup();
});
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
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border: none;
  padding: 10px 15px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #b48ac6;
}

.error-message {
  color: red;
  font-size: 0.9rem;
  margin-top: 10px;
}

.success-message {
  color: green;
  font-size: 0.9rem;
  margin-top: 10px;
}
</style>