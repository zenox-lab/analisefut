// --- IMPORTS DO FIREBASE ---
// ... (O usuário forneceu o snippet modular, mas a lógica de migração do localStorage é complexa.
// (O usuário forneceu o snippet modular, mas a lógica de migração do localStorage é complexa.
// Vou usar os imports modulares que são o padrão moderno.)
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
    updateDoc, // ADICIONADO 'updateDoc'
    onSnapshot, 
    collection, 
    query, 
    Timestamp, 
    serverTimestamp,
    orderBy,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- CONFIG DO FIREBASE (FORNECIDA PELO USUÁRIO) ---
const firebaseConfig = {
  apiKey: "AIzaSyDRa59Ic1B3T6iMiI_lf4qUR31V1e3JwxI", // Corrigido: Removido ' ' do final
  authDomain: "dashbord-ec5ce.firebaseapp.com",
  projectId: "dashbord-ec5ce",
  storageBucket: "dashbord-ec5ce.firebasestorage.app",
  messagingSenderId: "781533071681",
  appId: "1:781533071681:web:1bc16f3685f8d754d079c0",
  measurementId: "G-2RVKJPXJTY"
};

// --- INICIALIZAÇÃO DO FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setLogLevel('debug'); // Útil para ver logs do Firestore

// --- VARIÁVEIS GLOBAIS DO APP ---
let currentUserId = null; // ID do usuário logado
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // ID do App (para regras do Firestore)

// --- ESTADO DA APLICAÇÃO (AGORA VAZIO, PREENCHIDO PELO FIREBASE) ---
let allBets = [];
let allPotentialBets = [];
let strategy1Bets = [];
let strategy2Bets = [];
let strategy3Bets = [];
let initialBalance = 0;

let currentFilter = 'all'; // 'all', 'today', 'week', 'month'
let balanceChart = null; // Gráfico 1
let potentialBalanceChart = null; // Gráfico 2
let simChart1 = null, simChart2 = null, simChart3 = null;

// --- REFERÊNCIAS GLOBAIS DO DOM ---
const loadingIndicator = document.getElementById('loading-indicator');
const navInicio = document.getElementById('nav-inicio');
const navEstrategia = document.getElementById('nav-estrategia');
const viewInicio = document.getElementById('view-inicio');
const viewEstrategia = document.getElementById('view-estrategia');
const navLinks = document.querySelectorAll('.nav-link');
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
const balanceChartCtx = document.getElementById('balance-chart').getContext('2d');
const potentialChartCtx = document.getElementById('potential-chart').getContext('2d');
const filterAllBtn = document.getElementById('filter-all');
const filterTodayBtn = document.getElementById('filter-today');
const filterWeekBtn = document.getElementById('filter-week');
const filterMonthBtn = document.getElementById('filter-month');
const filterButtons = [filterAllBtn, filterTodayBtn, filterWeekBtn, filterMonthBtn];

// --- REFERÊNCIAS DO DOM (MODAIS DE EDIÇÃO - NOVOS) ---
const editBetModal = document.getElementById('edit-bet-modal');
const editBetForm = document.getElementById('edit-bet-form');
const editBetIdInput = document.getElementById('edit-bet-id');
const editBetDescriptionInput = document.getElementById('edit-bet-description');
const editBetAmountInput = document.getElementById('edit-bet-amount');
const editReturnAmountInput = document.getElementById('edit-return-amount');
const cancelEditBetBtn = document.getElementById('cancel-edit-bet');

const editPotentialModal = document.getElementById('edit-potential-modal');
const editPotentialForm = document.getElementById('edit-potential-form');
const editPotentialIdInput = document.getElementById('edit-potential-id');
const editPotentialAmountInput = document.getElementById('edit-potential-amount');
const editPotentialReturnInput = document.getElementById('edit-potential-return');
const cancelEditPotentialBtn = document.getElementById('cancel-edit-potential');

const editSimModal = document.getElementById('edit-sim-modal');
const editSimForm = document.getElementById('edit-sim-form');
const editSimIdInput = document.getElementById('edit-sim-id');
const editSimIndexInput = document.getElementById('edit-sim-index');
const editSimStakeInput = document.getElementById('edit-sim-stake');
const editSimOddInput = document.getElementById('edit-sim-odd');
const editSimResultInput = document.getElementById('edit-sim-result');
const cancelEditSimBtn = document.getElementById('cancel-edit-sim');

// Constantes de data (movidas para o topo para acesso global)
const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Segunda como início da semana
startOfWeek.setHours(0, 0, 0, 0);
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

