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
    orderBy, // Importado mas não usado na query principal
    setLogLevel,
    updateDoc // Importa a função de atualização
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
// setLogLevel('debug'); // Descomente para depuração profunda do Firestore

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
    
// Constantes de data (movidas para o topo para acesso global)
const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Segunda como início da semana
startOfWeek.setHours(0, 0, 0, 0);
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

// --- MODAIS DE EDIÇÃO (REFERÊNCIAS) ---
const modalBackdrop = document.getElementById('modal-backdrop');
// Modal 1: Editar Aposta Real
const editBetModal = document.getElementById('edit-bet-modal');
const editBetForm = document.getElementById('edit-bet-form');
const cancelEditBetBtn = document.getElementById('cancel-edit-bet');
// Modal 2: Editar Aposta Potencial
const editPotentialModal = document.getElementById('edit-potential-modal');
const editPotentialForm = document.getElementById('edit-potential-form');
const cancelEditPotentialBtn = document.getElementById('cancel-edit-potential');
// Modal 3: Editar Simulação de Estratégia
const editSimModal = document.getElementById('edit-sim-modal');
const editSimForm = document.getElementById('edit-sim-form');
const cancelEditSimBtn = document.getElementById('cancel-edit-sim');


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
    navEstrategia.addEventListener('click', (e) => { e.preventDefault(); showView('estrategia'); }); // CORRIGIDO (era navEstrategIA)

    // --- CONFIGURA LISTENERS DE DADOS (ONSNAPSHOT) ---
    // O onSnapshot atualiza os dados em tempo real
    
    // 1. Configurações (Saldo Inicial)
    onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const settings = docSnap.data();
            initialBalance = settings.initialBalance || 0;
            initialBalanceInput.value = initialBalance.toFixed(2);
        } else {
            console.log("Documento de configurações não encontrado, criando um novo...");
            initialBalance = 0;
            initialBalanceInput.value = "0.00";
        }
        // Atualiza a UI após carregar o saldo
        applyFilter(currentFilter); // Recalcula totais e gráficos
    }, (error) => console.error("Erro ao ouvir 'settings':", error));
    
    // 2. Apostas Reais (Bets)
    onSnapshot(query(betsCollectionRef), (snapshot) => { // (CORREÇÃO) REMOVIDO: orderBy('createdAt', 'desc')
        allBets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            allBets.push({
                id: doc.id,
                ...data,
                // Converte Timestamp do Firebase para Date, ou usa Date atual se não houver
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (CORREÇÃO) Ordena os dados no JavaScript (mais novo primeiro)
        allBets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        // Após atualizar os dados, re-renderiza tudo
        applyFilter(currentFilter);
        console.log("Apostas reais carregadas:", allBets.length);
    }, (error) => console.error("Erro ao ouvir 'bets':", error));

    // 3. Apostas Potenciais
    onSnapshot(query(potentialBetsCollectionRef), (snapshot) => { // (CORREÇÃO) REMOVIDO: orderBy('createdAt', 'desc')
        allPotentialBets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            allPotentialBets.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (CORREÇÃO) Ordena os dados no JavaScript (mais novo primeiro)
        allPotentialBets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        applyFilter(currentFilter); // Re-renderiza gráficos e tabela
        console.log("Apostas potenciais carregadas:", allPotentialBets.length);
    }, (error) => console.error("Erro ao ouvir 'potentialBets':", error));
    
    // 4. Simulação Estratégia 1
    onSnapshot(query(simBets1CollectionRef), (snapshot) => { // (CORREÇÃO) REMOVIDO: orderBy('createdAt', 'desc')
        strategy1Bets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            strategy1Bets.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (CORREÇÃO) Ordena os dados no JavaScript (mais novo primeiro)
        strategy1Bets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        // Re-renderiza a UI dessa estratégia
        renderStrategySimulation(1);
        console.log("Simulações Est. 1 carregadas:", strategy1Bets.length);
    }, (error) => console.error("Erro ao ouvir 'simBets1':", error));

    // 5. Simulação Estratégia 2
    onSnapshot(query(simBets2CollectionRef), (snapshot) => { // (CORREÇÃO) REMOVIDO: orderBy('createdAt', 'desc')
        strategy2Bets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            strategy2Bets.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (CORREÇÃO) Ordena os dados no JavaScript (mais novo primeiro)
        strategy2Bets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        renderStrategySimulation(2);
        console.log("Simulações Est. 2 carregadas:", strategy2Bets.length);
    }, (error) => console.error("Erro ao ouvir 'simBets2':", error));

    // 6. Simulação Estratégia 3
    onSnapshot(query(simBets3CollectionRef), (snapshot) => { // (CORREÇÃO) REMOVIDO: orderBy('createdAt', 'desc')
        strategy3Bets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            strategy3Bets.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date() 
            });
        });
        // (CORREÇÃO) Ordena os dados no JavaScript (mais novo primeiro)
        strategy3Bets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        renderStrategySimulation(3);
        console.log("Simulações Est. 3 carregadas:", strategy3Bets.length);
    }, (error) => console.error("Erro ao ouvir 'simBets3':", error));

    
    // --- LISTENERS DE EVENTOS (FORMULÁRIOS, BOTÕES, ETC.) ---

    // Salvar Saldo Inicial (ao perder o foco)
    initialBalanceInput.addEventListener('change', () => {
        const newBalance = parseFloat(initialBalanceInput.value) || 0;
        setDoc(settingsDocRef, { initialBalance: newBalance }, { merge: true })
            .then(() => {
                console.log("Saldo inicial salvo:", newBalance);
            })
            .catch(e => console.error("Erro ao salvar saldo inicial:", e));
    });

    // Filtros de Data
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => {
                btn.classList.remove('bg-green-600', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
            });
            button.classList.add('bg-green-600', 'text-white');
            button.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
            currentFilter = button.id.replace('filter-', '');
            applyFilter(currentFilter);
        });
    });

    // Formulário: Adicionar Aposta Real
    betForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = descriptionInput.value || 'Aposta';
        const amount = parseFloat(amountInput.value);
        const returned = parseFloat(returnInput.value);

        if (isNaN(amount) || isNaN(returned)) {
            alert("Por favor, insira valores numéricos válidos.");
            return;
        }

        const newBet = {
            description: description,
            amount: amount,
            returned: returned,
            profit: returned - amount,
            createdAt: serverTimestamp() // Usa a data do servidor
        };

        addDoc(betsCollectionRef, newBet)
            .then(() => {
                console.log("Aposta real adicionada!");
                betForm.reset(); // Limpa o formulário
            })
            .catch(e => console.error("Erro ao adicionar aposta:", e));
    });

    // Formulário: Adicionar Aposta Potencial
    potentialBetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(potentialAmountInput.value);
        const returned = parseFloat(potentialReturnInput.value);

        if (isNaN(amount) || isNaN(returned)) {
            alert("Por favor, insira valores numéricos válidos.");
            return;
        }

        const newPotentialBet = {
            amount: amount,
            returned: returned,
            profit: returned - amount,
            createdAt: serverTimestamp()
        };

        addDoc(potentialBetsCollectionRef, newPotentialBet)
            .then(() => {
                console.log("Aposta potencial adicionada!");
                potentialBetForm.reset();
            })
            .catch(e => console.error("Erro ao adicionar aposta potencial:", e));
    });

    // Formulários de Simulação de Estratégia (1, 2 e 3)
    setupSimulationForms(userId);

    // Listeners de Edição e Exclusão (usando delegação de eventos)
    setupEventListeners(userId);
}


