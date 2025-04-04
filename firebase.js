import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    set, 
    onValue, 
    update as firebaseUpdate,
    remove 
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDRgxphnGdg1uma8QdJOB1xG-P35ntYV2Q",
    authDomain: "wedoanything-ce777.firebaseapp.com",
    databaseURL: "https://wedoanything-ce777-default-rtdb.firebaseio.com",
    projectId: "wedoanything-ce777",
    storageBucket: "wedoanything-ce777.appspot.com",
    messagingSenderId: "566208545698",
    appId: "1:566208545698:web:c91502a2eafa2989c6a8fb",
    measurementId: "G-MDLFKS025F"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { 
    database, 
    ref, 
    push, 
    set, 
    onValue, 
    firebaseUpdate as update,
    remove 
};