<template>
  <div>
    <header>
      <h1>Gestion des Utilisateurs</h1>
    </header>

    <section>
      <div class="button-group centered">
        <button @click="showCreationForm">Créer un utilisateur</button>
        <button @click="showCreationGroupForm">Créer un groupe</button>
        <button @click="showGroupList">Liste des groupes</button>
        <button v-if="selectedUsers.length >= 2" @click="confirmDeleteSelectedUsers">Supprimer sélectionnés</button>
      </div>

      <div>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Rechercher un utilisateur par pseudo"
          @input="searchUser"
        />
      </div>

      <div v-if="showCreation">
        <CreationU @refresh="fetchUtilisateurs" @cancel="hideCreationForm" />
      </div>

      <div v-if="showCreationGroup">
        <CreationG @refresh="fetchGroupes" @cancel="hideCreationGroupForm" />
      </div>

      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
              </th>
              <th>Nom d'utilisateur</th>
              <th>Groupe</th>
              <th>Rôle</th>
              <th>Options</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="utilisateur in filteredUtilisateurs" :key="utilisateur.id_utilisateur">
              <td>
                <input
                  type="checkbox"
                  :value="utilisateur.id_utilisateur"
                  v-model="selectedUsers"
                />
              </td>
              <td>{{ utilisateur.pseudo }}</td>
              <td>{{ utilisateur.appartenir[0]?.groupe.nom || 'N/A' }}</td>
              <td>{{ utilisateur.appartenir[0]?.groupe.role || 'N/A' }}</td>
              <td>
                <button @click="editUser(utilisateur)">Modifier</button>
                <button @click="confirmDeleteUser(utilisateur)">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modale de modification utilisateur -->
    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <h3>Modifier l'utilisateur</h3>
        <label for="editNom">Nom d'utilisateur:</label>
        <input type="text" v-model="editUtilisateur.pseudo" id="editNom" />

        <label for="editPassword">Mot de passe:</label>
        <input type="password" v-model="editUtilisateur.mot_de_passe" id="editPassword" />

        <label for="editGroupe">Groupe:</label>
        <select v-model="editUtilisateur.groupe_id" id="editGroupe">
          <option v-for="groupe in groupes" :key="groupe.id_groupe" :value="groupe.id_groupe">{{ groupe.nom }}</option>
        </select>

        <button @click="updateUser">Mettre à jour</button>
        <button @click="closeEditModal">Annuler</button>
      </div>
    </div>

    <!-- Confirmation de suppression -->
    <div v-if="showConfirmModal" class="modal">
      <div class="modal-content">
        <h3>Êtes-vous sûr de vouloir supprimer ces utilisateurs :</h3>
        <ul>
          <li v-for="user in usersToDelete" :key="user.id_utilisateur">{{ user.pseudo }}</li>
        </ul>
        <button @click="deleteUsers">Supprimer</button>
        <button @click="closeConfirmModal">Annuler</button>
      </div>
    </div>

    <!-- Modale de liste des groupes -->
    <div v-if="showGroupListModal" class="modal">
      <div class="modal-content">
        <h3>Liste des Groupes</h3>
        <ul>
          <li v-for="groupe in groupes" :key="groupe.id_groupe">
            {{ groupe.nom }} ({{ groupe.role }})
            <button @click="confirmDeleteGroup(groupe)">Supprimer</button>
          </li>
        </ul>
        <button @click="closeGroupListModal">Fermer</button>
      </div>
    </div>

    <!-- Confirmation de suppression de groupe -->
    <div v-if="showConfirmGroupModal" class="modal">
      <div class="modal-content">
        <h3>Êtes-vous sûr de vouloir supprimer ce groupe :</h3>
        <ul>
          <li>{{ groupToDelete.nom }}</li>
        </ul>
        <button @click="deleteGroup">Supprimer</button>
        <button @click="closeConfirmGroupModal">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import bcrypt from 'bcryptjs';
import { supabase } from "../supabase";
import CreationU from "./CreationU.vue";
import CreationG from "./CreationG.vue";

const utilisateurs = ref([]);
const groupes = ref([]);
const showCreation = ref(false);
const showCreationGroup = ref(false);
const showEditModal = ref(false);
const showConfirmModal = ref(false);
const showGroupListModal = ref(false);
const showConfirmGroupModal = ref(false);
const editUtilisateur = ref({});
const usersToDelete = ref([]);
const groupToDelete = ref({}); 
const selectAll = ref(false);
const selectedUsers = ref([]);
const searchQuery = ref(""); 
const currentUser = ref(null); 

const fetchUtilisateurs = async () => {
  const { data, error } = await supabase
    .from("utilisateur")
    .select(`*, appartenir (groupe (nom, role))`);
  if (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
  } else {
    utilisateurs.value = data;
  }
};

// Fonction pour récupérer les groupes
const fetchGroupes = async () => {
  const { data, error } = await supabase.from("groupe").select("*");
  if (error) {
    console.error("Erreur lors de la récupération des groupes:", error);
  } else {
    groupes.value = data;
  }
};

// Fonction pour afficher le formulaire de création
const showCreationForm = () => {
  showCreation.value = true;
};

// Fonction pour cacher le formulaire de création
const hideCreationForm = () => {
  showCreation.value = false;
};

// Fonction pour afficher le formulaire de création de groupe
const showCreationGroupForm = () => {
  showCreationGroup.value = true;
};

// Fonction pour cacher le formulaire de création de groupe
const hideCreationGroupForm = () => {
  showCreationGroup.value = false;
};

// Fonction pour afficher la liste des groupes
const showGroupList = () => {
  showGroupListModal.value = true;
};