// ===================================================================
// RENDERIZAÇÃO E ATUALIZAÇÃO DA UI
// ===================================================================

/**
 * Controla qual "página" (view) é exibida.
 */
function showView(viewName) {
    // Esconde todas as views
    viewInicio.classList.add('hidden');
    viewEstrategia.classList.add('hidden');
    
    // Remove a classe ativa de todos os links da nav
    navLinks.forEach(link => {
        link.classList.remove('text-green-400', 'font-bold');
        link.classList.add('text-lg', 'font-medium');
    });

    // Mostra a view e ativa o link correspondente
    if (viewName === 'inicio') {
        viewInicio.classList.remove('hidden');
        navInicio.classList.add('text-green-400', 'font-bold');
    } else if (viewName === 'estrategia') {
        viewEstrategia.classList.remove('hidden');
        navEstrategia.classList.add('text-green-400', 'font-bold');
    }
}

/**
 * Filtra os dados de apostas (allBets e allPotentialBets) com base no período selecionado.
 * @param {string} filter - 'all', 'today', 'week', 'month'
 */
function applyFilter(filter) {
    currentFilter = filter;
    let filteredBets = [];
    let filteredPotentialBets = [];

    // Define a data de corte
    let cutoffDate = new Date(0); // Início dos tempos
    let periodText = "(Período: Tudo)";
    if (filter === 'today') {
        cutoffDate = startOfDay;
        periodText = "(Período: Hoje)";
    } else if (filter === 'week') {
        cutoffDate = startOfWeek;
        periodText = "(Período: Esta Semana)";
    } else if (filter === 'month') {
        cutoffDate = startOfMonth;
        periodText = "(Período: Este Mês)";
    }
    
    // Atualiza os textos do período nos cards
    winningsPeriodEl.textContent = periodText;
    lossesPeriodEl.textContent = periodText;

    // Filtra os arrays
    filteredBets = allBets.filter(bet => bet.createdAt >= cutoffDate);
    filteredPotentialBets = allPotentialBets.filter(bet => bet.createdAt >= cutoffDate);

    // Atualiza a UI com os dados filtrados
    updateDashboard(filteredBets);
    renderBetHistory(filteredBets); // Tabela de Histórico Real
    renderPotentialHistory(filteredPotentialBets); // Tabela de Histórico Potencial
    updateBalanceChart(allBets, initialBalance); // Gráfico 1 (Real) usa *todos* os dados
    updatePotentialBalanceChart(allBets, allPotentialBets, initialBalance); // Gráfico 2 (Comparativo) usa *todos* os dados
}

