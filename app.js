// --- IMPORTS DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    Timestamp, 
    serverTimestamp,
    orderBy,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- CONFIG CORRIGIDA DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDRa59Ic1B3T6iMiI_lf4qUR31V1e3JwxI",
  authDomain: "dashbord-ec5ce.firebaseapp.com",
  projectId: "dashbord-ec5ce",
  storageBucket: "dashbord-ec5ce.appspot.com", // ✅ corrigido
  messagingSenderId: "781533071681",
  appId: "1:781533071681:web:1bc16f3685f8d754d079c0",
  measurementId: "G-2RVKJPXJTY"
};

// --- INICIALIZAÇÃO DO FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- VARIÁVEIS GLOBAIS ---
let currentUserId = null;
const appId = 'default-app-id';

let allBets = [];
let allPotentialBets = [];
let initialBalance = 0;
let currentFilter = 'all';

// --- ELEMENTOS DO DOM ---
const loadingIndicator = document.getElementById('loading-indicator');
const betForm = document.getElementById('bet-form');
const descriptionInput = document.getElementById('bet-description');
const amountInput = document.getElementById('bet-amount');
const returnInput = document.getElementById('return-amount');
const historyBody = document.getElementById('bet-history-body');
const emptyRow = document.getElementById('empty-row');
const potentialBetForm = document.getElementById('potential-bet-form');
const potentialAmountInput = document.getElementById('potential-bet-amount');
const potentialReturnInput = document.getElementById('potential-return-amount');
const potentialHistoryBody = document.getElementById('potential-history-body');
const emptyPotentialRow = document.getElementById('empty-potential-row');
const initialBalanceInput = document.getElementById('initial-balance-input');
const totalBalanceEl = document.getElementById('total-balance');
const totalWinningsEl = document.getElementById('total-winnings');
const totalLossesEl = document.getElementById('total-losses');
const winningsPeriodEl = document.getElementById('winnings-period');
const lossesPeriodEl = document.getElementById('losses-period');

// ===================================================================
// INICIALIZAÇÃO E AUTENTICAÇÃO
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Usuário logado anonimamente:", user.uid);
            currentUserId = user.uid;
            initializeAppLogic(currentUserId);
        } else {
            console.log("ℹ️ Nenhum usuário logado, tentando login anônimo...");
            signInAnonymously(auth).catch((error) => {
                console.error("Erro no login anônimo:", error);
                loadingIndicator.textContent = "Erro ao conectar. Atualize a página.";
            });
        }
    });
});

// ===================================================================
// LÓGICA PRINCIPAL DO APP
// ===================================================================
function initializeAppLogic(userId) {
    console.log("Inicializando app para o usuário:", userId);

    // Caminhos no Firestore
    const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
    const betsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/bets`);
    const potentialBetsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/potentialBets`);

    // Oculta o carregando
    loadingIndicator.classList.add('hidden');

    // Listener do saldo inicial
    onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            initialBalance = data.initialBalance || 0;
            initialBalanceInput.value = initialBalance.toFixed(2);
        } else {
            initialBalance = 0;
            initialBalanceInput.value = "0.00";
        }
        updateDashboard();
    });

    // Listener das apostas reais
    onSnapshot(query(betsCollectionRef), (snapshot) => {
        allBets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        allBets.sort((a, b) => b.createdAt - a.createdAt);
        renderBetHistory(allBets);
        updateDashboard();
    });

    // Listener das apostas potenciais
    onSnapshot(query(potentialBetsCollectionRef), (snapshot) => {
        allPotentialBets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        allPotentialBets.sort((a, b) => b.createdAt - a.createdAt);
        renderPotentialHistory(allPotentialBets);
        updateDashboard();
    });

    // Atualizar saldo inicial
    initialBalanceInput.addEventListener('change', () => {
        const newBalance = parseFloat(initialBalanceInput.value) || 0;
        setDoc(settingsDocRef, { initialBalance: newBalance }, { merge: true })
            .then(() => console.log("Saldo inicial salvo:", newBalance))
            .catch(err => console.error("Erro ao salvar saldo inicial:", err));
    });

    // Adicionar aposta real
    betForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = descriptionInput.value || 'Aposta';
        const amount = parseFloat(amountInput.value);
        const returned = parseFloat(returnInput.value);

        if (isNaN(amount) || isNaN(returned)) {
            alert("Insira valores válidos.");
            return;
        }

        addDoc(betsCollectionRef, {
            description,
            amount,
            returned,
            profit: returned - amount,
            createdAt: serverTimestamp()
        })
        .then(() => {
            console.log("✅ Aposta adicionada com sucesso!");
            betForm.reset();
        })
        .catch(err => console.error("Erro ao adicionar aposta:", err));
    });

    // Adicionar aposta potencial
    potentialBetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(potentialAmountInput.value);
        const returned = parseFloat(potentialReturnInput.value);

        if (isNaN(amount) || isNaN(returned)) {
            alert("Insira valores válidos.");
            return;
        }

        addDoc(potentialBetsCollectionRef, {
            amount,
            returned,
            profit: returned - amount,
            createdAt: serverTimestamp()
        })
        .then(() => {
            console.log("✅ Aposta potencial adicionada!");
            potentialBetForm.reset();
        })
        .catch(err => console.error("Erro ao adicionar aposta potencial:", err));
    });
}

// ===================================================================
// FUNÇÕES DE INTERFACE
// ===================================================================
function renderBetHistory(bets) {
    historyBody.innerHTML = '';
    if (bets.length === 0) {
        emptyRow.classList.remove('hidden');
        return;
    }
    emptyRow.classList.add('hidden');
    bets.forEach(bet => {
        const row = document.createElement('tr');
        const color = bet.profit > 0 ? 'text-green-600' : bet.profit < 0 ? 'text-red-600' : 'text-gray-700';
        row.innerHTML = `
            <td>${bet.description}</td>
            <td>${formatCurrency(bet.amount)}</td>
            <td>${formatCurrency(bet.returned)}</td>
            <td class="${color}">${formatCurrency(bet.profit)}</td>
        `;
        historyBody.appendChild(row);
    });
}

function renderPotentialHistory(bets) {
    potentialHistoryBody.innerHTML = '';
    if (bets.length === 0) {
        emptyPotentialRow.classList.remove('hidden');
        return;
    }
    emptyPotentialRow.classList.add('hidden');
    bets.forEach(bet => {
        const row = document.createElement('tr');
        const color = bet.profit > 0 ? 'text-green-600' : bet.profit < 0 ? 'text-red-600' : 'text-gray-700';
        row.innerHTML = `
            <td>${formatDate(bet.createdAt)}</td>
            <td>${formatCurrency(bet.amount)}</td>
            <td>${formatCurrency(bet.returned)}</td>
            <td class="${color}">${formatCurrency(bet.profit)}</td>
        `;
        potentialHistoryBody.appendChild(row);
    });
}

function updateDashboard() {
    const totalProfit = allBets.reduce((acc, b) => acc + b.profit, 0);
    const totalBalance = initialBalance + totalProfit;
    const totalWins = allBets.filter(b => b.profit > 0).reduce((a, b) => a + b.profit, 0);
    const totalLoss = allBets.filter(b => b.profit < 0).reduce((a, b) => a + b.profit, 0);

    totalBalanceEl.textContent = formatCurrency(totalBalance);
    totalWinningsEl.textContent = formatCurrency(totalWins);
    totalLossesEl.textContent = formatCurrency(totalLoss);
}

// ===================================================================
// FUNÇÕES AUXILIARES
// ===================================================================
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
