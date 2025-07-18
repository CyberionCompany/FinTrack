document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL E GRÁFICOS ---
    const state = {
        allTransactions: [],
    };
    let statisticsChart, balanceChart;

    // --- SELETORES DE DOM ---
    const elements = {
        balanceValue: document.getElementById('balance-value'),
        incomeValue: document.getElementById('income-value'),
        expenseValue: document.getElementById('expense-value'),
        balanceProgress: document.getElementById('balance-progress'),
        incomeProgress: document.getElementById('income-progress'),
        expenseProgress: document.getElementById('expense-progress'),
        transactionList: document.getElementById('transaction-list'),
        monthFilter: document.getElementById('month-filter'),
        modalContainer: document.getElementById('transaction-modal'),
        openModalBtn: document.getElementById('open-modal-btn'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        transactionForm: document.getElementById('transaction-form'),
        formType: document.getElementById('type'),
        formDescription: document.getElementById('description'),
        formAmount: document.getElementById('amount'),
        formCategory: document.getElementById('category'),
        formCategoryGroup: document.getElementById('category-group'),
        formDate: document.getElementById('date'),
        statsCtx: document.getElementById('statistics-chart').getContext('2d'),
        balanceCtx: document.getElementById('balance-chart').getContext('2d'),
        analyzeBtn: document.getElementById('analyze-btn'),
        aiContent: document.getElementById('ai-content'),
        loadingAi: document.getElementById('loading-ai'),
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    
    const render = () => {
        const selectedMonth = elements.monthFilter.value;
        // CORREÇÃO: Garante que o filtro não quebre se algum dado antigo for inválido
        const filteredTransactions = state.allTransactions.filter(t => t && t.date && t.date.startsWith(selectedMonth));
        
        renderSummary(filteredTransactions);
        renderTransactionList(filteredTransactions);
        renderCharts(filteredTransactions);
    };

    const renderSummary = (transactions) => {
        const incomeTotal = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const balanceTotal = incomeTotal - expenseTotal;

        elements.balanceValue.textContent = `R$ ${balanceTotal.toFixed(2)}`;
        elements.incomeValue.textContent = `R$ ${incomeTotal.toFixed(2)}`;
        elements.expenseValue.textContent = `R$ ${expenseTotal.toFixed(2)}`;

        const expensePercent = incomeTotal > 0 ? (expenseTotal / incomeTotal) * 100 : 0;
        elements.incomeProgress.style.width = '100%';
        elements.expenseProgress.style.width = `${Math.min(100, expensePercent)}%`;
        elements.balanceProgress.style.width = `${Math.max(0, 100 - expensePercent)}%`;
    };

    const renderTransactionList = (transactions) => {
        elements.transactionList.innerHTML = '';
        if (transactions.length === 0) {
            elements.transactionList.innerHTML = `<li>Nenhuma transação neste mês.</li>`;
            return;
        }
        [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5).forEach(t => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div><strong>${t.description}</strong><p class="transaction-date">${new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p></div>
                <span class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'} R$ ${t.amount.toFixed(2)}</span>`;
            elements.transactionList.appendChild(li);
        });
    };

    const renderCharts = (transactions) => {
        const incomeTotal = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        balanceChart.data.datasets[0].data = [incomeTotal > 0 ? incomeTotal : 0.01, expenseTotal];
        balanceChart.update();

        const expenseByCategory = transactions.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
        statisticsChart.data.labels = Object.keys(expenseByCategory);
        statisticsChart.data.datasets[0].data = Object.values(expenseByCategory);
        statisticsChart.update();
    };
    
    // --- LÓGICA E MANIPULADORES DE EVENTOS ---
    
    const handleAddTransaction = (e) => {
        e.preventDefault();
        
        // [LÓGICA CORRIGIDA E MAIS SEGURA]
        const type = elements.formType.value;
        const description = elements.formDescription.value.trim();
        const amountValue = elements.formAmount.value;
        const category = elements.formCategory.value;
        const date = elements.formDate.value; // Pega a data YYYY-MM-DD
        
        // Validação robusta ANTES de criar o objeto
        if (!description || !amountValue || !date) {
            alert("Por favor, preencha todos os campos: Descrição, Valor e Data.");
            return;
        }
        
        const amount = parseFloat(amountValue);
        if (isNaN(amount) || amount <= 0) {
            alert("O valor da transação deve ser um número positivo.");
            return;
        }

        const newTransaction = {
            id: Date.now(),
            type,
            description,
            amount,
            category: type === 'expense' ? category : 'receita',
            date, // A data agora está garantida
        };
        
        state.allTransactions.push(newTransaction);
        
        elements.monthFilter.value = date.substring(0, 7);
        
        saveAndRender();
        elements.modalContainer.classList.add('hidden');
    };
    
    const saveAndRender = () => {
        localStorage.setItem('transactions', JSON.stringify(state.allTransactions));
        render();
    };
    
    const setupFormDefaults = () => {
        elements.transactionForm.reset();
        elements.formDate.valueAsDate = new Date();
        elements.formCategoryGroup.style.display = elements.formType.value === 'expense' ? 'block' : 'none';
    };
    
    const handleAIAnalysis = async () => { /* ... Lógica da IA ... */ };

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    
    const init = () => {
        try {
            const savedTransactions = localStorage.getItem('transactions');
            state.allTransactions = savedTransactions ? JSON.parse(savedTransactions) : [];
        } catch (error) {
            console.error("Erro ao carregar dados. Iniciando com base vazia:", error);
            state.allTransactions = [];
        }

        elements.monthFilter.value = new Date().toISOString().substring(0, 7);
        
        balanceChart = new Chart(elements.balanceCtx, { type: 'doughnut', data: { labels: ['Receitas', 'Despesas'], datasets: [{ data: [], backgroundColor: ['#00E096', '#FF4D4D'], borderColor: '#2F2F4A', borderWidth: 5 }] }, options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: 'white' } } } } });
        statisticsChart = new Chart(elements.statsCtx, { type: 'bar', data: { labels: [], datasets: [{ label: 'Despesas', data: [], backgroundColor: 'rgba(138, 77, 255, 0.6)' }] }, options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } }, plugins: { legend: { display: false } } } });

        elements.openModalBtn.addEventListener('click', () => {
            setupFormDefaults();
            elements.modalContainer.classList.remove('hidden');
        });
        elements.closeModalBtn.addEventListener('click', () => elements.modalContainer.classList.add('hidden'));
        elements.transactionForm.addEventListener('submit', handleAddTransaction);
        elements.monthFilter.addEventListener('change', render);
        elements.formType.addEventListener('change', () => elements.formCategoryGroup.style.display = elements.formType.value === 'expense' ? 'block' : 'none');
        elements.analyzeBtn.addEventListener('click', handleAIAnalysis);
        
        render();
    };

    init();
});
    account: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    }