/**
 * Atualiza os cards de resumo (Saldo Total, Ganhos, Perdas).
 * @param {Array} filteredBets - O array de apostas já filtrado pelo período.
 */
function updateDashboard(filteredBets) {
    // 1. Calcula Ganhos e Perdas (do período filtrado)
    let periodWinnings = 0;
    let periodLosses = 0;
    
    filteredBets.forEach(bet => {
        if (bet.profit > 0) {
            periodWinnings += bet.profit;
        } else if (bet.profit < 0) {
            periodLosses += bet.profit; // (bet.profit é negativo)
        }
    });

    // 2. Calcula Saldo Total (Banca) (usa *todas* as apostas)
    const totalProfit = allBets.reduce((acc, bet) => acc + bet.profit, 0);
    const totalBalance = initialBalance + totalProfit;

    // 3. Atualiza o HTML
    totalBalanceEl.textContent = formatCurrency(totalBalance);
    totalWinningsEl.textContent = formatCurrency(periodWinnings);
    totalLossesEl.textContent = formatCurrency(periodLosses);
    
    // Define a cor do saldo total
    totalBalanceEl.classList.toggle('text-green-800', totalBalance >= initialBalance);
    totalBalanceEl.classList.toggle('text-red-800', totalBalance < initialBalance);
    totalBalanceEl.classList.toggle('text-blue-800', totalBalance === initialBalance && totalProfit === 0);
}

/**
 * Renderiza a tabela "Histórico de Apostas (Real)".
 * @param {Array} filteredBets - O array de apostas já filtrado pelo período.
 */
