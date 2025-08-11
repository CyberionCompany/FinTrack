// Importe as funções necessárias dos SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    writeBatch,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // CONFIGURAÇÃO DO FIREBASE
    // =================================================================================
    const firebaseConfig = {
      apiKey: "AIzaSyC5bC8DJiJIFddpnrFcRkeVILiMyQ-4iJs",
      authDomain: "fintrack-f8302.firebaseapp.com",
      projectId: "fintrack-f8302",
      storageBucket: "fintrack-f8302.appspot.com",
      messagingSenderId: "888846208929",
      appId: "1:888846208929:web:d131163e099a5e79bb45e0",
      measurementId: "G-KSVWFJ8F09"
    };
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const googleProvider = new GoogleAuthProvider();

    // =================================================================================
    // ESTADO CENTRAL DA APLICAÇÃO
    // =================================================================================
    const AppState = {
        currentUser: null,
        transactions: [],
        categories: [],
        goals: [],
        accounts: [],
        filters: {
            period: 'current_month',
            startDate: '',
            endDate: '',
            type: 'all',
            category: 'all',
            account: 'all',
            text: ''
        },
        listeners: {
            transactions: null,
            categories: null,
            goals: null,
            accounts: null,
        },
        charts: {
            balanceTrend: null,
            monthlyTrend: null,
            expensePie: null,
        },
        hasCheckedRecurring: false,
        importData: {
            raw: [],
            mapped: [],
            headers: [],
            accountId: null,
        }
    };
    
    const categoryKeywords = {
        'Alimentação': ['restaurante', 'ifood', 'lanche', 'almoço', 'jantar', 'mercado', 'supermercado', 'padaria', 'delivery'],
        'Transporte': ['uber', '99', 'gasolina', 'combustível', 'estacionamento', 'metrô', 'ônibus', 'passagem'],
        'Moradia': ['aluguel', 'condomínio', 'iptu', 'luz', 'água', 'gás', 'internet', 'reforma'],
        'Saúde': ['farmácia', 'médico', 'consulta', 'remédio', 'plano de saúde'],
        'Lazer': ['cinema', 'show', 'bar', 'festa', 'viagem', 'streaming', 'netflix', 'spotify'],
        'Salário': ['salário', 'salario', 'pagamento', 'adiantamento'],
        'Investimentos': ['investimento', 'ações', 'tesouro', 'cripto'],
        'Compras': ['roupas', 'loja', 'online', 'presente', 'eletrônicos'],
        'Educação': ['curso', 'livro', 'faculdade', 'escola']
    };

    // =================================================================================
    // ✅ FUNÇÃO CORRIGIDA PARA CARREGAR ANÚNCIOS
    // =================================================================================
    function loadVisibleAds() {
        const adSlots = document.querySelectorAll('ins.adsbygoogle'); // Pega todos os blocos

        adSlots.forEach(slot => {
            // Verifica se o bloco de anúncio está visível (offsetParent !== null)
            // E se ele AINDA NÃO foi processado pelo AdSense (não tem o atributo 'data-ad-status')
            if (slot.offsetParent !== null && !slot.hasAttribute('data-ad-status')) {
                try {
                    (adsbygoogle = window.adsbygoogle || []).push({});
                    console.log('AdSense push called for slot:', slot.getAttribute('data-ad-slot'));
                } catch (e) {
                    // O erro não será mais lançado, mas mantemos o catch por segurança
                    console.error("AdSense push error:", e);
                }
            }
        });
    }


    // =================================================================================
    // FUNÇÕES DE UTILIDADE E UI
    // =================================================================================
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const formatDate = (dateString) => new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
    
    const showToast = (message, isError = false) => {
        const toast = document.getElementById('toast-notification');
        const toastMessage = document.getElementById('toast-message');
        const toastIcon = document.getElementById('toast-icon');
        
        toastMessage.textContent = message;
        toastIcon.setAttribute('data-feather', isError ? 'alert-circle' : 'check-circle');
        toast.classList.toggle('bg-red-100', isError);
        toast.classList.toggle('text-red-800', isError);
        toastIcon.classList.toggle('text-red-500', isError);
        toast.classList.toggle('bg-slate-100', !isError);
        toast.classList.toggle('text-slate-800', !isError);
        toastIcon.classList.toggle('text-green-500', !isError);
        feather.replace();

        toast.classList.remove('translate-y-24', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('translate-y-24', 'opacity-0');
        }, 3000);
    };

    const updateUserAvatar = (user) => {
        const containers = [
            document.getElementById('user-avatar-container'),
            document.getElementById('mobile-user-avatar-container')
        ];

        if (!user) {
            containers.forEach(c => { if(c) c.innerHTML = ''; });
            return;
        }

        let avatarHtml = '';
        if (user.photoURL) {
            avatarHtml = `<img src="${user.photoURL}" alt="Avatar" class="w-10 h-10 rounded-full border-2 border-slate-700">`;
        } else {
            const initials = (user.displayName || user.email).charAt(0).toUpperCase();
            const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500'];
            const color = colors[Math.abs((user.uid || 'default').charCodeAt(0) % colors.length)];
            avatarHtml = `
                <div class="w-10 h-10 rounded-full ${color} flex items-center justify-center font-bold text-white text-lg border-2 border-slate-700">
                    ${initials}
                </div>
            `;
        }
        
        containers.forEach(c => { if(c) c.innerHTML = avatarHtml; });

        const userGreetingDesktop = document.getElementById('user-greeting');
        const userEmailDesktop = document.getElementById('user-email');
        const userGreetingMobile = document.getElementById('mobile-user-greeting');
        const userEmailMobile = document.getElementById('mobile-user-email');

        const displayName = user.displayName || user.email.split('@')[0];

        if(userGreetingDesktop) userGreetingDesktop.textContent = `Olá, ${displayName}!`;
        if(userEmailDesktop) userEmailDesktop.textContent = user.email;
        if(userGreetingMobile) userGreetingMobile.textContent = displayName;
        if(userEmailMobile) userEmailMobile.textContent = user.email;
    };

    // =================================================================================
    // LÓGICA DE NAVEGAÇÃO DA SPA (COM ATUALIZAÇÃO)
    // =================================================================================
    const pages = document.querySelectorAll('.app-page');
    const navLinks = document.querySelectorAll('.nav-link');

    function navigateTo(pageId) {
        pages.forEach(page => page.classList.add('hidden'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        
        navLinks.forEach(link => {
            link.classList.toggle('active-link', link.dataset.page === pageId);
        });
        
        feather.replace();

        // ✅ CHAMADA ADICIONADA: Carrega os anúncios da página que acabou de ficar visível
        setTimeout(loadVisibleAds, 100); 
    }
    
    document.getElementById('app-screen').addEventListener('click', (e) => {
        const link = e.target.closest('a.nav-link');
        if (link && link.dataset.page) {
            e.preventDefault();
            navigateTo(link.dataset.page);
        }
    });

    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenuPopover = document.getElementById('user-menu-popover');

    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenuPopover.classList.toggle('hidden');
        feather.replace();
    });

    window.addEventListener('click', (e) => {
        if (userMenuPopover && !userMenuBtn.contains(e.target) && !userMenuPopover.contains(e.target)) {
            userMenuPopover.classList.add('hidden');
        }
    });

    // =================================================================================
    // LÓGICA DE AUTENTICAÇÃO (COM ATUALIZAÇÃO)
    // =================================================================================
    onAuthStateChanged(auth, (user) => {
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app-screen');
        if (user) {
            AppState.currentUser = user;
            authScreen.classList.add('hidden');
            appScreen.classList.remove('hidden');
            updateUserAvatar(user);
            attachListeners();
            navigateTo('dashboard-page');
        } else {
            AppState.currentUser = null;
            authScreen.classList.remove('hidden');
            appScreen.classList.add('hidden');
            detachListeners();
            AppState.hasCheckedRecurring = false;
            // ✅ CHAMADA ADICIONADA: Carrega o anúncio da tela de login quando o usuário está deslogado
            setTimeout(loadVisibleAds, 100); 
        }
        feather.replace();
    });

    const handleAuthAction = async (action, ...args) => {
        try {
            const messages = {
                'createUserWithEmailAndPassword': 'Conta criada com sucesso!',
                'signInWithEmailAndPassword': 'Login realizado com sucesso!',
                'signInWithPopup': 'Login com Google realizado com sucesso!',
                'signOut': 'Você foi desconectado.',
                'sendPasswordResetEmail': 'Link para redefinição de senha enviado.'
            };
            const userCredential = await action(auth, ...args);
            if (action.name === 'createUserWithEmailAndPassword') {
                const name = args.find(arg => typeof arg === 'string' && !arg.includes('@'));
                await updateProfile(userCredential.user, { displayName: name });
            }
            showToast(messages[action.name] || 'Ação realizada com sucesso!');
            if(action.name === 'sendPasswordResetEmail') {
                document.getElementById('reset-password-view').classList.add('hidden');
                document.getElementById('login-view').classList.remove('hidden');
            }
        } catch (error) {
            console.error("Auth Error:", error);
            showToast(error.message, true);
        }
    };

    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleAuthAction(createUserWithEmailAndPassword, e.target['signup-email'].value, e.target['signup-password'].value, e.target['signup-name'].value);
    });
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleAuthAction(signInWithEmailAndPassword, e.target['login-email'].value, e.target['login-password'].value);
    });
    document.getElementById('google-login-btn').addEventListener('click', () => handleAuthAction(signInWithPopup, googleProvider));
    
    document.getElementById('logout-btn').addEventListener('click', () => handleAuthAction(signOut));
    document.getElementById('mobile-logout-btn').addEventListener('click', () => handleAuthAction(signOut));

    document.getElementById('reset-password-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleAuthAction(sendPasswordResetEmail, e.target['reset-email'].value);
    });

    const authViews = { login: document.getElementById('login-view'), signup: document.getElementById('signup-view'), reset: document.getElementById('reset-password-view') };
    const showAuthView = (viewToShow) => {
        Object.values(authViews).forEach(view => view.classList.add('hidden'));
        authViews[viewToShow].classList.remove('hidden');
    };
    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); showAuthView('signup'); });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); showAuthView('login'); });
    document.getElementById('show-reset-password').addEventListener('click', (e) => { e.preventDefault(); showAuthView('reset'); });
    document.getElementById('back-to-login').addEventListener('click', (e) => { e.preventDefault(); showAuthView('login'); });

    // =================================================================================
    // LÓGICA DE DADOS (Firestore)
    // =================================================================================

    function detachListeners() {
        if (AppState.listeners.transactions) AppState.listeners.transactions();
        if (AppState.listeners.categories) AppState.listeners.categories();
        if (AppState.listeners.goals) AppState.listeners.goals();
        if (AppState.listeners.accounts) AppState.listeners.accounts();
    }

    function attachListeners() {
        if (!AppState.currentUser) return;
        detachListeners();

        if (!AppState.hasCheckedRecurring) {
            checkAndGenerateRecurringTransactions();
            AppState.hasCheckedRecurring = true;
        }
        
        const accountsQuery = query(collection(db, `users/${AppState.currentUser.uid}/accounts`), orderBy("name"));
        AppState.listeners.accounts = onSnapshot(accountsQuery, (snapshot) => {
            AppState.accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateFilterAccountDropdown();
            renderApp();
        });

        const categoriesQuery = query(collection(db, `users/${AppState.currentUser.uid}/categories`), orderBy("name"));
        AppState.listeners.categories = onSnapshot(categoriesQuery, (snapshot) => {
            AppState.categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderCategoryList();
            updateTransactionCategoryDropdown();
            updateFilterCategoryDropdown();
            renderApp();
        });

        const transactionsQuery = query(collection(db, `users/${AppState.currentUser.uid}/transactions`), orderBy("date", "desc"));
        AppState.listeners.transactions = onSnapshot(transactionsQuery, (snapshot) => {
            AppState.transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderApp();
        });

        const goalsQuery = query(collection(db, `users/${AppState.currentUser.uid}/goals`), orderBy("targetDate", "asc"));
        AppState.listeners.goals = onSnapshot(goalsQuery, (snapshot) => {
            AppState.goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderApp();
        });
    }

    function renderApp() {
        if (!AppState.currentUser) return;
        const filteredTransactions = applyFilters(AppState.transactions);
        
        renderAccounts();
        renderTransactions(filteredTransactions);
        updateDashboard(AppState.transactions, filteredTransactions);
        renderGoals(AppState.transactions);
        feather.replace();
    }
    
    // --- CONTAS ---
    function renderAccounts() {
        const accountsContainer = document.getElementById('accounts-container');
        const creditCardsContainer = document.getElementById('credit-cards-container');
        const noAccountsMsg = document.getElementById('no-accounts-msg');
        const noCreditCardsMsg = document.getElementById('no-credit-cards-msg');
        const totalBalanceEl = document.getElementById('total-balance-all-accounts');

        const regularAccounts = AppState.accounts.filter(a => !a.isCreditCard);
        const creditCardAccounts = AppState.accounts.filter(a => a.isCreditCard);

        // Renderiza Contas e Carteiras
        if (regularAccounts.length === 0) {
            accountsContainer.innerHTML = '';
            noAccountsMsg.classList.remove('hidden');
        } else {
            noAccountsMsg.classList.add('hidden');
            accountsContainer.innerHTML = regularAccounts.map(account => {
                const currentBalance = calculateAccountBalance(account.id);
                return `
                    <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-white">${account.name}</p>
                                <p class="text-sm text-slate-400">${account.type}</p>
                            </div>
                            <p class="text-lg font-semibold ${currentBalance >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(currentBalance)}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Renderiza Cartões de Crédito
        if (creditCardAccounts.length === 0) {
            creditCardsContainer.innerHTML = '';
            noCreditCardsMsg.classList.remove('hidden');
        } else {
            noCreditCardsMsg.classList.add('hidden');
            creditCardsContainer.innerHTML = creditCardAccounts.map(card => {
                const currentBalance = calculateAccountBalance(card.id);
                return `
                    <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start">
                                <p class="font-bold text-white">${card.name}</p>
                                <p class="text-lg font-semibold text-red-400">${formatCurrency(currentBalance)}</p>
                            </div>
                            <p class="text-sm text-slate-400 -mt-1">Fatura Atual</p>
                        </div>
                        <div class="flex justify-between items-center text-xs text-slate-400 mt-3 pt-2 border-t border-slate-600/50">
                            <span>Fecha dia: <b>${card.closingDay || 'N/A'}</b></span>
                            <span>Vence dia: <b>${card.paymentDay || 'N/A'}</b></span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Calcula e exibe o saldo consolidado apenas das contas regulares
        const totalRegularBalance = regularAccounts.reduce((sum, acc) => sum + calculateAccountBalance(acc.id), 0);
        totalBalanceEl.textContent = `Saldo Consolidado: ${formatCurrency(totalRegularBalance)}`;
    }

    function calculateAccountBalance(accountId) {
        const account = AppState.accounts.find(a => a.id === accountId);
        if (!account) return 0;
        
        let balance = account.initialBalance;
        AppState.transactions.forEach(tx => {
            if (tx.type === 'income' && tx.accountId === accountId) {
                balance += tx.amount;
            } else if (tx.type === 'expense' && tx.accountId === accountId) {
                balance -= tx.amount;
            } else if (tx.type === 'transfer') {
                if (tx.sourceAccountId === accountId) balance -= tx.amount;
                if (tx.destinationAccountId === accountId) balance += tx.amount;
            }
        });
        return balance;
    }

    function renderAccountListInModal() {
        const listContainer = document.getElementById('account-list');
        if (AppState.accounts.length === 0) {
            listContainer.innerHTML = `<p class="text-slate-500 text-center">Nenhuma conta encontrada.</p>`;
            return;
        }
        listContainer.innerHTML = AppState.accounts.map(account => {
            const typeTag = account.isCreditCard 
                ? `<span class="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full ml-2">Cartão</span>`
                : '';
            return `
                <div class="flex justify-between items-center p-2 bg-slate-700 rounded-lg">
                    <div>
                        <span class="font-medium text-slate-200">${account.name}</span>
                        ${typeTag}
                    </div>
                    <div class="flex items-center gap-3">
                        <button data-id="${account.id}" class="edit-account-btn text-slate-500 hover:text-purple-400 transition-colors"><i data-feather="edit" class="w-4 h-4"></i></button>
                        <button data-id="${account.id}" class="delete-account-btn text-slate-500 hover:text-red-500 transition-colors"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `}).join('');
        feather.replace();
    }
    
    document.getElementById('account-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const id = form['account-id'].value;
        const name = form['account-name'].value.trim();
        const type = form['account-type'].value;

        if (!name) {
            showToast('O nome da conta é obrigatório.', true);
            return;
        }

        let accountData = {
            name: name,
            type: type,
            initialBalance: parseFloat(form['account-initial-balance'].value) || 0,
            isCreditCard: type === 'Cartão de Crédito',
            closingDay: null,
            paymentDay: null
        };

        if (accountData.isCreditCard) {
            const closingDay = parseInt(form['card-closing-day'].value, 10);
            const paymentDay = parseInt(form['card-payment-day'].value, 10);
            if (!closingDay || !paymentDay) {
                showToast('Para cartão de crédito, os dias de fechamento e vencimento são obrigatórios.', true);
                return;
            }
            accountData.closingDay = closingDay;
            accountData.paymentDay = paymentDay;
        }
        
        try {
            if (id) {
                await updateDoc(doc(db, `users/${AppState.currentUser.uid}/accounts`, id), accountData);
                showToast('Conta/Cartão atualizado com sucesso!');
            } else {
                await addDoc(collection(db, `users/${AppState.currentUser.uid}/accounts`), accountData);
                showToast('Conta/Cartão adicionado com sucesso!');
            }
            resetAccountForm();
        } catch(error) {
            console.error("Erro ao salvar conta:", error);
            showToast('Erro ao salvar conta/cartão.', true);
        }
    });


    // --- CATEGORIAS ---
    function renderCategoryList() {
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = AppState.categories.map(category => `
            <div class="flex justify-between items-center p-2 bg-slate-700 rounded-lg">
                <span class="font-medium text-slate-200">${category.name}</span>
                <div class="flex items-center gap-3">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${category.type === 'income' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}">${category.type === 'income' ? 'Receita' : 'Despesa'}</span>
                    <button data-id="${category.id}" class="delete-category-btn text-slate-500 hover:text-red-500 transition-colors"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        `).join('');
        feather.replace();
    }

    document.getElementById('category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('category-name');
        const name = nameInput.value.trim();
        if (name) {
            try {
                await addDoc(collection(db, `users/${AppState.currentUser.uid}/categories`), { name, type: document.getElementById('category-type').value });
                nameInput.value = '';
                showToast('Categoria adicionada!');
            } catch (error) { showToast('Erro ao adicionar categoria.', true); }
        }
    });
    
    // --- TRANSAÇÕES ---
    function renderTransactions(transactions) {
        const tbody = document.getElementById('transactions-tbody');
        const noTransactionsMsg = document.getElementById('no-transactions-msg');
        
        if (transactions.length === 0) {
            tbody.innerHTML = '';
            noTransactionsMsg.classList.remove('hidden');
            return;
        }
        
        noTransactionsMsg.classList.add('hidden');
        tbody.innerHTML = transactions.map(tx => {
            let descriptionHtml;
            let amountHtml;
            let categoryName = 'N/A';

            if (tx.type === 'transfer') {
                const sourceAccount = AppState.accounts.find(a => a.id === tx.sourceAccountId);
                const destAccount = AppState.accounts.find(a => a.id === tx.destinationAccountId);
                descriptionHtml = `
                    <p class="font-semibold text-white">${tx.description}</p>
                    <p class="text-sm text-purple-400">${sourceAccount?.name || 'N/A'} → ${destAccount?.name || 'N/A'}</p>
                `;
                amountHtml = `<span class="text-blue-400">${formatCurrency(tx.amount)}</span>`;
                categoryName = 'Transferência';
            } else {
                const account = AppState.accounts.find(a => a.id === tx.accountId);
                const category = AppState.categories.find(c => c.id === tx.categoryId);
                const isIncome = tx.type === 'income';

                descriptionHtml = `
                    <p class="font-semibold text-white">${tx.description}</p>
                    <p class="text-sm text-slate-400">${account?.name || 'N/A'}</p>
                `;
                amountHtml = `<span class="${isIncome ? 'text-green-400' : 'text-red-400'}">${isIncome ? '+' : '-'} ${formatCurrency(tx.amount)}</span>`;
                categoryName = category?.name || 'Sem categoria';
            }

            return `
                <tr class="border-b border-slate-700 hover:bg-slate-700/50">
                    <td class="p-3">${descriptionHtml}</td>
                    <td class="p-3 font-medium">${amountHtml}</td>
                    <td class="p-3 text-slate-400 hidden md:table-cell">${categoryName}</td>
                    <td class="p-3 text-slate-400 hidden md:table-cell">${formatDate(tx.date)}</td>
                    <td class="p-3">
                        <div class="flex gap-2 justify-end">
                            <button data-id="${tx.id}" class="edit-transaction-btn text-slate-500 hover:text-purple-400 transition-colors"><i data-feather="edit" class="w-4 h-4"></i></button>
                            <button data-id="${tx.id}" class="delete-transaction-btn text-slate-500 hover:text-red-500 transition-colors"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        feather.replace();
    }
    
    document.getElementById('transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const id = form['transaction-id'].value;
        const type = form['transaction-type'].value;
        const isRecurring = form['is-recurring'].checked;

        let transactionData = {
            amount: parseFloat(form['transaction-amount'].value) || 0,
            description: form['transaction-description'].value,
            date: form['transaction-date'].value,
            type: type,
        };

        if (type === 'transfer') {
            transactionData.sourceAccountId = form['transfer-source-account'].value;
            transactionData.destinationAccountId = form['transfer-destination-account'].value;
            if (transactionData.sourceAccountId === transactionData.destinationAccountId) {
                showToast("A conta de origem e destino não podem ser a mesma.", true);
                return;
            }
        } else {
            transactionData.accountId = form['transaction-account'].value;
            transactionData.categoryId = form['transaction-category'].value;
        }
        
        if (!transactionData.type || !transactionData.amount || !transactionData.description || !transactionData.date || (type !== 'transfer' && !transactionData.accountId) || (type === 'transfer' && (!transactionData.sourceAccountId || !transactionData.destinationAccountId))) {
            showToast("Por favor, preencha todos os campos obrigatórios.", true);
            return;
        }

        try {
            if (isRecurring && !id) { 
                const recurringData = {
                    ...transactionData,
                    frequency: form['recurring-frequency'].value,
                    endDate: form['recurring-end-date'].value ? Timestamp.fromDate(new Date(form['recurring-end-date'].value + 'T23:59:59')) : null,
                    nextDueDate: Timestamp.fromDate(new Date(transactionData.date + 'T00:00:00')),
                    isActive: true
                };
                await addDoc(collection(db, `users/${AppState.currentUser.uid}/recurringTransactions`), recurringData);
                showToast('Lançamento recorrente agendado!');
            }

            const action = id 
                ? updateDoc(doc(db, `users/${AppState.currentUser.uid}/transactions`, id), transactionData)
                : addDoc(collection(db, `users/${AppState.currentUser.uid}/transactions`), transactionData);
            
            await action;
            showToast(`Transação ${id ? 'atualizada' : 'adicionada'}!`);
            closeModal('transaction-modal');

        } catch (error) { 
            console.error("Erro ao salvar:", error);
            showToast('Erro ao salvar transação.', true); 
        }
    });
    
    // --- DASHBOARD E GRÁFICOS ---
    function updateDashboard(allTransactions, filteredTransactions) {
        const totalIncome = filteredTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = filteredTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);

        document.getElementById('total-income').textContent = formatCurrency(totalIncome);
        document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('total-balance').textContent = formatCurrency(totalIncome - totalExpenses);
        
        updateExpensePieChart(filteredTransactions);
        updateMonthlyTrendChart(allTransactions);
        updateBalanceTrendChart(allTransactions);
    }
    
    function updateExpensePieChart(transactions) {
        const ctx = document.getElementById('expense-pie-chart').getContext('2d');
        if (AppState.charts.expensePie) AppState.charts.expensePie.destroy();

        const expensesByCategory = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((acc, tx) => {
                const category = AppState.categories.find(c => c.id === tx.categoryId);
                const categoryName = category ? category.name : 'Outros';
                acc[categoryName] = (acc[categoryName] || 0) + tx.amount;
                return acc;
            }, {});

        const labels = Object.keys(expensesByCategory);
        const data = Object.values(expensesByCategory);

        if (labels.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.font = '16px Inter';
            ctx.fillText('Nenhuma despesa no período.', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        AppState.charts.expensePie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'],
                    borderColor: '#1e293b',
                    borderWidth: 4,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1', boxWidth: 12, padding: 20 } },
                    tooltip: { callbacks: { label: (c) => `${c.label}: ${formatCurrency(c.raw)}` } }
                }
            }
        });
    }

    function updateMonthlyTrendChart(transactions) {
        const ctx = document.getElementById('monthly-trend-chart').getContext('2d');
        if (AppState.charts.monthlyTrend) AppState.charts.monthlyTrend.destroy();
        
        const data = {
            labels: [],
            incomes: [],
            expenses: []
        };

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        for (let i = 0; i < 6; i++) {
            const date = new Date(sixMonthsAgo);
            date.setMonth(date.getMonth() + i);
            data.labels.push(date.toLocaleString('pt-BR', { month: 'short'}));
            data.incomes.push(0);
            data.expenses.push(0);
        }

        transactions.forEach(tx => {
            const txDate = new Date(tx.date + 'T00:00:00');
            if (txDate >= sixMonthsAgo) {
                const monthDiff = (txDate.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (txDate.getMonth() - sixMonthsAgo.getMonth());
                if (monthDiff >= 0 && monthDiff < 6) {
                    if (tx.type === 'income') {
                        data.incomes[monthDiff] += tx.amount;
                    } else if (tx.type === 'expense') {
                        data.expenses[monthDiff] += tx.amount;
                    }
                }
            }
        });
        
        AppState.charts.monthlyTrend = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Receitas', data: data.incomes, backgroundColor: 'rgba(52, 211, 153, 0.7)', borderColor: '#34d399', borderWidth: 2, borderRadius: 4 },
                    { label: 'Despesas', data: data.expenses, backgroundColor: 'rgba(248, 113, 113, 0.7)', borderColor: '#f87171', borderWidth: 2, borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }, x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } } },
                plugins: { legend: { labels: { color: '#cbd5e1' } }, tooltip: { bodyFont: { size: 14 }, titleFont: { size: 16 } } }
            }
        });
    }
    
    // =================================================================================
    // ✅ FUNÇÃO DO GRÁFICO CORRIGIDA (sem alterações, a lógica original estava boa)
    // =================================================================================
    function updateBalanceTrendChart(transactions) {
        const ctx = document.getElementById('balance-trend-chart').getContext('2d');
        if (AppState.charts.balanceTrend) AppState.charts.balanceTrend.destroy();

        const drawMessage = (message) => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.font = '16px Inter';
            ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
        };
        
        const regularAccounts = AppState.accounts.filter(a => !a.isCreditCard);
        const regularTransactions = transactions.filter(tx => {
            if(tx.type === 'transfer') return true;
            return regularAccounts.some(acc => acc.id === tx.accountId);
        });


        if (!regularTransactions || regularTransactions.length === 0) {
            drawMessage('Adicione transações para ver a tendência do saldo.');
            return;
        }

        // 1. Calcular o saldo inicial total das contas regulares
        const initialBalance = regularAccounts.reduce((sum, acc) => sum + (acc.initialBalance || 0), 0);
        
        // 2. Ordenar transações por data
        const sortedTx = [...regularTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        // 3. Agregar as mudanças de saldo por dia
        const changesByDay = sortedTx.reduce((acc, tx) => {
            let change = 0;
            if (tx.type === 'income') change = tx.amount;
            else if (tx.type === 'expense') change = -tx.amount;
            // Transferências são neutras para o saldo total, então são ignoradas
            acc[tx.date] = (acc[tx.date] || 0) + change;
            return acc;
        }, {});

        const sortedDates = Object.keys(changesByDay).sort((a, b) => new Date(a) - new Date(b));
        
        // 4. Construir o array de dados para o gráfico
        const balanceData = [];
        let cumulativeBalance = initialBalance;

        // Adicionar ponto inicial (saldo antes da primeira transação)
        if (sortedDates.length > 0) {
            const firstTxDate = new Date(sortedDates[0] + 'T00:00:00');
            balanceData.push({ x: new Date(firstTxDate.getTime() - 86400000), y: cumulativeBalance });
        }


        // Adicionar um ponto para cada dia com transações
        sortedDates.forEach(date => {
            cumulativeBalance += changesByDay[date];
            balanceData.push({ x: new Date(date + 'T00:00:00'), y: cumulativeBalance });
        });

        const datasets = [{
            label: 'Saldo Histórico',
            data: balanceData,
            borderColor: '#a78bfa',
            tension: 0.1,
            pointBackgroundColor: '#a78bfa',
            pointRadius: 2,
            fill: true,
            backgroundColor: 'rgba(167, 139, 250, 0.1)'
        }];

        // 5. Lógica de Previsão (só executa se houver pelo menos 2 pontos de dados)
        if (balanceData.length >= 2) {
            const n = balanceData.length;
            const firstDateMs = balanceData[0].x.getTime();
            const msInDay = 24 * 60 * 60 * 1000;

            // Usar a diferença de dias real para a regressão
            const points = balanceData.map(d => ({
                x: (d.x.getTime() - firstDateMs) / msInDay,
                y: d.y
            }));

            const sumX = points.reduce((sum, p) => sum + p.x, 0);
            const sumY = points.reduce((sum, p) => sum + p.y, 0);
            const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
            const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

            const denominator = (n * sumXX - sumX * sumX);
            const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
            const intercept = (sumY - slope * sumX) / n;

            const predictionData = [];
            const lastPoint = points[n - 1];
            const lastDate = balanceData[n - 1].x;

            // Começa a linha de previsão a partir do último ponto real
            predictionData.push({ x: lastDate, y: lastPoint.y });

            // Previsão para os próximos 30 dias
            for (let i = 1; i <= 30; i++) {
                const futureDate = new Date(lastDate);
                futureDate.setDate(lastDate.getDate() + i);
                const futureX = lastPoint.x + i;
                const predictedBalance = slope * futureX + intercept;
                predictionData.push({ x: futureDate, y: predictedBalance });
            }

            datasets.push({
                label: 'Previsão de Saldo',
                data: predictionData,
                borderColor: '#60a5fa',
                borderDash: [5, 5],
                tension: 0.1,
                pointRadius: 0
            });
        }
        
        // 6. Renderizar o gráfico
        AppState.charts.balanceTrend = new Chart(ctx, {
            type: 'line',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: { color: '#94a3b8', callback: (value) => formatCurrency(value) },
                        grid: { color: '#334155' }
                    },
                    x: {
                        type: 'time',
                        time: { unit: 'month', tooltipFormat: 'dd/MM/yyyy' },
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#cbd5e1' } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                        }
                    }
                }
            }
        });
    }

    // =================================================================================
    // LÓGICA DE FILTROS
    // =================================================================================
    function applyFilters(transactions) {
        const { period, startDate, endDate, type, category, account, text } = AppState.filters;
        let filtered = [...transactions];

        if (period !== 'all_time') {
            let start, end;
            const today = new Date();
            if (period === 'current_month') {
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            } else if (period === 'last_month') {
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
            } else if (period === 'custom' && startDate && endDate) {
                start = new Date(startDate + 'T00:00:00');
                end = new Date(endDate + 'T23:59:59');
            }
            if (start && end) {
                filtered = filtered.filter(tx => {
                    const txDate = new Date(tx.date + 'T00:00:00');
                    return txDate >= start && txDate <= end;
                });
            }
        }

        if (type !== 'all') {
            filtered = filtered.filter(tx => tx.type === type);
        }

        if (category !== 'all') {
            filtered = filtered.filter(tx => tx.categoryId === category);
        }
        
        if (account !== 'all') {
            filtered = filtered.filter(tx => tx.accountId === account || tx.sourceAccountId === account || tx.destinationAccountId === account);
        }

        if (text) {
            filtered = filtered.filter(tx => tx.description.toLowerCase().includes(text.toLowerCase()));
        }
        
        return filtered;
    }
    
    function updateFilterAccountDropdown() {
        const select = document.getElementById('filter-account');
        select.innerHTML = '<option value="all">Todas as Contas</option>';
        AppState.accounts.forEach(a => {
            select.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        });
    }

    function updateFilterCategoryDropdown() {
        const select = document.getElementById('filter-category');
        select.innerHTML = '<option value="all">Todas as Categorias</option>';
        AppState.categories.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    document.getElementById('filter-period').addEventListener('change', (e) => {
        AppState.filters.period = e.target.value;
        document.getElementById('custom-period-inputs').classList.toggle('hidden', e.target.value !== 'custom');
        renderApp();
    });
    document.getElementById('filter-start-date').addEventListener('change', (e) => { AppState.filters.startDate = e.target.value; renderApp(); });
    document.getElementById('filter-end-date').addEventListener('change', (e) => { AppState.filters.endDate = e.target.value; renderApp(); });
    document.getElementById('filter-type').addEventListener('change', (e) => { AppState.filters.type = e.target.value; renderApp(); });
    document.getElementById('filter-category').addEventListener('change', (e) => { AppState.filters.category = e.target.value; renderApp(); });
    document.getElementById('filter-account').addEventListener('change', (e) => { AppState.filters.account = e.target.value; renderApp(); });
    document.getElementById('filter-text').addEventListener('input', (e) => { AppState.filters.text = e.target.value; renderApp(); });


    // =================================================================================
    // MANIPULAÇÃO DE MODAIS E AÇÕES
    // =================================================================================
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('open', 'opacity-100'), 10);
    };

    const closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        modal.classList.remove('open', 'opacity-100');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };
    
    function openAccountModal() {
        resetAccountForm();
        renderAccountListInModal();
        openModal('account-modal');
    }
    
    function resetAccountForm() {
        const form = document.getElementById('account-form');
        form.reset();
        form['account-id'].value = '';
        document.getElementById('account-form-title').textContent = 'Adicionar Novo';
        document.getElementById('account-initial-balance').disabled = false;
        document.getElementById('cancel-account-edit').classList.add('hidden');
        document.getElementById('credit-card-fields').classList.add('hidden');
        document.getElementById('account-initial-balance-label').textContent = 'Saldo Inicial (R$)';
    }

    function openTransactionModal(transaction = null) {
        const form = document.getElementById('transaction-form');
        form.reset();
        document.getElementById('transaction-id').value = '';
        document.getElementById('is-recurring').checked = false;
        document.getElementById('recurring-options').classList.add('hidden');
        document.getElementById('is-recurring').disabled = false;
        
        if (transaction) {
            document.getElementById('modal-title').textContent = 'Editar Transação';
            document.getElementById('transaction-id').value = transaction.id;
            document.getElementById('transaction-amount').value = transaction.amount;
            document.getElementById('transaction-description').value = transaction.description;
            document.getElementById('transaction-date').value = transaction.date;
            setTransactionType(transaction.type);
            
            if(transaction.type === 'transfer') {
                document.getElementById('transfer-source-account').value = transaction.sourceAccountId;
                document.getElementById('transfer-destination-account').value = transaction.destinationAccountId;
            } else {
                document.getElementById('transaction-account').value = transaction.accountId;
                document.getElementById('transaction-category').value = transaction.categoryId;
            }
            
            document.getElementById('is-recurring').disabled = true;
            document.getElementById('recurring-section').classList.add('hidden');
        } else {
            document.getElementById('modal-title').textContent = 'Adicionar Transação';
            document.getElementById('transaction-date').valueAsDate = new Date();
            document.getElementById('recurring-section').classList.remove('hidden');
            setTransactionType('expense');
        }
        openModal('transaction-modal');
    }
    
    function updateTransactionAccountDropdowns() {
        const selects = [
            document.getElementById('transaction-account'),
            document.getElementById('transfer-source-account'),
            document.getElementById('transfer-destination-account'),
            document.getElementById('import-account-select')
        ];
        // Para transferências, filtre para não mostrar cartões de crédito
        const regularAccountsHtml = AppState.accounts
            .filter(a => !a.isCreditCard)
            .map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        const allAccountsHtml = AppState.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        
        selects.forEach(select => {
            if (select) {
                const firstOption = select.querySelector('option[value=""]');
                if (select.id === 'transfer-source-account' || select.id === 'transfer-destination-account') {
                    select.innerHTML = (firstOption ? firstOption.outerHTML : '') + regularAccountsHtml;
                } else {
                    select.innerHTML = (firstOption ? firstOption.outerHTML : '') + allAccountsHtml;
                }
            }
        });
    }

    function updateTransactionCategoryDropdown() {
        const select = document.getElementById('transaction-category');
        const currentType = document.getElementById('transaction-type').value || 'expense';
        select.innerHTML = '<option value="">Selecione uma categoria</option>';
        AppState.categories.filter(c => c.type === currentType).forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
    
    function setTransactionType(type) {
        document.getElementById('transaction-type').value = type;
        
        const typeButtons = {
            income: document.getElementById('type-income'),
            expense: document.getElementById('type-expense'),
            transfer: document.getElementById('type-transfer'),
        };
        
        const activeClasses = ['bg-purple-600', 'text-white', 'border-purple-500'];
        const inactiveClasses = ['bg-slate-700', 'text-slate-300', 'border-slate-600'];

        Object.keys(typeButtons).forEach(key => {
            const btn = typeButtons[key];
            if (key === type) {
                btn.classList.add(...activeClasses);
                btn.classList.remove(...inactiveClasses);
            } else {
                btn.classList.add(...inactiveClasses);
                btn.classList.remove(...activeClasses);
            }
        });

        const incomeExpenseFields = document.getElementById('income-expense-fields');
        const transferFields = document.getElementById('transfer-fields');
        const recurringSection = document.getElementById('recurring-section');
        
        if (type === 'transfer') {
            incomeExpenseFields.classList.add('hidden');
            transferFields.classList.remove('hidden');
            recurringSection.classList.add('hidden');
        } else {
            incomeExpenseFields.classList.remove('hidden');
            transferFields.classList.add('hidden');
            recurringSection.classList.remove('hidden');
            updateTransactionCategoryDropdown();
        }
        updateTransactionAccountDropdowns();
    }
    
    document.addEventListener('click', async (e) => {
        const editTxBtn = e.target.closest('.edit-transaction-btn');
        if (editTxBtn) {
            const txToEdit = AppState.transactions.find(tx => tx.id === editTxBtn.dataset.id);
            if (txToEdit) openTransactionModal(txToEdit);
        }

        const deleteTxBtn = e.target.closest('.delete-transaction-btn');
        if (deleteTxBtn && confirm('Tem certeza que deseja excluir esta transação?')) {
            try {
                await deleteDoc(doc(db, `users/${AppState.currentUser.uid}/transactions`, deleteTxBtn.dataset.id));
                showToast('Transação excluída.');
            } catch (error) { showToast('Erro ao excluir transação.', true); }
        }

        const deleteCategoryBtn = e.target.closest('.delete-category-btn');
        if (deleteCategoryBtn && confirm('Tem certeza que deseja excluir esta categoria? Isso não afetará as transações existentes.')) {
            try {
                await deleteDoc(doc(db, `users/${AppState.currentUser.uid}/categories`, deleteCategoryBtn.dataset.id));
                showToast('Categoria excluída.');
            } catch (error) { showToast('Erro ao excluir categoria.', true); }
        }
        
        const editAccountBtn = e.target.closest('.edit-account-btn');
        if (editAccountBtn) {
            const accountToEdit = AppState.accounts.find(a => a.id === editAccountBtn.dataset.id);
            if (accountToEdit) {
                const form = document.getElementById('account-form');
                form['account-id'].value = accountToEdit.id;
                form['account-name'].value = accountToEdit.name;
                form['account-type'].value = accountToEdit.type;
                form['account-initial-balance'].value = accountToEdit.initialBalance;
                
                // Habilitar/desabilitar campos de cartão de crédito
                const typeSelect = document.getElementById('account-type');
                typeSelect.dispatchEvent(new Event('change'));

                if(accountToEdit.isCreditCard) {
                    form['card-closing-day'].value = accountToEdit.closingDay;
                    form['card-payment-day'].value = accountToEdit.paymentDay;
                }

                form['account-initial-balance'].disabled = true;
                document.getElementById('account-form-title').textContent = 'Editar Conta';
                document.getElementById('cancel-account-edit').classList.remove('hidden');
                form['account-name'].focus();
            }
        }
        
        const deleteAccountBtn = e.target.closest('.delete-account-btn');
        if (deleteAccountBtn && confirm('Atenção: Excluir esta conta/cartão irá apagar TODAS as transações associadas a ela. Deseja continuar?')) {
            try {
                const accountId = deleteAccountBtn.dataset.id;
                const batch = writeBatch(db);
                
                const q1 = query(collection(db, `users/${AppState.currentUser.uid}/transactions`), where('accountId', '==', accountId));
                const q2 = query(collection(db, `users/${AppState.currentUser.uid}/transactions`), where('sourceAccountId', '==', accountId));
                const q3 = query(collection(db, `users/${AppState.currentUser.uid}/transactions`), where('destinationAccountId', '==', accountId));

                const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
                
                snap1.forEach(doc => batch.delete(doc.ref));
                snap2.forEach(doc => batch.delete(doc.ref));
                snap3.forEach(doc => batch.delete(doc.ref));

                const accountRef = doc(db, `users/${AppState.currentUser.uid}/accounts`, accountId);
                batch.delete(accountRef);
                
                await batch.commit();
                showToast('Conta/Cartão e transações associadas foram excluídos.');

            } catch(error) {
                console.error('Erro ao excluir conta:', error);
                showToast('Erro ao excluir a conta/cartão.', true);
            }
        }

        const editGoalBtn = e.target.closest('.edit-goal-btn');
        if (editGoalBtn) {
            const goalToEdit = AppState.goals.find(g => g.id === editGoalBtn.dataset.id);
            if (goalToEdit) openGoalModal(goalToEdit);
        }

        const deleteGoalBtn = e.target.closest('.delete-goal-btn');
        if (deleteGoalBtn && confirm('Tem certeza que deseja excluir esta meta?')) {
            try {
                await deleteDoc(doc(db, `users/${AppState.currentUser.uid}/goals`, deleteGoalBtn.dataset.id));
                showToast('Meta excluída.');
            } catch (error) { showToast('Erro ao excluir meta.', true); }
        }
    });

    document.getElementById('add-transaction-btn').addEventListener('click', () => openTransactionModal());
    document.getElementById('cancel-transaction').addEventListener('click', () => closeModal('transaction-modal'));
    document.getElementById('type-income').addEventListener('click', () => setTransactionType('income'));
    document.getElementById('type-expense').addEventListener('click', () => setTransactionType('expense'));
    document.getElementById('type-transfer').addEventListener('click', () => setTransactionType('transfer'));
    document.getElementById('add-account-btn').addEventListener('click', () => openAccountModal());
    document.getElementById('close-account-modal').addEventListener('click', () => closeModal('account-modal'));
    document.getElementById('cancel-account-edit').addEventListener('click', resetAccountForm);

    // Listener para mostrar/ocultar campos de cartão de crédito
    document.getElementById('account-type').addEventListener('change', (e) => {
        const isCreditCard = e.target.value === 'Cartão de Crédito';
        document.getElementById('credit-card-fields').classList.toggle('hidden', !isCreditCard);
        const balanceLabel = document.getElementById('account-initial-balance-label');
        balanceLabel.textContent = isCreditCard ? 'Fatura Atual (R$)' : 'Saldo Inicial (R$)';
    });

    document.getElementById('is-recurring').addEventListener('change', (e) => {
        document.getElementById('recurring-options').classList.toggle('hidden', !e.target.checked);
    });

    // --- EXPORTAR DADOS ---
    document.getElementById('export-pdf-btn').addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        showToast('Gerando seu relatório PDF...');

        docPDF.setFontSize(22);
        docPDF.setFont('helvetica', 'bold');
        docPDF.text('FinanTrack', 15, 20);
        docPDF.setFontSize(12);
        docPDF.setFont('helvetica', 'normal');
        docPDF.text('Relatório Financeiro', 15, 28);
        docPDF.setFontSize(10);
        docPDF.setTextColor(150);
        docPDF.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 15, 34);
        
        const summaryElement = document.getElementById('summary');
        const summaryCanvas = await window.html2canvas(summaryElement, { backgroundColor: '#1e293b' });
        const summaryImgData = summaryCanvas.toDataURL('image/png');
        docPDF.addImage(summaryImgData, 'PNG', 15, 45, 180, 30);

        const pieChartCanvas = await window.html2canvas(document.getElementById('expense-pie-chart').parentElement, { backgroundColor: '#1e293b' });
        const pieChartImgData = pieChartCanvas.toDataURL('image/png');
        docPDF.addImage(pieChartImgData, 'PNG', 15, 85, 90, 90);

        const monthlyChartCanvas = await window.html2canvas(document.getElementById('monthly-trend-chart').parentElement, { backgroundColor: '#1e293b' });
        const monthlyChartImgData = monthlyChartCanvas.toDataURL('image/png');
        docPDF.addImage(monthlyChartImgData, 'PNG', 110, 85, 90, 90);

        docPDF.addPage();
        docPDF.setFontSize(16);
        docPDF.setFont('helvetica', 'bold');
        docPDF.text('Detalhes das Transações', 15, 20);
        
        const transactionsToExport = applyFilters(AppState.transactions);
        const tableData = transactionsToExport.map(tx => {
            let category = 'N/A';
            let value = formatCurrency(tx.amount);
            if (tx.type === 'income') {
                category = AppState.categories.find(c => c.id === tx.categoryId)?.name || 'N/A';
                value = `+${value}`;
            } else if (tx.type === 'expense') {
                 category = AppState.categories.find(c => c.id === tx.categoryId)?.name || 'N/A';
                 value = `-${value}`;
            } else if (tx.type === 'transfer') {
                category = 'Transferência';
            }
            return [
                tx.description,
                formatDate(tx.date),
                category,
                value
            ];
        });

        docPDF.autoTable({
            head: [['Descrição', 'Data', 'Categoria', 'Valor']],
            body: tableData,
            startY: 30,
            theme: 'striped',
            headStyles: { fillColor: [148, 105, 224] },
        });
        
        docPDF.save(`Relatorio_FinanTrack_${new Date().toISOString().slice(0,10)}.pdf`);
    });

    document.getElementById('export-csv-btn').addEventListener('click', () => {
        const transactionsToExport = applyFilters(AppState.transactions);
        if (transactionsToExport.length === 0) {
            showToast('Não há dados para exportar.', true);
            return;
        }
        showToast('Gerando seu arquivo CSV...');
        const headers = ['Data', 'Descrição', 'Conta', 'Categoria', 'Tipo', 'Valor'];
        const csvRows = [headers.join(',')];
        transactionsToExport.forEach(tx => {
            let accountName = 'N/A', categoryName = 'N/A', type = '', value = tx.amount;
            if (tx.type === 'income' || tx.type === 'expense') {
                accountName = AppState.accounts.find(a => a.id === tx.accountId)?.name || 'N/A';
                categoryName = AppState.categories.find(c => c.id === tx.categoryId)?.name || 'N/A';
                type = tx.type === 'income' ? 'Receita' : 'Despesa';
            } else if (tx.type === 'transfer') {
                const source = AppState.accounts.find(a => a.id === tx.sourceAccountId)?.name || 'N/A';
                const dest = AppState.accounts.find(a => a.id === tx.destinationAccountId)?.name || 'N/A';
                accountName = `${source} -> ${dest}`;
                categoryName = 'Transferência';
                type = 'Transferência';
            }

            const row = [
                tx.date,
                `"${tx.description.replace(/"/g, '""')}"`,
                `"${accountName}"`,
                `"${categoryName}"`,
                type,
                value
            ];
            csvRows.push(row.join(','));
        });
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Transacoes_FinanTrack_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    // --- CLASSIFICAÇÃO AUTOMÁTICA ---
    function suggestCategory(description) {
        if (!description) return;
        const lowerDesc = description.toLowerCase();
        const transactionType = document.getElementById('transaction-type').value;

        for (const categoryName in categoryKeywords) {
            const keywords = categoryKeywords[categoryName];
            if (keywords.some(keyword => lowerDesc.includes(keyword))) {
                const userCategory = AppState.categories.find(c => 
                    c.name.toLowerCase() === categoryName.toLowerCase() && c.type === transactionType
                );

                if (userCategory) {
                    document.getElementById('transaction-category').value = userCategory.id;
                    break; 
                }
            }
        }
    }
    document.getElementById('transaction-description').addEventListener('blur', (e) => {
        suggestCategory(e.target.value);
    });


    // --- LANÇAMENTOS RECORRENTES ---
    async function checkAndGenerateRecurringTransactions() {
        if (!AppState.currentUser) return;
        console.log("Verificando lançamentos recorrentes...");

        const now = Timestamp.now();
        const recurringRef = collection(db, `users/${AppState.currentUser.uid}/recurringTransactions`);
        const q = query(recurringRef, where("isActive", "==", true), where("nextDueDate", "<=", now));

        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                console.log("Nenhum lançamento recorrente para gerar.");
                return;
            }

            const batch = writeBatch(db);
            let generatedCount = 0;

            querySnapshot.forEach(docSnap => {
                const recurringTx = { id: docSnap.id, ...docSnap.data() };
                
                if (!recurringTx.nextDueDate || typeof recurringTx.nextDueDate.toDate !== 'function') {
                    console.warn("Lançamento recorrente ignorado: nextDueDate inválido.", recurringTx);
                    return; 
                }

                const newTransactionData = {
                    amount: recurringTx.amount || 0,
                    categoryId: recurringTx.categoryId,
                    accountId: recurringTx.accountId,
                    date: recurringTx.nextDueDate.toDate().toISOString().slice(0, 10),
                    description: recurringTx.description || 'Lançamento recorrente',
                    type: recurringTx.type,
                };
                const newTransactionRef = doc(collection(db, `users/${AppState.currentUser.uid}/transactions`));
                batch.set(newTransactionRef, newTransactionData);

                let nextDueDate = recurringTx.nextDueDate.toDate();
                if (recurringTx.frequency === 'weekly') {
                    nextDueDate.setDate(nextDueDate.getDate() + 7);
                } else { // monthly
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                }

                const recurringDocRef = doc(db, `users/${AppState.currentUser.uid}/recurringTransactions`, recurringTx.id);
                const hasValidEndDate = recurringTx.endDate && typeof recurringTx.endDate.toDate === 'function';

                if (hasValidEndDate && nextDueDate > recurringTx.endDate.toDate()) {
                    batch.update(recurringDocRef, { isActive: false });
                } else {
                    batch.update(recurringDocRef, { nextDueDate: Timestamp.fromDate(nextDueDate) });
                }
                generatedCount++;
            });

            if (generatedCount > 0) {
                await batch.commit();
                showToast(`${generatedCount} lançamento(s) recorrente(s) foram gerados.`);
            }

        } catch (error) {
            console.error("Erro ao gerar transações recorrentes:", error);
            showToast("Erro ao processar lançamentos recorrentes.", true);
        }
    }

    // --- METAS DE ECONOMIA ---
    function renderGoals(allTransactions) {
        const container = document.getElementById('goals-container');
        const noGoalsMsg = document.getElementById('no-goals-msg');

        if (AppState.goals.length === 0) {
            container.innerHTML = '';
            noGoalsMsg.classList.remove('hidden');
            return;
        }

        noGoalsMsg.classList.add('hidden');
        container.innerHTML = AppState.goals.map(goal => {
            const targetDate = goal.targetDate.toDate();
            const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);

            const transactionsInPeriod = allTransactions.filter(tx => {
                const txDate = new Date(tx.date + 'T00:00:00');
                return txDate >= startOfMonth && txDate <= targetDate;
            });
            
            let currentAmount = 0;
            let goalTypeText = '';
            
            if (goal.type === 'savings') {
                const incomeInPeriod = transactionsInPeriod.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const expenseInPeriod = transactionsInPeriod.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                currentAmount = incomeInPeriod - expenseInPeriod;
                goalTypeText = 'Economizado no mês';
            } else if (goal.type === 'spendingLimit') {
                currentAmount = transactionsInPeriod
                    .filter(t => t.type === 'expense' && goal.categoryIds.includes(t.categoryId))
                    .reduce((sum, t) => sum + t.amount, 0);
                goalTypeText = 'Gasto no mês';
            }

            const progressPercentage = Math.min(100, (currentAmount / goal.targetAmount) * 100);
            const isExceeded = goal.type === 'spendingLimit' && currentAmount > goal.targetAmount;

            return `
                <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="font-bold text-white">${goal.name}</p>
                            <p class="text-sm text-slate-400">Até ${targetDate.toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div class="flex gap-2">
                            <button data-id="${goal.id}" class="edit-goal-btn text-slate-500 hover:text-purple-400"><i data-feather="edit" class="w-4 h-4"></i></button>
                            <button data-id="${goal.id}" class="delete-goal-btn text-slate-500 hover:text-red-500"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mb-1 text-sm">
                        <span class="${isExceeded ? 'text-red-400' : 'text-slate-300'}">${formatCurrency(currentAmount)}</span>
                        <span class="text-slate-400">/ ${formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div class="w-full bg-slate-600 rounded-full h-2.5">
                        <div class="${isExceeded ? 'bg-red-500' : 'bg-purple-500'} h-2.5 rounded-full" style="width: ${progressPercentage > 0 ? progressPercentage : 0}%"></div>
                    </div>
                    <p class="text-xs text-slate-500 text-right mt-1">${goalTypeText}</p>
                </div>
            `;
        }).join('');
        feather.replace();
    }

    function openGoalModal(goal = null) {
        const form = document.getElementById('goal-form');
        form.reset();
        document.getElementById('goal-id').value = '';
        
        const categoryContainer = document.getElementById('goal-categories-container');
        const categorySelect = document.getElementById('goal-categories');
        categorySelect.innerHTML = AppState.categories
            .filter(c => c.type === 'expense')
            .map(c => `<option value="${c.id}">${c.name}</option>`)
            .join('');

        if (goal) {
            document.getElementById('goal-modal-title').textContent = 'Editar Meta';
            document.getElementById('goal-id').value = goal.id;
            document.getElementById('goal-name').value = goal.name;
            document.getElementById('goal-target-amount').value = goal.targetAmount;
            document.getElementById('goal-target-date').value = goal.targetDate.toDate().toISOString().slice(0, 10);
            document.getElementById('goal-type').value = goal.type;
            
            if (goal.type === 'spendingLimit') {
                categoryContainer.classList.remove('hidden');
                goal.categoryIds.forEach(id => {
                    const option = categorySelect.querySelector(`option[value="${id}"]`);
                    if(option) option.selected = true;
                });
            } else {
                categoryContainer.classList.add('hidden');
            }
        } else {
            document.getElementById('goal-modal-title').textContent = 'Nova Meta';
            const today = new Date();
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            document.getElementById('goal-target-date').valueAsDate = endOfMonth;
            categoryContainer.classList.add('hidden');
        }
        openModal('goal-modal');
    }

    document.getElementById('goal-type').addEventListener('change', (e) => {
        document.getElementById('goal-categories-container').classList.toggle('hidden', e.target.value !== 'spendingLimit');
    });

    document.getElementById('goal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const id = form['goal-id'].value;
        const type = form['goal-type'].value;

        let categoryIds = [];
        if (type === 'spendingLimit') {
            categoryIds = Array.from(form['goal-categories'].selectedOptions).map(opt => opt.value);
            if (categoryIds.length === 0) {
                showToast('Para limite de gastos, você deve selecionar ao menos uma categoria.', true);
                return;
            }
        }
        
        const goalData = {
            name: form['goal-name'].value,
            targetAmount: parseFloat(form['goal-target-amount'].value),
            targetDate: Timestamp.fromDate(new Date(form['goal-target-date'].value + 'T23:59:59')),
            type: type,
            categoryIds: categoryIds,
            createdAt: id ? undefined : Timestamp.now(), 
        };
        Object.keys(goalData).forEach(key => goalData[key] === undefined && delete goalData[key]);

        try {
            const action = id
                ? updateDoc(doc(db, `users/${AppState.currentUser.uid}/goals`, id), goalData)
                : addDoc(collection(db, `users/${AppState.currentUser.uid}/goals`), goalData);

            await action;
            showToast(`Meta ${id ? 'atualizada' : 'criada'} com sucesso!`);
            closeModal('goal-modal');
        } catch(error) {
            console.error("Erro ao salvar meta:", error);
            showToast("Erro ao salvar a meta.", true);
        }
    });

    document.getElementById('add-goal-btn').addEventListener('click', () => openGoalModal());
    document.getElementById('cancel-goal').addEventListener('click', () => closeModal('goal-modal'));

    // --- IMPORTAÇÃO DE EXTRATO ---
    const importState = {
        fileContent: null,
        fileType: null,
        parsedData: [],
        headers: [],
    };

    function resetImportModal() {
        document.getElementById('import-file-input').value = '';
        document.getElementById('import-step-1').classList.remove('hidden');
        document.getElementById('import-step-2').classList.add('hidden');
        document.getElementById('import-step-3').classList.add('hidden');
        importState.parsedData = [];
        importState.headers = [];
    }
    
    function openImportModal() {
        if (AppState.accounts.length === 0) {
            showToast("Você precisa cadastrar uma conta antes de importar um extrato.", true);
            return;
        }
        resetImportModal();
        updateTransactionAccountDropdowns();
        openModal('import-modal');
    }

    document.getElementById('import-statement-btn').addEventListener('click', openImportModal);
    document.getElementById('cancel-import-1').addEventListener('click', () => closeModal('import-modal'));
    document.getElementById('cancel-import-2').addEventListener('click', () => closeModal('import-modal'));
    document.getElementById('cancel-import-3').addEventListener('click', () => closeModal('import-modal'));

    document.getElementById('next-import-step-btn').addEventListener('click', async () => {
        const fileInput = document.getElementById('import-file-input');
        const file = fileInput.files[0];
        const accountId = document.getElementById('import-account-select').value;

        if (!file || !accountId) {
            showToast("Por favor, selecione um arquivo e uma conta.", true);
            return;
        }
        
        AppState.importData.accountId = accountId;

        try {
            const fileContent = await file.text();
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (fileExtension === 'csv') {
                const { data, headers } = parseCSV(fileContent);
                importState.parsedData = data;
                importState.headers = headers;
            } else if (fileExtension === 'ofx') {
                const { data, headers } = parseOFX(fileContent);
                importState.parsedData = data;
                importState.headers = headers;
            } else {
                throw new Error("Formato de arquivo não suportado.");
            }

            setupMappingStep();
            document.getElementById('import-step-1').classList.add('hidden');
            document.getElementById('import-step-2').classList.remove('hidden');

        } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            showToast(`Erro ao ler o arquivo: ${error.message}`, true);
        }
    });
    
    function parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return { data: [], headers: [] };

        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
            const values = line.split(separator);
            let row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
            });
            return row;
        });
        return { data, headers };
    }

    function parseOFX(ofxText) {
        const ofxData = window.ofx.parse(ofxText);
        const transactions = ofxData.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;
        const headers = ['date', 'description', 'amount'];
        const data = transactions.map(t => ({
            date: `${t.DTPOSTED.substring(0,4)}-${t.DTPOSTED.substring(4,6)}-${t.DTPOSTED.substring(6,8)}`,
            description: t.MEMO,
            amount: t.TRNAMT
        }));
        return { data, headers };
    }

    function setupMappingStep() {
        const mappingContainer = document.getElementById('import-mapping-fields');
        const appFields = { date: "Data", description: "Descrição", amount: "Valor (R$)" };
        const optionsHtml = importState.headers.map(h => `<option value="${h}">${h}</option>`).join('');

        mappingContainer.innerHTML = Object.keys(appFields).map(key => `
            <div>
                <label for="map-${key}" class="block text-sm font-medium text-slate-400 mb-1">${appFields[key]}</label>
                <select id="map-${key}" data-field="${key}" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                    <option value="">Selecione uma coluna</option>
                    ${optionsHtml}
                </select>
            </div>
        `).join('');

        Object.keys(appFields).forEach(key => {
            const select = document.getElementById(`map-${key}`);
            const dateKeywords = ['data', 'date'];
            const descKeywords = ['descrição', 'historico', 'memo', 'description'];
            const amountKeywords = ['valor', 'montante', 'amount', 'trnamt'];

            let keywords;
            if(key === 'date') keywords = dateKeywords;
            if(key === 'description') keywords = descKeywords;
            if(key === 'amount') keywords = amountKeywords;

            const foundHeader = importState.headers.find(h => keywords.some(k => h.toLowerCase().includes(k)));
            if (foundHeader) {
                select.value = foundHeader;
            }
        });
    }

    document.getElementById('review-import-btn').addEventListener('click', () => {
        const dateMap = document.getElementById('map-date').value;
        const descMap = document.getElementById('map-description').value;
        const amountMap = document.getElementById('map-amount').value;
        const dateFormat = document.getElementById('import-date-format').value;
        const decimalSeparator = document.getElementById('import-decimal-separator').value;
        
        if (!dateMap || !descMap || !amountMap) {
            showToast("Por favor, mapeie todos os campos obrigatórios.", true);
            return;
        }

        AppState.importData.mapped = importState.parsedData.map(row => {
            const rawAmount = String(row[amountMap]);
            let amount = 0;
            if(rawAmount) {
               const cleanAmount = (decimalSeparator === ',') 
                    ? rawAmount.replace(/\./g, '').replace(',', '.') 
                    : rawAmount.replace(/,/g, '');
               amount = parseFloat(cleanAmount) || 0;
            }

            let date;
            const rawDate = row[dateMap];
            if (dateFormat === 'dmy') {
                const parts = rawDate.split('/');
                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else if (dateFormat === 'mdy') {
                const parts = rawDate.split('/');
                date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
            } else {
                date = new Date(rawDate);
            }
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

            return {
                date: date.toISOString().slice(0, 10),
                description: row[descMap],
                amount: Math.abs(amount),
                type: amount >= 0 ? 'income' : 'expense',
                accountId: AppState.importData.accountId,
                categoryId: ''
            };
        }).filter(tx => tx.amount && tx.description && !isNaN(new Date(tx.date).getTime()));
        
        if (AppState.importData.mapped.length === 0) {
            showToast("Nenhuma transação válida encontrada. Verifique os formatos.", true);
            return;
        }
        
        renderReviewStep();
        document.getElementById('import-step-2').classList.add('hidden');
        document.getElementById('import-step-3').classList.remove('hidden');
    });
    
    function renderReviewStep() {
        const tbody = document.getElementById('import-review-tbody');
        tbody.innerHTML = AppState.importData.mapped.map((tx, index) => `
            <tr class="border-b border-slate-700 hover:bg-slate-700/50">
                <td class="p-2"><input type="checkbox" class="import-checkbox" data-index="${index}" checked></td>
                <td class="p-2">${formatDate(tx.date)}</td>
                <td class="p-2">${tx.description}</td>
                <td class="p-2 text-right font-medium ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}">
                    ${formatCurrency(tx.amount)}
                </td>
            </tr>
        `).join('');

        document.getElementById('import-select-all').addEventListener('change', (e) => {
            document.querySelectorAll('.import-checkbox').forEach(box => box.checked = e.target.checked);
        });
    }
    
    document.getElementById('confirm-import-btn').addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.import-checkbox:checked');
        const transactionsToImport = Array.from(checkboxes).map(box => AppState.importData.mapped[box.dataset.index]);

        if (transactionsToImport.length === 0) {
            showToast("Nenhuma transação selecionada para importar.", true);
            return;
        }

        const button = document.getElementById('confirm-import-btn');
        const buttonText = document.getElementById('import-button-text');
        const spinner = document.getElementById('import-spinner');

        button.disabled = true;
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            const batch = writeBatch(db);
            transactionsToImport.forEach(tx => {
                const docRef = doc(collection(db, `users/${AppState.currentUser.uid}/transactions`));
                batch.set(docRef, tx);
            });
            await batch.commit();
            showToast(`${transactionsToImport.length} transações importadas com sucesso!`);
            closeModal('import-modal');
        } catch (error) {
            console.error("Erro ao importar transações:", error);
            showToast("Ocorreu um erro ao salvar as transações.", true);
        } finally {
            button.disabled = false;
            buttonText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });
});