// Fonction pour fermer la modale de liste des groupes
const closeGroupListModal = () => {
  showGroupListModal.value = false;
};

// Fonction pour modifier un utilisateur
const editUser = (utilisateur) => {
  editUtilisateur.value = {
    ...utilisateur,
    groupe_id: utilisateur.appartenir[0]?.groupe.id_groupe || null
  };
  showEditModal.value = true;
};

// Fonction pour fermer la modale de modification
const closeEditModal = () => {
  showEditModal.value = false;
};

const updateUser = async () => {
  console.log("Tentative de mise à jour de l'utilisateur:", editUtilisateur.value);

  try {
    const hashedPassword = await bcrypt.hash(editUtilisateur.value.mot_de_passe, 10);

    const { error } = await supabase
      .from("utilisateur")
      .update({
        pseudo: editUtilisateur.value.pseudo,
        mot_de_passe: hashedPassword,
      })
      .eq("id_utilisateur", editUtilisateur.value.id_utilisateur);

    if (error) {
      console.error("Erreur lors de la mise à jour de l'utilisateur:", error.message);
      alert("Une erreur est survenue lors de la mise à jour de l'utilisateur.");
    } else {
      const { error: groupError } = await supabase
        .from("appartenir")
        .update({ id_groupe: editUtilisateur.value.groupe_id })
        .eq("id_utilisateur", editUtilisateur.value.id_utilisateur);

      if (groupError) {
        console.error("Erreur lors de la mise à jour du groupe de l'utilisateur:", groupError.message);
        alert("Une erreur est survenue lors de la mise à jour du groupe de l'utilisateur.");
      } else {
        fetchUtilisateurs();
        closeEditModal();
      }
    }
  } catch (error) {
    console.error("Erreur lors du hachage du mot de passe:", error);
    alert("Une erreur est survenue lors du hachage du mot de passe.");
  }
};

// Fonction pour confirmer la suppression d'un utilisateur
const confirmDeleteUser = (utilisateur) => {
  usersToDelete.value = [utilisateur];
  showConfirmModal.value = true;
};

// Fonction pour confirmer la suppression des utilisateurs sélectionnés
const confirmDeleteSelectedUsers = () => {
  usersToDelete.value = utilisateurs.value.filter(user => selectedUsers.value.includes(user.id_utilisateur));
  showConfirmModal.value = true;
};

// Fonction pour supprimer les utilisateurs
const deleteUsers = async () => {
  try {
    // Supprimer les entrées dans la table Appartenir
    const { error: appartenirError } = await supabase
      .from("appartenir")
      .delete()
      .in("id_utilisateur", usersToDelete.value.map(user => user.id_utilisateur));

    if (appartenirError) throw appartenirError;

    // Supprimer les utilisateurs
    const { error: utilisateurError } = await supabase
      .from("utilisateur")
      .delete()
      .in("id_utilisateur", usersToDelete.value.map(user => user.id_utilisateur));

    if (utilisateurError) throw utilisateurError;

    fetchUtilisateurs();
    closeConfirmModal();
  } catch (error) {
    console.error("Erreur lors de la suppression des utilisateurs:", error);
  }
};

// Fonction pour fermer la modale de confirmation
const closeConfirmModal = () => {
  showConfirmModal.value = false;
};

// Fonction pour gérer le changement de la case "tout cocher"
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedUsers.value = utilisateurs.value.map((utilisateur) => utilisateur.id_utilisateur);
  } else {
    selectedUsers.value = [];
  }
};

// Fonction de recherche
const searchUser = () => {
  // Met à jour la liste des utilisateurs filtrés à chaque changement dans le champ de recherche
  filteredUtilisateurs.value = utilisateurs.value.filter((utilisateur) =>
    utilisateur.pseudo.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
};

// Utilisateur filtré en fonction de la recherche
const filteredUtilisateurs = computed(() => {
  return utilisateurs.value.filter((utilisateur) =>
    utilisateur.pseudo.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Fonction pour confirmer la suppression d'un groupe
const confirmDeleteGroup = (groupe) => {
  groupToDelete.value = groupe;
  showConfirmGroupModal.value = true;
};

// Fonction pour supprimer un groupe
const deleteGroup = async () => {
  const { error } = await supabase
    .from("groupe")
    .delete()
    .eq("id_groupe", groupToDelete.value.id_groupe);

  if (error) {
    console.error("Erreur lors de la suppression du groupe:", error);
  } else {
    fetchGroupes();
    closeConfirmGroupModal();
  }
};

// Fonction pour fermer la modale de confirmation de groupe
const closeConfirmGroupModal = () => {
  showConfirmGroupModal.value = false;
};

onMounted(() => {
  fetchUtilisateurs();
  fetchGroupes();
  currentUser.value = JSON.parse(localStorage.getItem('currentUser'));
});
</script>

<style scoped>
header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 20px;
  text-align: center;
  border-radius: 7px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.button-group.centered {
  justify-content: center;
}

button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border: none;
  padding: 10px;
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  margin-right: 10px;
}

button:hover {
  background-color: #b48ac6;
}

input[type="text"] {
  padding: 10px;
  margin-top: 10px;
  margin-bottom: 15px;
  width: 300px;
}

.table-container {
  max-height: 450px;
  overflow-y: auto;
}

.data-table td button {
    margin-right: 10px; /* Ajoute une marge de 10px entre les boutons */
  }

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

table th, table td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}

.data-table th {
  background-color: #f0f0f0;
}

.data-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

input[type="text"] {
  padding: 10px;
  margin-top: 10px;
  width: 200px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

input[type="checkbox"] {
  cursor: pointer;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
}

input[type="text"],
input[type="password"],
select {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
}

input[type="text"] {
  margin-top: 10px;
}
</style>