function renderBetHistory(filteredBets) {
    historyBody.innerHTML = ''; // Limpa a tabela

    if (filteredBets.length === 0) {
        emptyRow.classList.remove('hidden');
        return;
    }
    
    emptyRow.classList.add('hidden');

    filteredBets.forEach(bet => {
        const row = document.createElement('tr');
        row.className = 'fade-in';
        
        const profitColor = bet.profit > 0 ? 'text-green-600' : (bet.profit < 0 ? 'text-red-600' : 'text-gray-700');
        const profitSign = bet.profit > 0 ? '+' : '';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${bet.description}
                <span class="block text-xs text-gray-500">${formatDate(bet.createdAt)}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(bet.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(bet.returned)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${profitColor}">
                ${profitSign}${formatCurrency(bet.profit)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="edit-bet-btn text-blue-600 hover:text-blue-900" data-id="${bet.id}">
                    <ion-icon name="create-outline" class="text-lg"></ion-icon>
                </button>
                <button class="delete-bet-btn text-red-600 hover:text-red-900 ml-2" data-id="${bet.id}">
                    <ion-icon name="trash-outline" class="text-lg"></ion-icon>
                </button>
            </td>
        `;
        historyBody.appendChild(row);
    });
}

/**
 * Renderiza a tabela "Histórico de Simulações (Potencial)".
 * @param {Array} filteredPotentialBets - O array de apostas potenciais já filtrado.
 */
function renderPotentialHistory(filteredPotentialBets) {
    potentialHistoryBody.innerHTML = ''; // Limpa a tabela

    if (filteredPotentialBets.length === 0) {
        emptyPotentialRow.classList.remove('hidden');
        return;
    }
    
    emptyPotentialRow.classList.add('hidden');

    filteredPotentialBets.forEach(bet => {
        const row = document.createElement('tr');
        row.className = 'fade-in';
        
        const profitColor = bet.profit > 0 ? 'text-green-600' : (bet.profit < 0 ? 'text-red-600' : 'text-gray-700');
        const profitSign = bet.profit > 0 ? '+' : '';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatDate(bet.createdAt)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(bet.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(bet.returned)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${profitColor}">
                ${profitSign}${formatCurrency(bet.profit)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="edit-potential-btn text-blue-600 hover:text-blue-900" data-id="${bet.id}">
                    <ion-icon name="create-outline" class="text-lg"></ion-icon>
                </button>
                <button class="delete-potential-btn text-red-600 hover:text-red-900 ml-2" data-id="${bet.id}">
                    <ion-icon name="trash-outline" class="text-lg"></ion-icon>
                </button>
            </td>
        `;
        potentialHistoryBody.appendChild(row);
    });
}

/**
 * Atualiza o Gráfico 1: Evolução da Banca (Real).
 * @param {Array} allBets - Array com *todas* as apostas reais.
 * @param {number} startBalance - O saldo inicial.
 */
function updateBalanceChart(allBets, startBalance) {
    // Ordena as apostas da mais antiga para a mais nova para o gráfico
    const sortedBets = [...allBets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const labels = ['Início'];
    const dataPoints = [startBalance];
    let currentBalance = startBalance;

    sortedBets.forEach((bet, index) => {
        currentBalance += bet.profit;
        labels.push(`Aposta ${index + 1}`);
        dataPoints.push(currentBalance);
    });

    // Destrói o gráfico antigo se ele existir (para evitar sobreposição)
    if (balanceChart) {
        balanceChart.destroy();
    }

    // Cria o novo gráfico
    balanceChart = new Chart(balanceChartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Saldo Real (Banca)',
                data: dataPoints,
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderColor: 'rgba(22, 163, 74, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointBackgroundColor: 'rgba(22, 163, 74, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        // Formata o eixo Y como R$
                        callback: (value) => formatCurrency(value)
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `Saldo: ${formatCurrency(context.parsed.y)}`
                    }
                }
            }
        }
    });
}

/**
 * Atualiza o Gráfico 2: Comparativo (Real vs. Potencial).
 * @param {Array} allBets - *Todas* as apostas reais.
 * @param {Array} allPotentialBets - *Todas* as apostas potenciais.
 * @param {number} startBalance - O saldo inicial.
 */