// ===================================================================
// INICIALIZAÇÃO E AUTENTICAÇÃO
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Escuta por mudanças no estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            console.log("Usuário logado (anônimo):", user.uid);
            currentUserId = user.uid;
            // Usuário está pronto, inicialize a lógica principal do app
            initializeAppLogic(currentUserId);
        } else {
            // Usuário não está logado, tenta fazer login anônimo
            console.log("Nenhum usuário logado. Tentando login anônimo...");
            signInAnonymously(auth).catch((error) => {
                console.error("Erro no login anônimo:", error);
                loadingIndicator.textContent = "Erro ao conectar. Por favor, atualize a página.";
            });
        }
    });
});

// ===================================================================
// LÓGICA PRINCIPAL DO APP (SÓ RODA APÓS AUTH)
// ===================================================================
function initializeAppLogic(userId) {
    console.log("Inicializando a lógica do app para o usuário:", userId);

    // --- CAMINHOS DO FIRESTORE ---
    const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/main`);
    const betsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/bets`);
    const potentialBetsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/potentialBets`);
    const simBets1CollectionRef = collection(db, `artifacts/${appId}/users/${userId}/simBets1`);
    const simBets2CollectionRef = collection(db, `artifacts/${appId}/users/${userId}/simBets2`);
    const simBets3CollectionRef = collection(db, `artifacts/${appId}/users/${userId}/simBets3`);

    // --- ESCONDE O LOADING E MOSTRA O APP ---
    loadingIndicator.classList.add('hidden');
    showView('inicio'); // Mostra a view inicial

    // --- CONFIGURA OS LISTENERS DE NAVEGAÇÃO ---
    navInicio.addEventListener('click', (e) => { e.preventDefault(); showView('inicio'); });
    navEstrategia.addEventListener('click', (e) => { e.preventDefault(); showView('estrategia'); }); // CORRIGIDO: Era navEstrategIA

    // --- CONFIGURA LISTENERS DE DADOS (ONSNAPSHOT) ---
    // O onSnapshot atualiza os dados em tempo real

    // 1. Saldo Inicial (Settings)
    onSnapshot(settingsDocRef, (doc) => {
        if (doc.exists()) {
            initialBalance = doc.data().initialBalance || 0;
        } else {
            initialBalance = 0; // Nenhum documento de settings ainda
        }
        initialBalanceInput.value = initialBalance.toFixed(2);
        // Atualiza a UI que depende do saldo inicial
        applyFilter(currentFilter);
    }, (error) => console.error("Erro ao ouvir settings:", error));

    // 2. Apostas Reais (Bets)
    onSnapshot(query(betsCollectionRef), (snapshot) => { // REMOVIDO: orderBy('createdAt', 'desc')
        allBets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            allBets.push({ 
                id: doc.id, // ID do Documento Firestore
                ...data,
                // Converte Timestamp do Firebase para Date do JS
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (NOVO) Ordena os dados no JavaScript (mais novo primeiro)
        allBets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        // Após atualizar os dados, re-renderiza tudo
        applyFilter(currentFilter);
    }, (error) => console.error("Erro ao ouvir 'bets':", error));

    // 3. Apostas Potenciais
    onSnapshot(query(potentialBetsCollectionRef), (snapshot) => { // REMOVIDO: orderBy('createdAt', 'desc')
        allPotentialBets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            allPotentialBets.push({ 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (NOVO) Ordena os dados no JavaScript (mais novo primeiro)
        allPotentialBets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        applyFilter(currentFilter);
    }, (error) => console.error("Erro ao ouvir 'potentialBets':", error));
    
    // 4. Simulação Estratégia 1
    onSnapshot(query(simBets1CollectionRef), (snapshot) => { // REMOVIDO: orderBy('createdAt', 'desc')
        strategy1Bets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            strategy1Bets.push({ 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (NOVO) Ordena os dados no JavaScript (mais novo primeiro)
        strategy1Bets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        // Re-renderiza a UI dessa estratégia
        renderStrategySimulation(1);
    }, (error) => console.error("Erro ao ouvir 'simBets1':", error));

    // 5. Simulação Estratégia 2
    onSnapshot(query(simBets2CollectionRef), (snapshot) => { // REMOVIDO: orderBy('createdAt', 'desc')
        strategy2Bets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            strategy2Bets.push({ 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (NOVO) Ordena os dados no JavaScript (mais novo primeiro)
        strategy2Bets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        renderStrategySimulation(2);
    }, (error) => console.error("Erro ao ouvir 'simBets2':", error));

    // 6. Simulação Estratégia 3
    onSnapshot(query(simBets3CollectionRef), (snapshot) => { // REMOVIDO: orderBy('createdAt', 'desc')
        strategy3Bets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            strategy3Bets.push({ 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (NOVO) Ordena os dados no JavaScript (mais novo primeiro)
        strategy3Bets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        renderStrategySimulation(3);
    }, (error) => console.error("Erro ao ouvir 'simBets3':", error));


    // --- FUNÇÕES DE LÓGICA (MODIFICADAS PARA FIREBASE) ---

    // Salva o Saldo Inicial no Firestore
    async function saveInitialBalance() {
        const newBalance = parseFloat(initialBalanceInput.value) || 0;
        try {
            await setDoc(settingsDocRef, { initialBalance: newBalance }, { merge: true });
            console.log("Saldo inicial salvo!");
            initialBalance = newBalance; // Atualiza o estado local
            initialBalanceInput.value = initialBalance.toFixed(2);
            applyFilter(currentFilter); // Atualiza tudo
        } catch (error) {
            console.error("Erro ao salvar saldo inicial: ", error);
        }
    }

    // Adiciona uma Aposta Real
    async function addBet(e) {
        e.preventDefault();
        const description = descriptionInput.value || 'Aposta';
        const amount = parseFloat(amountInput.value);
        const returned_actual = parseFloat(returnInput.value);
        if (isNaN(amount) || isNaN(returned_actual) || amount < 0 || returned_actual < 0) return;
        const profit_actual = returned_actual - amount;
        
        const newBet = { 
            description, 
            amount, 
            returned_actual, 
            profit_actual,
            createdAt: serverTimestamp() // Usa o timestamp do servidor
        };
        
        try {
            await addDoc(betsCollectionRef, newBet);
            console.log("Aposta real adicionada!");
            betForm.reset();
            descriptionInput.focus();
        } catch (error) {
            console.error("Erro ao adicionar aposta real: ", error);
        }
    }
    
    // Adiciona uma Aposta Potencial
    async function addPotentialBet(e) {
        e.preventDefault();
        const amount = parseFloat(potentialAmountInput.value);
        const returned_potential = parseFloat(potentialReturnInput.value);
        if (isNaN(amount) || isNaN(returned_potential) || amount < 0 || returned_potential < 0) return;
        const profit_potential = returned_potential - amount;
        
        const newPotentialBet = { 
            amount, 
            returned_potential, 
            profit_potential,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(potentialBetsCollectionRef, newPotentialBet);
            console.log("Aposta potencial adicionada!");
            potentialBetForm.reset();
            potentialAmountInput.focus();
        } catch (error) {
            console.error("Erro ao adicionar aposta potencial: ", error);
        }
    }

    // Deleta uma Aposta Real
    window.deleteBet = async function(id) {
        if (!id) return console.error("ID inválido para exclusão");
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${currentUserId}/bets`, id));
            console.log("Aposta real deletada!");
        } catch (error) {
            console.error("Erro ao deletar aposta real: ", error);
        }
    }

    // (NOVO) Abre o Modal de Edição de Aposta Real
    window.openEditBetModal = function(id) {
        const bet = allBets.find(b => b.id === id);
        if (!bet) {
            console.error("Aposta não encontrada para editar");
            return;
        }
        editBetIdInput.value = id;
        editBetDescriptionInput.value = bet.description;
        editBetAmountInput.value = bet.amount;
        editReturnAmountInput.value = bet.returned_actual;
        editBetModal.classList.remove('hidden');
    }

    // (NOVO) Fecha o Modal de Edição de Aposta Real
    function closeEditBetModal() {
        editBetModal.classList.add('hidden');
    }

    // (NOVO) Salva as Alterações da Aposta Real
    async function handleSaveBetChanges(e) {
        e.preventDefault();
        const id = editBetIdInput.value;
        const amount = parseFloat(editBetAmountInput.value);
        const returned_actual = parseFloat(editReturnAmountInput.value);
        
        if (!id || isNaN(amount) || isNaN(returned_actual)) return;

        const profit_actual = returned_actual - amount;
        const updatedData = {
            description: editBetDescriptionInput.value || 'Aposta',
            amount: amount,
            returned_actual: returned_actual,
            profit_actual: profit_actual
        };

        try {
            const betDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/bets`, id);
            await updateDoc(betDocRef, updatedData);
            console.log("Aposta real atualizada!");
            closeEditBetModal();
        } catch (error) {
            console.error("Erro ao atualizar aposta real: ", error);
        }
    }


    // Deleta uma Aposta Potencial
    window.deletePotentialBet = async function(id) {
        if (!id) return console.error("ID inválido para exclusão");
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${currentUserId}/potentialBets`, id));
            console.log("Aposta potencial deletada!");
        } catch (error) {
            console.error("Erro ao deletar aposta potencial: ", error);
        }
    }

    // (NOVO) Abre o Modal de Edição de Aposta Potencial
    window.openEditPotentialModal = function(id) {
        const bet = allPotentialBets.find(b => b.id === id);
        if (!bet) {
            console.error("Aposta potencial não encontrada para editar");
            return;
        }
        editPotentialIdInput.value = id;
        editPotentialAmountInput.value = bet.amount;
        editPotentialReturnInput.value = bet.returned_potential;
        editPotentialModal.classList.remove('hidden');
    }

    // (NOVO) Fecha o Modal de Edição de Aposta Potencial
    function closeEditPotentialModal() {
        editPotentialModal.classList.add('hidden');
    }

    // (NOVO) Salva as Alterações da Aposta Potencial
    async function handleSavePotentialChanges(e) {
        e.preventDefault();
        const id = editPotentialIdInput.value;
        const amount = parseFloat(editPotentialAmountInput.value);
        const returned_potential = parseFloat(editPotentialReturnInput.value);
        
        if (!id || isNaN(amount) || isNaN(returned_potential)) return;

        const profit_potential = returned_potential - amount;
        const updatedData = {
            amount: amount,
            returned_potential: returned_potential,
            profit_potential: profit_potential
        };

        try {
            const betDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/potentialBets`, id);
            await updateDoc(betDocRef, updatedData);
            console.log("Aposta potencial atualizada!");
            closeEditPotentialModal();
        } catch (error) {
            console.error("Erro ao atualizar aposta potencial: ", error);
        }
    }


    // Registra o resultado (Green/Red) na Simulação
    async function recordSimBet(index, resultType) {
        const tempBet = getTempSimBet(index);
        if (tempBet.stake <= 0 || tempBet.odd <= 0) return; // Não registra se inválido
        
        let targetCollection;
        if (index === 1) targetCollection = simBets1CollectionRef;
        else if (index === 2) targetCollection = simBets2CollectionRef;
        else targetCollection = simBets3CollectionRef;

        const newBet = {
            stake: tempBet.stake,
            odd: tempBet.odd,
            result: resultType,
            profit: (resultType === 'green') ? tempBet.profit : tempBet.loss,
            createdAt: serverTimestamp()
        };
        
        try {
            await addDoc(targetCollection, newBet);
            console.log(`Simulação (Est. ${index}) adicionada!`);
            // Limpa o formulário e reseta
            document.getElementById(`sim-form-${index}`).reset();
            calculateSimReturn(index);
            // O onSnapshot vai cuidar da atualização da UI
        } catch (error) {
            console.error(`Erro ao adicionar simulação (Est. ${index}): `, error);
        }
    }

    // Deleta uma Simulação
    window.deleteSimBet = async function(index, id) {
        if (!id) return console.error("ID inválido para exclusão");
        
        let targetCollectionPath;
        if (index === 1) targetCollectionPath = `simBets1`;
        else if (index === 2) targetCollectionPath = `simBets2`;
        else targetCollectionPath = `simBets3`;
        
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${currentUserId}/${targetCollectionPath}`, id));
            console.log(`Simulação (Est. ${index}) deletada!`);
            // O onSnapshot vai cuidar da atualização da UI
        } catch (error) {
            console.error(`Erro ao deletar simulação (Est. ${index}): `, error);
        }
    }

    // (NOVO) Abre o Modal de Edição de Simulação
    window.openEditSimModal = function(index, id) {
        const betList = getStrategyBetList(index);
        const bet = betList.find(b => b.id === id);
        if (!bet) {
            console.error("Simulação não encontrada para editar");
            return;
        }
        editSimIdInput.value = id;
        editSimIndexInput.value = index;
        editSimStakeInput.value = bet.stake;
        editSimOddInput.value = bet.odd;
        editSimResultInput.value = bet.result;
        editSimModal.classList.remove('hidden');
    }

    // (NOVO) Fecha o Modal de Edição de Simulação
    function closeEditSimModal() {
        editSimModal.classList.add('hidden');
    }

    // (NOVO) Salva as Alterações da Simulação
    async function handleSaveSimChanges(e) {
        e.preventDefault();
        const id = editSimIdInput.value;
        const index = parseInt(editSimIndexInput.value);
        const stake = parseFloat(editSimStakeInput.value);
        const odd = parseFloat(editSimOddInput.value);
        const result = editSimResultInput.value;

        if (!id || !index || isNaN(stake) || isNaN(odd) || !result) return;

        // Recalcula o lucro
        const potentialReturn = stake * odd;
        const profit = (result === 'green') ? (potentialReturn - stake) : -stake;
        
        const updatedData = {
            stake: stake,
            odd: odd,
            result: result,
            profit: profit
        };

        let targetCollectionPath;
        if (index === 1) targetCollectionPath = `simBets1`;
        else if (index === 2) targetCollectionPath = `simBets2`;
        else targetCollectionPath = `simBets3`;

        try {
            const simDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/${targetCollectionPath}`, id);
            await updateDoc(simDocRef, updatedData);
            console.log(`Simulação (Est. ${index}) atualizada!`);
            closeEditSimModal();
        } catch (error) {
            console.error(`Erro ao atualizar simulação (Est. ${index}): `, error);
        }
    }


    // --- EVENT LISTENERS (Formulários, Filtros, etc) ---
    // (O onSnapshot já lida com a atualização dos dados,
    // então os event listeners agora apenas *enviam* dados para o Firebase)
    initialBalanceInput.addEventListener('blur', saveInitialBalance);
    betForm.addEventListener('submit', addBet);
    potentialBetForm.addEventListener('submit', addPotentialBet);

    // (NOVOS) Listeners dos Modais
    editBetForm.addEventListener('submit', handleSaveBetChanges);
    cancelEditBetBtn.addEventListener('click', closeEditBetModal);
    editPotentialForm.addEventListener('submit', handleSavePotentialChanges);
    cancelEditPotentialBtn.addEventListener('click', closeEditPotentialModal);
    editSimForm.addEventListener('submit', handleSaveSimChanges);
    cancelEditSimBtn.addEventListener('click', closeEditSimModal);


    filterAllBtn.addEventListener('click', () => applyFilter('all'));
    filterTodayBtn.addEventListener('click', () => applyFilter('today'));
    filterWeekBtn.addEventListener('click', () => applyFilter('week'));
    filterMonthBtn.addEventListener('click', () => applyFilter('month'));

    // Estratégia 1
    document.getElementById('sim-stake-1').addEventListener('input', () => calculateSimReturn(1));
    document.getElementById('sim-odd-1').addEventListener('input', () => calculateSimReturn(1));
    document.getElementById('sim-green-1').addEventListener('click', () => recordSimBet(1, 'green'));
    document.getElementById('sim-red-1').addEventListener('click', () => recordSimBet(1, 'red'));
    
    // Estratégia 2
    document.getElementById('sim-stake-2').addEventListener('input', () => calculateSimReturn(2));
    document.getElementById('sim-odd-2').addEventListener('input', () => calculateSimReturn(2));
    document.getElementById('sim-green-2').addEventListener('click', () => recordSimBet(2, 'green'));
    document.getElementById('sim-red-2').addEventListener('click', () => recordSimBet(2, 'red'));
    
    // Estratégia 3
    document.getElementById('sim-stake-3').addEventListener('input', () => calculateSimReturn(3));
    document.getElementById('sim-odd-3').addEventListener('input', () => calculateSimReturn(3));
    document.getElementById('sim-green-3').addEventListener('click', () => recordSimBet(3, 'green'));
    document.getElementById('sim-red-3').addEventListener('click', () => recordSimBet(3, 'red'));

    
    // --- FUNÇÕES DE RENDERIZAÇÃO (Quase inalteradas, mas agora usam 'allBets' global) ---
    
    function showView(viewId) {
        viewInicio.classList.add('hidden');
        viewEstrategia.classList.add('hidden');
        navLinks.forEach(link => {
            link.classList.remove('text-green-400', 'font-bold');
            link.classList.add('text-gray-300', 'hover:text-white');
        });
        
        if (viewId === 'inicio') {
            viewInicio.classList.remove('hidden');
            navInicio.classList.add('text-green-400', 'font-bold');
            navInicio.classList.remove('text-gray-300', 'hover:text-white');
            // Re-renderiza gráficos principais ao mostrar a view
            renderBalanceChart();
            renderPotentialChart();
        } else if (viewId === 'estrategia') {
            viewEstrategia.classList.remove('hidden');
            navEstrategia.classList.add('text-green-400', 'font-bold');
            navEstrategia.classList.remove('text-gray-300', 'hover:text-white');
            // Re-renderiza gráficos de simulação ao mostrar a view
            renderStrategySimulation(1);
            renderStrategySimulation(2);
            renderStrategySimulation(3);
        }
    }

    function formatCurrency(value) {
        const isNegative = value < 0;
        const formatted = Math.abs(value).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        return isNegative ? `-${formatted}` : formatted;
    }

    function getFilterStartDate(filterType) {
        switch (filterType) {
            case 'today': return startOfDay;
            case 'week': return startOfWeek;
            case 'month': return startOfMonth;
            default: return new Date(0); // Epoch start (inclui tudo)
        }
    }
    
    function getProfitClass(value) {
        return value > 0 ? 'text-green-600' : (value < 0 ? 'text-red-600' : 'text-gray-500');
    }

    function applyFilter(filterType) {
        currentFilter = filterType;
        
        const filterStartDate = getFilterStartDate(currentFilter);

        // Filtra os dados (que já foram carregados pelo onSnapshot)
        // **IMPORTANTE**: Agora filtramos por `bet.createdAt` (que é um objeto Date)
        filteredBets = allBets.filter(bet => bet.createdAt >= filterStartDate);
        filteredPotentialBets = allPotentialBets.filter(bet => bet.createdAt >= filterStartDate);
        
        updateFilterButtons();
        updateSummary();
        renderHistory();
        renderPotentialHistory();
        renderBalanceChart(); // Gráfico 1 (Real)
        renderPotentialChart(); // Gráfico 2 (Comparativo)
    }

    function updateFilterButtons() {
        const periodTextMap = {
            'all': '(Período: Tudo)', 'today': '(Período: Hoje)',
            'week': '(Período: Esta Semana)', 'month': '(Período: Este Mês)',
        };
        if (winningsPeriodEl) winningsPeriodEl.textContent = periodTextMap[currentFilter];
        if (lossesPeriodEl) lossesPeriodEl.textContent = periodTextMap[currentFilter];

        filterButtons.forEach(btn => {
            if(btn) {
                btn.classList.remove('bg-green-600', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
            }
        });
        
        let activeBtn;
        if (currentFilter === 'today') activeBtn = filterTodayBtn;
        else if (currentFilter === 'week') activeBtn = filterWeekBtn;
        else if (currentFilter === 'month') activeBtn = filterMonthBtn;
        else activeBtn = filterAllBtn;
        
        if(activeBtn) {
            activeBtn.classList.add('bg-green-600', 'text-white');
            activeBtn.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        }
    }

    function updateSummary() {
        // Usa 'filteredBets' (baseado no período)
        let filteredWinnings = 0, filteredLosses = 0;
        filteredBets.forEach(bet => {
            if (bet.profit_actual > 0) filteredWinnings += bet.profit_actual;
            else filteredLosses += bet.profit_actual;
        });
        totalWinningsEl.textContent = formatCurrency(filteredWinnings);
        totalLossesEl.textContent = formatCurrency(filteredLosses);

        // Usa 'allBets' (completo) para o saldo total
        let totalProfitLoss = 0;
        allBets.forEach(bet => { totalProfitLoss += bet.profit_actual; });
        const totalBalance = initialBalance + totalProfitLoss;
        totalBalanceEl.textContent = formatCurrency(totalBalance);

        totalBalanceEl.classList.remove('text-green-800', 'text-red-800', 'text-blue-800');
        if (totalBalance > initialBalance) totalBalanceEl.classList.add('text-green-800');
        else if (totalBalance < initialBalance) totalBalanceEl.classList.add('text-red-800');
        else totalBalanceEl.classList.add('text-blue-800');
    }

    function renderHistory() {
        historyBody.innerHTML = '';
        if (filteredBets.length === 0) {
            emptyRow.style.display = 'table-row';
        } else {
            emptyRow.style.display = 'none';
            // Os dados já vêm ordenados do onSnapshot (desc)
            filteredBets.forEach(bet => {
                const row = document.createElement('tr');
                row.classList.add('fade-in');
                const profitClassActual = getProfitClass(bet.profit_actual);
                // **IMPORTANTE**: onclick agora usa `bet.id` (string)
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${bet.description || 'Aposta'}</div>
                        <div class="text-xs text-gray-500">${bet.createdAt.toLocaleString('pt-BR')}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(bet.amount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(bet.returned_actual)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${profitClassActual}">${formatCurrency(bet.profit_actual)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="openEditBetModal('${bet.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Editar Aposta">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                            </svg>
                        </button>
                        <button onclick="deleteBet('${bet.id}')" class="text-red-500 hover:text-red-700 inline-flex" title="Excluir Aposta">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </td>
                `;
                historyBody.appendChild(row);
            });
        }
    }
    
    function renderPotentialHistory() {
        potentialHistoryBody.innerHTML = '';
        if (filteredPotentialBets.length === 0) {
            emptyPotentialRow.style.display = 'table-row';
        } else {
            emptyPotentialRow.style.display = 'none';
            // Os dados já vêm ordenados do onSnapshot (desc)
            filteredPotentialBets.forEach(bet => {
                const row = document.createElement('tr');
                row.classList.add('fade-in');
                const profitClassPotential = getProfitClass(bet.profit_potential);
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${bet.createdAt.toLocaleString('pt-BR')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(bet.amount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(bet.returned_potential)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${profitClassPotential}">${formatCurrency(bet.profit_potential)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="openEditPotentialModal('${bet.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Editar Simulação">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                            </svg>
                        </button>
                        <button onclick="deletePotentialBet('${bet.id}')" class="text-red-500 hover:text-red-700 inline-flex" title="Excluir Simulação">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </td>
                `;
                potentialHistoryBody.appendChild(row);
            });
        }
    }
    
    function renderBalanceChart() {
        if (balanceChart) balanceChart.destroy();
        
        const filterStartDate = getFilterStartDate(currentFilter);
        
        // Calcula o saldo antes do período do filtro
        let balanceBeforeFilter = initialBalance;
        allBets.forEach(bet => {
            if (bet.createdAt < filterStartDate) {
                balanceBeforeFilter += bet.profit_actual;
            }
        });
        
        // Filtra as apostas *dentro* do período e reverte (para o gráfico)
        const reversedFilteredBets = [...allBets.filter(bet => bet.createdAt >= filterStartDate)].reverse();
        
        const labels = ['Início do Período'];
        const data = [balanceBeforeFilter];
        let currentBalance = balanceBeforeFilter;
        
        reversedFilteredBets.forEach((bet) => {
            currentBalance += bet.profit_actual;
            labels.push(`Aposta (${bet.createdAt.toLocaleDateString('pt-BR')})`);
            data.push(currentBalance);
        });
        
        if (reversedFilteredBets.length === 0) {
             labels.push('Fim do Período');
             data.push(balanceBeforeFilter);
        }
        
        balanceChart = new Chart(balanceChartCtx, { 
            type: 'line', data: { labels: labels,
                datasets: [{ label: 'Evolução da Banca (Real)', data: data,
                    borderColor: (context) => {
                        const finalBalance = data[data.length - 1] || balanceBeforeFilter;
                        if(finalBalance > data[0]) return 'rgb(22, 163, 74)';
                        if(finalBalance < data[0]) return 'rgb(220, 38, 38)';
                        return 'rgb(37, 99, 235)';
                    },
                    backgroundColor: 'rgba(37, 99, 235, 0.1)', fill: true, tension: 0.1, pointRadius: 4, pointBackgroundColor: 'rgb(255, 255, 255)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: true,
                scales: { y: { beginAtZero: false, ticks: { callback: (value) => formatCurrency(value) } }, x: { ticks: { autoSkip: true, maxTicksLimit: 10 } } },
                plugins: { tooltip: { callbacks: { label: (context) => `${context.dataset.label || ''}: ${formatCurrency(context.parsed.y)}` } } }
            }
        });
    }
    
    function renderPotentialChart() {
        if (potentialBalanceChart) potentialBalanceChart.destroy();
        
        const filterStartDate = getFilterStartDate(currentFilter);
        
        // Linha "Real"
        let balanceBeforeFilter_Actual = initialBalance;
        allBets.forEach(bet => {
            if (bet.createdAt < filterStartDate) balanceBeforeFilter_Actual += bet.profit_actual;
        });
        const reversedFilteredBets = [...allBets.filter(bet => bet.createdAt >= filterStartDate)].reverse();
        const data_actual = [balanceBeforeFilter_Actual];
        let currentBalance_Actual = balanceBeforeFilter_Actual;

        // Linha "Potencial"
        let balanceBeforeFilter_Potential = initialBalance;
        allPotentialBets.forEach(bet => {
            if (bet.createdAt < filterStartDate) balanceBeforeFilter_Potential += bet.profit_potential;
        });
        const reversedFilteredPotentialBets = [...allPotentialBets.filter(bet => bet.createdAt >= filterStartDate)].reverse();
        const data_potential = [balanceBeforeFilter_Potential];
        let currentBalance_Potential = balanceBeforeFilter_Potential;

        const maxLen = Math.max(reversedFilteredBets.length, reversedFilteredPotentialBets.length);
        const labels = ['Início do Período'];
        
        for (let i = 0; i < maxLen; i++) {
            labels.push(`Evento #${i + 1}`);
            if (reversedFilteredBets[i]) {
                currentBalance_Actual += reversedFilteredBets[i].profit_actual;
            }
            data_actual.push(currentBalance_Actual);
            
            if (reversedFilteredPotentialBets[i]) {
                currentBalance_Potential += reversedFilteredPotentialBets[i].profit_potential;
            }
            data_potential.push(currentBalance_Potential);
        }

        potentialBalanceChart = new Chart(potentialChartCtx, {
            type: 'line', data: { labels: labels,
                datasets: [
                    { label: 'Saldo Real (Cashout)', data: data_actual, borderColor: 'rgb(37, 99, 235)', backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: false, tension: 0.1, pointRadius: 4, pointBackgroundColor: 'rgb(255, 255, 255)' },
                    { label: 'Saldo Potencial (Simulado)', data: data_potential, borderColor: 'rgb(22, 163, 74)', backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        fill: false, tension: 0.1, pointRadius: 4, pointBackgroundColor: 'rgb(255, 255, 255)' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: true,
                scales: { y: { beginAtZero: false, ticks: { callback: (value) => formatCurrency(value) } }, x: { ticks: { autoSkip: true, maxTicksLimit: 10 } } },
                plugins: { tooltip: { callbacks: { label: (context) => `${context.dataset.label || ''}: ${formatCurrency(context.parsed.y)}` } } }
            }
        });
    }


    // --- LÓGICA: SIMULAÇÃO DE ESTRATÉGIA (Quase inalterada) ---
    
    // Estado temporário (para os formulários)
    let tempSimBet1 = { stake: 0, odd: 0, profit: 0, loss: 0 };
    let tempSimBet2 = { stake: 0, odd: 0, profit: 0, loss: 0 };
    let tempSimBet3 = { stake: 0, odd: 0, profit: 0, loss: 0 };

    function getStrategyBetList(index) {
        if (index === 1) return strategy1Bets;
        if (index === 2) return strategy2Bets;
        if (index === 3) return strategy3Bets;
    }
    
    function getTempSimBet(index) {
        if (index === 1) return tempSimBet1;
        if (index === 2) return tempSimBet2;
        if (index === 3) return tempSimBet3;
    }

    function calculateSimReturn(index) {
        const stakeInput = document.getElementById(`sim-stake-${index}`);
        const oddInput = document.getElementById(`sim-odd-${index}`);
        const returnEl = document.getElementById(`sim-return-${index}`);
        const greenBtn = document.getElementById(`sim-green-${index}`);
        const redBtn = document.getElementById(`sim-red-${index}`);
        
        const stake = parseFloat(stakeInput.value) || 0;
        const odd = parseFloat(oddInput.value) || 0;
        
        const potentialReturn = stake * odd;
        const profit = potentialReturn - stake;
        const loss = -stake;
        
        const tempBet = getTempSimBet(index);
        tempBet.stake = stake;
        tempBet.odd = odd;
        tempBet.profit = profit;
        tempBet.loss = loss;
        
        returnEl.textContent = formatCurrency(potentialReturn);
        
        if (stake > 0 && odd > 0) {
            greenBtn.disabled = false;
            redBtn.disabled = false;
        } else {
            greenBtn.disabled = true;
            redBtn.disabled = true;
        }
    }
    
    function renderStrategySimulation(index) {
        const betList = getStrategyBetList(index); // Pega os dados globais atualizados pelo onSnapshot
        const chartCtx = document.getElementById(`sim-chart-${index}`).getContext('2d');
        let chartInstance = null;
        if (index === 1) chartInstance = simChart1;
        if (index === 2) chartInstance = simChart2;
        if (index === 3) chartInstance = simChart3;

        const summaryEl = document.getElementById(`sim-summary-${index}`);
        const historyBody = document.getElementById(`sim-history-${index}`);
        
        // 1. Renderizar Tabela de Histórico (Últimos 5)
        historyBody.innerHTML = '';
        if (betList.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="3" class="p-2 text-center text-gray-500">Nenhuma simulação.</td></tr>`;
        } else {
            const recentBets = betList.slice(0, 5); // Pega os 5 mais recentes (já está ordenado desc)
            recentBets.forEach(bet => {
                const row = document.createElement('tr');
                const profitClass = getProfitClass(bet.profit);
                const resultClass = bet.result === 'green' ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
                row.classList.add('fade-in');
                // **IMPORTANTE**: onclick agora usa `bet.id` (string)
                row.innerHTML = `
                    <td class="p-2 ${resultClass}">${bet.result === 'green' ? 'Green' : 'Red'}</td>
                    <td class="p-2 ${profitClass}">${formatCurrency(bet.profit)}</td>
                    <td class="p-2 text-right">
                        <button onclick="openEditSimModal(${index}, '${bet.id}')" class="text-gray-500 hover:text-blue-600 mr-2" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                        </button>
                        <button onclick="deleteSimBet(${index}, '${bet.id}')" class="text-gray-400 hover:text-red-500 inline-flex" title="Excluir">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </td>
                `;
                historyBody.appendChild(row);
            });
        }
        
        // 2. Renderizar Sumário
        const totalProfit = betList.reduce((acc, bet) => acc + bet.profit, 0);
        summaryEl.textContent = `Lucro Total: ${formatCurrency(totalProfit)}`;
        summaryEl.className = `text-lg font-bold ${getProfitClass(totalProfit)}`;
        
        // 3. Renderizar Gráfico
        if (chartInstance) chartInstance.destroy();
        
        const labels = ['Início'];
        const data = [0];
        let currentProfit = 0;
        
        // Inverte para calcular do mais antigo para o mais novo
        [...betList].reverse().forEach(bet => {
            currentProfit += bet.profit;
            labels.push(bet.createdAt.toLocaleDateString('pt-BR'));
            data.push(currentProfit);
        });

        chartInstance = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Evolução (Est. ${index})`,
                    data: data,
                    borderColor: totalProfit > 0 ? 'rgb(22, 163, 74)' : (totalProfit < 0 ? 'rgb(220, 38, 38)' : 'rgb(107, 114, 128)'),
                    backgroundColor: totalProfit > 0 ? 'rgba(22, 163, 74, 0.1)' : (totalProfit < 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(107, 114, 128, 0.1)'),
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { ticks: { callback: (value) => formatCurrency(value) } }, 
                    x: { ticks: { autoSkip: true, maxTicksLimit: 6 } } 
                },
                plugins: { tooltip: { callbacks: { label: (context) => `Lucro: ${formatCurrency(context.parsed.y)}` } } }
            }
        });
        
        // Armazena a instância do gráfico
        if (index === 1) simChart1 = chartInstance;
        if (index === 2) simChart2 = chartInstance;
        if (index === 3) simChart3 = chartInstance;
    }
}
