const firebaseConfig = {
    apiKey: "AIzaSyANnUH5L9bSTBTzwnbiWqZutctrUgGEu8E",
    authDomain: "mazen-admin.firebaseapp.com",
    projectId: "mazen-admin",
    storageBucket: "mazen-admin.firebasestorage.app",
    messagingSenderId: "841158763037",
    appId: "1:841158763037:web:e2f4f540135beb01fbdcf4"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();