function updatePotentialBalanceChart(allBets, allPotentialBets, startBalance) {
    // Ordena ambos os arrays por data (mais antigo primeiro)
    const sortedRealBets = [...allBets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const sortedPotentialBets = [...allPotentialBets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Calcula os data points para o Saldo Real (idêntico ao Gráfico 1)
    const realDataPoints = [startBalance];
    let currentRealBalance = startBalance;
    sortedRealBets.forEach(bet => {
        currentRealBalance += bet.profit;
        realDataPoints.push(currentRealBalance);
    });

    // Calcula os data points para o Saldo Potencial
    const potentialDataPoints = [startBalance];
    let currentPotentialBalance = startBalance;
    sortedPotentialBets.forEach(bet => {
        currentPotentialBalance += bet.profit;
        potentialDataPoints.push(currentPotentialBalance);
    });

    // Garante que ambos os datasets tenham o mesmo comprimento para o gráfico
    const maxLen = Math.max(realDataPoints.length, potentialDataPoints.length);
    // Preenche o array menor com o último valor
    while (realDataPoints.length < maxLen) {
        realDataPoints.push(realDataPoints[realDataPoints.length - 1]);
    }
    while (potentialDataPoints.length < maxLen) {
        potentialDataPoints.push(potentialDataPoints[potentialDataPoints.length - 1]);
    }

    // Cria as labels (Aposta 1, Aposta 2...)
    const labels = ['Início'];
    for (let i = 1; i < maxLen; i++) {
        labels.push(`Aposta ${i}`);
    }

    // Destrói o gráfico antigo se ele existir
    if (potentialBalanceChart) {
        potentialBalanceChart.destroy();
    }

    // Cria o novo gráfico
    potentialBalanceChart = new Chart(potentialChartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Saldo Real (Cashout)',
                    data: realDataPoints,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: 'rgba(37, 99, 235, 1)'
                },
                {
                    label: 'Saldo Potencial (Até o Fim)',
                    data: potentialDataPoints,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(5, 150, 105, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: 'rgba(5, 150, 105, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                    }
                }
            }
        }
    });
}

/**
 * Configura os formulários de simulação de estratégia (cálculo de retorno, botões).
 */
function setupSimulationForms(userId) {
    const simCollections = [simBets1CollectionRef, simBets2CollectionRef, simBets3CollectionRef];

    // Itera sobre as 3 estratégias
    [1, 2, 3].forEach(id => {
        const form = document.getElementById(`sim-form-${id}`);
        const stakeInput = document.getElementById(`sim-stake-${id}`);
        const oddInput = document.getElementById(`sim-odd-${id}`);
        const returnEl = document.getElementById(`sim-return-${id}`);
        const greenBtn = form.querySelector('[data-result="green"]');
        const redBtn = form.querySelector('[data-result="red"]');
        const simCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/simBets${id}`);

        let stake = 0, odd = 0, potentialReturn = 0;

        // Função para calcular o retorno
        const calculateReturn = () => {
            stake = parseFloat(stakeInput.value) || 0;
            odd = parseFloat(oddInput.value) || 0;
            potentialReturn = stake * odd;
            returnEl.textContent = formatCurrency(potentialReturn);

            // Habilita/Desabilita botões
            const isValid = stake > 0 && odd > 0;
            greenBtn.disabled = !isValid;
            redBtn.disabled = !isValid;
        };

        // Calcula ao digitar
        stakeInput.addEventListener('input', calculateReturn);
        oddInput.addEventListener('input', calculateReturn);

        // Submissão do formulário (clique no Green ou Red)
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const resultType = e.submitter.dataset.result; // 'green' ou 'red'
            
            calculateReturn(); // Garante que os valores estão atualizados
            if (stake <= 0 || odd <= 0) return; // Não faz nada se inválido

            let profit = 0;
            if (resultType === 'green') {
                profit = potentialReturn - stake; // Lucro
            } else {
                profit = -stake; // Perda
            }

            const newSimBet = {
                stake: stake,
                odd: odd,
                profit: profit,
                result: resultType,
                createdAt: serverTimestamp()
            };

            addDoc(simCollectionRef, newSimBet)
                .then(() => {
                    console.log(`Simulação ${id} adicionada!`);
                    form.reset();
                    returnEl.textContent = formatCurrency(0); // Reseta o retorno
                    greenBtn.disabled = true;
                    redBtn.disabled = true;
                })
                .catch(e => console.error(`Erro ao adicionar simulação ${id}:`, e));
        });
    });
}

/**
 * Renderiza o conteúdo de uma coluna de simulação (lucro, gráfico, tabela).
 * @param {number} id - O ID da estratégia (1, 2 ou 3).
 */
function renderStrategySimulation(id) {
    let betsArray = [];
    if (id === 1) betsArray = strategy1Bets;
    else if (id === 2) betsArray = strategy2Bets;
    else if (id === 3) betsArray = strategy3Bets;

    const profitEl = document.getElementById(`sim-profit-${id}`);
    const historyBody = document.getElementById(`sim-history-${id}`);
    const chartCtx = document.getElementById(`sim-chart-${id}`).getContext('2d');
    let chartInstance = null;
    if (id === 1) chartInstance = simChart1;
    else if (id === 2) chartInstance = simChart2;
    else if (id === 3) chartInstance = simChart3;

    // 1. Calcula Lucro Total
    const totalProfit = betsArray.reduce((acc, bet) => acc + bet.profit, 0);
    profitEl.textContent = formatCurrency(totalProfit);
    profitEl.className = totalProfit > 0 ? 'font-bold text-green-700' : (totalProfit < 0 ? 'font-bold text-red-700' : 'font-bold text-gray-800');

    // 2. Renderiza Tabela de Histórico
    historyBody.innerHTML = ''; // Limpa
    // Ordena do mais novo para o mais antigo (o array já vem ordenado do onSnapshot)
    betsArray.forEach(bet => {
        const row = document.createElement('tr');
        const profitColor = bet.profit > 0 ? 'text-green-600' : 'text-red-600';
        const resultText = bet.result === 'green' ? 'Green' : 'Red';
        const profitSign = bet.profit > 0 ? '+' : '';
        row.className = 'fade-in';

        row.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap text-sm font-semibold ${profitColor}">${resultText}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm ${profitColor}">${profitSign}${formatCurrency(bet.profit)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-right text-sm">
                <button class="edit-sim-btn text-blue-600 hover:text-blue-900" data-id="${bet.id}" data-strategy-id="${id}">
                    <ion-icon name="create-outline" class="text-xs"></ion-icon>
                </button>
                <button class="delete-sim-btn text-red-600 hover:text-red-900 ml-1" data-id="${bet.id}" data-strategy-id="${id}">
                    <ion-icon name="trash-outline" class="text-xs"></ion-icon>
                </button>
            </td>
        `;
        historyBody.appendChild(row);
    });

    // 3. Renderiza Gráfico
    // Ordena do mais antigo para o mais novo para o gráfico
    const sortedBets = [...betsArray].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const labels = ['Início'];
    const dataPoints = [0]; // Começa com 0
    let currentProfit = 0;
    sortedBets.forEach((bet, index) => {
        currentProfit += bet.profit;
        labels.push(`#${index + 1}`);
        dataPoints.push(currentProfit);
    });

    if (chartInstance) {
        chartInstance.destroy(); // Destrói o antigo
    }

    const newChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Lucro Acumulado',
                data: dataPoints,
                borderColor: id === 1 ? '#10B981' : (id === 2 ? '#3B82F6' : '#84CC16'), // Cores diferentes
                borderWidth: 2,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permite que o gráfico seja menor
            height: 150, // Altura fixa
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: (value) => formatCurrency(value),
                        font: { size: 10 }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 10 }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Esconde a legenda
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Lucro: ${formatCurrency(context.parsed.y)}`
                    }
                }
            }
        }
    });

    // Armazena a nova instância do gráfico
    if (id === 1) simChart1 = newChart;
    else if (id === 2) simChart2 = newChart;
    else if (id === 3) simChart3 = newChart;
}


// ===================================================================
// LÓGICA DE EDIÇÃO E EXCLUSÃO
// ===================================================================

/**
 * Configura todos os event listeners para botões (delegação de eventos).
 */
function setupEventListeners(userId) {
    // Referências das coleções (para exclusão/edição)
    const collections = {
        bets: collection(db, `artifacts/${appId}/users/${userId}/bets`),
        potentialBets: collection(db, `artifacts/${appId}/users/${userId}/potentialBets`),
        simBets1: collection(db, `artifacts/${appId}/users/${userId}/simBets1`),
        simBets2: collection(db, `artifacts/${appId}/users/${userId}/simBets2`),
        simBets3: collection(db, `artifacts/${appId}/users/${userId}/simBets3`),
    };

    // Listener principal para cliques na área de conteúdo
    document.getElementById('content-area').addEventListener('click', (e) => {
        // Encontra o botão mais próximo que foi clicado (para delegação)
        const button = e.target.closest('button');
        if (!button) return; // Sai se não foi um clique em um botão

        // --- LÓGICA DE EXCLUSÃO ---
        if (button.classList.contains('delete-bet-btn')) {
            handleDelete(button.dataset.id, collections.bets, "Aposta Real");
        }
        if (button.classList.contains('delete-potential-btn')) {
            handleDelete(button.dataset.id, collections.potentialBets, "Aposta Potencial");
        }
        if (button.classList.contains('delete-sim-btn')) {
            const strategyId = button.dataset.strategyId;
            const simCollection = collections[`simBets${strategyId}`];
            handleDelete(button.dataset.id, simCollection, `Simulação ${strategyId}`);
        }

        // --- LÓGICA DE EDIÇÃO (ABRIR MODAL) ---
        if (button.classList.contains('edit-bet-btn')) {
            const bet = allBets.find(b => b.id === button.dataset.id);
            if (bet) openEditBetModal(bet);
        }
        if (button.classList.contains('edit-potential-btn')) {
            const bet = allPotentialBets.find(b => b.id === button.dataset.id);
            if (bet) openEditPotentialModal(bet);
        }
        if (button.classList.contains('edit-sim-btn')) {
            const strategyId = button.dataset.strategyId;
            const betsArray = [0, strategy1Bets, strategy2Bets, strategy3Bets][strategyId];
            const bet = betsArray.find(b => b.id === button.dataset.id);
            if (bet) openEditSimModal(bet, strategyId);
        }
    });

    // --- Listeners para FECHAR Modais ---
    modalBackdrop.addEventListener('click', closeAllModals);
    cancelEditBetBtn.addEventListener('click', closeAllModals);
    cancelEditPotentialBtn.addEventListener('click', closeAllModals);
    cancelEditSimBtn.addEventListener('click', closeAllModals);

    // --- Listeners para SALVAR Modais ---
    editBetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-bet-id').value;
        const description = document.getElementById('edit-bet-description').value || 'Aposta';
        const amount = parseFloat(document.getElementById('edit-bet-amount').value);
        const returned = parseFloat(document.getElementById('edit-return-amount').value);
        
        if (isNaN(amount) || isNaN(returned)) return alert("Valores inválidos.");

        const updatedData = {
            description: description,
            amount: amount,
            returned: returned,
            profit: returned - amount
        };
        
        const docRef = doc(collections.bets, id);
        updateDoc(docRef, updatedData)
            .then(() => closeAllModals())
            .catch(e => console.error("Erro ao atualizar aposta real:", e));
    });

    editPotentialForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-potential-id').value;
        const amount = parseFloat(document.getElementById('edit-potential-bet-amount').value);
        const returned = parseFloat(document.getElementById('edit-potential-return-amount').value);

        if (isNaN(amount) || isNaN(returned)) return alert("Valores inválidos.");

        const updatedData = {
            amount: amount,
            returned: returned,
            profit: returned - amount
        };

        const docRef = doc(collections.potentialBets, id);
        updateDoc(docRef, updatedData)
            .then(() => closeAllModals())
            .catch(e => console.error("Erro ao atualizar aposta potencial:", e));
    });

    editSimForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-sim-id').value;
        const strategyId = document.getElementById('edit-sim-strategy-id').value;
        const stake = parseFloat(document.getElementById('edit-sim-stake').value);
        const odd = parseFloat(document.getElementById('edit-sim-odd').value);
        const result = document.querySelector('input[name="edit-sim-result"]:checked').value;
        
        if (isNaN(stake) || isNaN(odd)) return alert("Valores inválidos.");

        let profit = 0;
        if (result === 'green') {
            profit = (stake * odd) - stake;
        } else {
            profit = -stake;
        }

        const updatedData = {
            stake: stake,
            odd: odd,
            result: result,
            profit: profit
        };
        
        const simCollection = collections[`simBets${strategyId}`];
        const docRef = doc(simCollection, id);
        updateDoc(docRef, updatedData)
            .then(() => closeAllModals())
            .catch(e => console.error("Erro ao atualizar simulação:", e));
    });
}

/**
 * Função genérica para exclusão de documentos.
 */
function handleDelete(id, collectionRef, itemName) {
    if (confirm(`Tem certeza que deseja excluir este item: ${itemName}?`)) {
        const docRef = doc(collectionRef, id);
        deleteDoc(docRef)
            .then(() => {
                console.log(`${itemName} excluído com sucesso.`);
            })
            .catch(e => console.error(`Erro ao excluir ${itemName}:`, e));
    }
}

// --- Funções para ABRIR Modais ---
function openEditBetModal(bet) {
    document.getElementById('edit-bet-id').value = bet.id;
    document.getElementById('edit-bet-description').value = bet.description;
    document.getElementById('edit-bet-amount').value = bet.amount.toFixed(2);
    document.getElementById('edit-return-amount').value = bet.returned.toFixed(2);
    modalBackdrop.classList.remove('hidden');
    editBetModal.classList.remove('hidden');
}

function openEditPotentialModal(bet) {
    document.getElementById('edit-potential-id').value = bet.id;
    document.getElementById('edit-potential-bet-amount').value = bet.amount.toFixed(2);
    document.getElementById('edit-potential-return-amount').value = bet.returned.toFixed(2);
    modalBackdrop.classList.remove('hidden');
    editPotentialModal.classList.remove('hidden');
}

function openEditSimModal(bet, strategyId) {
    document.getElementById('edit-sim-id').value = bet.id;
    document.getElementById('edit-sim-strategy-id').value = strategyId;
    document.getElementById('edit-sim-stake').value = bet.stake.toFixed(2);
    document.getElementById('edit-sim-odd').value = bet.odd.toFixed(2);
    
    if (bet.result === 'green') {
        document.getElementById('edit-sim-green').checked = true;
    } else {
        document.getElementById('edit-sim-red').checked = true;
    }
    
    modalBackdrop.classList.remove('hidden');
    editSimModal.classList.remove('hidden');
}

// --- Função para FECHAR Modais ---
function closeAllModals() {
    modalBackdrop.classList.add('hidden');
    editBetModal.classList.add('hidden');
    editPotentialModal.classList.add('hidden');
    editSimModal.classList.add('hidden');
}

// ===================================================================
// FUNÇÕES UTILITÁRIAS
// ===================================================================

/**
 * Formata um número como moeda brasileira (R$).
 * @param {number} value - O valor numérico.
 * @returns {string} - O valor formatado.
 */
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/**
 * Formata um objeto Date para uma string legível (ex: 05/08/2024, 14:30).
 * @param {Date} date - O objeto Date.
 * @returns {string} - A data formatada.
 */
function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        return "Data inválida";
    }
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
