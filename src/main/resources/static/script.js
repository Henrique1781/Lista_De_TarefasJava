document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SELEÇÃO DE ELEMENTOS ---
    const loader = document.getElementById('loader');
    const taskList = document.getElementById('task-list');
    const completedTaskList = document.getElementById('completed-task-list');
    const completedSection = document.getElementById('completed-section');
    const noTasksMessage = document.getElementById('no-tasks-message');
    const noFilteredTasksMessage = document.getElementById('no-filtered-tasks-message');
    const filterControls = document.querySelector('.filter-controls');
    const categoryFilterControls = document.getElementById('category-filter-controls');
    const mainContainer = document.querySelector('.container');
    const fab = document.getElementById('add-task-btn');

    const totalTasksStat = document.getElementById('total-tasks-stat');
    const completedTasksStat = document.getElementById('completed-tasks-stat');
    const pendingTasksStat = document.getElementById('pending-tasks-stat');
    const overdueTasksStat = document.getElementById('overdue-tasks-stat');

    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const taskForm = document.getElementById('task-form');
    const modalTitle = document.getElementById('modal-title');
    const hiddenTaskId = document.getElementById('task-id');
    const saveTaskBtn = document.getElementById('save-task-btn');

    const timeInput = document.getElementById('time');
    const timeSuggestions = document.getElementById('time-suggestions');

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeToggleBtn.querySelector('i');
    const muteToggleBtn = document.getElementById('mute-toggle-btn');
    const muteIcon = muteToggleBtn.querySelector('i');
    const logoutBtn = document.getElementById('logout-btn');

    const addSound = document.getElementById('add-sound');
    const completeSound = document.getElementById('complete-sound');
    const deleteSound = document.getElementById('delete-sound');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalText = document.getElementById('confirm-modal-text');
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    const toastContainer = document.getElementById('toast-container');

    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');

    const welcomeGreeting = document.getElementById('welcome-greeting');
    const profileIconBtn = document.getElementById('profile-icon-btn');
    const userInfoModal = document.getElementById('user-info-modal');
    const closeUserModalBtn = document.getElementById('close-user-modal-btn');
    const userInfoForm = document.getElementById('user-info-form');
    const userModalTitle = document.getElementById('user-modal-title');
    const userInfoView = document.getElementById('user-info-view');
    const userNameDisplay = document.getElementById('user-name-display');
    const userAgeDisplay = document.getElementById('user-age-display');
    const userInfoEdit = document.getElementById('user-info-edit');
    const userNameInput = document.getElementById('user-name-input');
    const userAgeInput = document.getElementById('user-age-input');
    const userPhotoInput = document.getElementById('user-photo-input');
    const userPhotoPreview = document.getElementById('user-photo-preview');
    const avatarContainer = document.getElementById('avatar-container');
    const profilePicUploader = document.querySelector('.profile-pic-uploader');
    const editUserInfoBtn = document.getElementById('edit-user-info-btn');
    const saveUserInfoBtn = document.getElementById('save-user-info-btn');
    const userTotalTasksSpan = document.getElementById('user-total-tasks');

    const locationWeatherSection = document.getElementById('location-weather-section');
    const weatherIconEl = document.getElementById('weather-icon');
    const temperatureEl = document.getElementById('temperature');
    const locationEl = document.getElementById('location');
    const currentTimeEl = document.getElementById('current-time');
    const currentDateEl = document.getElementById('current-date');
    let clockInterval = null;

    // --- 2. ESTADO DA APLICAÇÃO ---
    let allTasks = [];
    let currentFilter = 'all';
    let currentCategoryFilter = 'all';
    let isMuted = false;
    let authToken = localStorage.getItem('authToken');
    const API_BASE_URL = '';
    let resolveConfirm;

    // **NOVO** VAPID_PUBLIC_KEY para notificações push
    const VAPID_PUBLIC_KEY = "SUA_CHAVE_PUBLICA_AQUI"; // <-- COLE AQUI A MESMA CHAVE PÚBLICA DO application.properties

    let deferredInstallPrompt = null;
    const installPwaBtn = document.getElementById('install-pwa-btn');

    const categoryEmojis = {
        'Pessoal': '👤', 'Trabalho': '💼', 'Saúde': '❤️',
        'Estudos': '📚', 'Rotina': '🔄', 'Default': '📌'
    };
    let taskCheckInterval;
    let autoRefreshInterval;

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async function subscribeUserToPush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications não são suportadas neste navegador.');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                console.log('Usuário já inscrito para notificações push.');
                return; // Já está inscrito
            }

            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log('Nova inscrição para notificações push criada:', subscription);

            const subData = subscription.toJSON();
            const subscriptionPayload = {
                endpoint: subData.endpoint,
                p256dh: subData.keys.p256dh,
                auth: subData.keys.auth
            };

            await apiRequest('/api/notifications/subscribe', 'POST', subscriptionPayload);
            console.log('Inscrição enviada para o servidor com sucesso.');

        } catch (error) {
            console.error('Falha ao se inscrever para notificações push:', error);
            if (Notification.permission === 'denied') {
                showToast('As notificações foram bloqueadas. Habilite nas configurações do navegador.', true);
            }
        }
    }


    // --- FUNÇÃO PARA NOTIFICAR OUTRAS ABAS ---
    function notifyOtherTabs() {
        localStorage.setItem('tasks_last_updated', Date.now());
    }

    // --- FUNÇÕES DE UTILIDADE ---
    async function playSound(audioElement, volume = 0.5) {
        if (isMuted) return;
        try {
            audioElement.volume = volume;
            audioElement.currentTime = 0;
            await audioElement.play();
        } catch (error) {
            console.error(`Erro ao tocar o som (${audioElement.src}):`, error.message);
        }
    }

    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : ''}`;
        toast.innerHTML = `<i class="ph-bold ${isError ? 'ph-x-circle' : 'ph-check-circle'}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // --- 3. FUNÇÕES DA API ---
    async function apiRequest(endpoint, method = 'GET', body = null, showLoader = false) {
        if (showLoader) loader.classList.remove('hidden');

        let url;
        try {
            url = `${API_BASE_URL}${endpoint}`;
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (authToken) {
                options.headers['Authorization'] = `Bearer ${authToken}`;
            }
            if (body) options.body = JSON.stringify(body);
            const response = await fetch(url, options);

            if ((response.status === 401 || response.status === 403) && endpoint !== '/api/user/login') {
                logout();
                return;
            }

            if (!response.ok) {
                let errorBody;
                try {
                    errorBody = await response.text();
                } catch (e) {
                    errorBody = response.statusText;
                }
                throw new Error(errorBody || `HTTP error! status: ${response.status}`);
            }
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            console.error(`Error during API request to endpoint: ${endpoint}. URL: ${url}.`, error);
            throw error;
        } finally {
            if (showLoader) loader.classList.add('hidden');
        }
    }

    // --- 4. RENDERIZAÇÃO E LÓGICA (Tarefas) ---
    function updateStats() {
        const now = new Date();
        const fiveMinutesInMillis = 5 * 60 * 1000;

        const completedCount = allTasks.filter(task => task.completed).length;

        const overdueCount = allTasks.filter(task =>
            !task.completed &&
            task.date &&
            task.time &&
            (now.getTime() - new Date(`${task.date}T${task.time}`).getTime()) > fiveMinutesInMillis
        ).length;

        const pendingCount = allTasks.length - completedCount;

        totalTasksStat.textContent = allTasks.length;
        completedTasksStat.textContent = completedCount;
        pendingTasksStat.textContent = pendingCount < 0 ? 0 : pendingCount;
        overdueTasksStat.textContent = overdueCount;
    }

    function renderTasks() {
        updateStats();
        const priorityOrder = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
        const sortedTasks = [...allTasks].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;
            if (priorityB !== priorityA) return priorityB - priorityA;
            const dateA = a.date && a.time ? new Date(`${a.date}T${a.time}`) : 0;
            const dateB = b.date && b.time ? new Date(`${b.date}T${b.time}`) : 0;
            return dateA - dateB;
        });

        const pendingTasks = sortedTasks.filter(task => !task.completed);
        const completedTasks = sortedTasks.filter(task => task.completed);

        taskList.innerHTML = '';
        completedTaskList.innerHTML = '';

        let filteredPendingTasks = pendingTasks;
        const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        switch (currentFilter) {
            case 'today':
                filteredPendingTasks = pendingTasks.filter(task => task.date === today);
                break;
            case 'upcoming':
                filteredPendingTasks = pendingTasks.filter(task => task.date > today);
                break;
            case 'routines':
                filteredPendingTasks = pendingTasks.filter(task => task.recurring);
                break;
        }

        if (currentCategoryFilter !== 'all') {
            filteredPendingTasks = filteredPendingTasks.filter(task => task.category === currentCategoryFilter);
        }

        noTasksMessage.classList.add('hidden');
        noFilteredTasksMessage.classList.add('hidden');

        if (filteredPendingTasks.length > 0) {
            filteredPendingTasks.forEach(task => taskList.appendChild(createTaskElement(task)));
        } else {
            if (allTasks.length === 0) {
                noTasksMessage.classList.remove('hidden');
            } else {
                noFilteredTasksMessage.classList.remove('hidden');
            }
        }

        completedSection.classList.toggle('hidden', completedTasks.length === 0);
        if (completedTasks.length > 0) {
            completedTasks.forEach(task => completedTaskList.appendChild(createTaskElement(task)));
        }

        scheduleTaskChecks();
    }


    function createTaskElement(task) {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card priority-${task.priority}`;
        taskCard.dataset.id = task.id;

        if (task.completed) {
            taskCard.classList.add('completed');
        }

        updateTaskStatusClasses(taskCard, task);

        const emoji = categoryEmojis[task.category] || categoryEmojis['Default'];
        const formattedDate = task.date ? new Date(task.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Sem data';
        const timeDisplay = task.time ? task.time.substring(0, 5) : 'Sem hora';

        const reactivationCountdown = task.completed && task.recurring ? `<div class="meta-item reactivation-countdown"><i class="ph-fill ph-timer"></i><span></span></div>` : '';

        taskCard.innerHTML = `
            <div class="task-checkbox-container">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            </div>
            <div class="task-info">
                <div class="task-title">
                    <span>${emoji}</span>
                    <h4>${task.title}</h4>
                </div>
                <div class="task-meta">
                    <div class="meta-item"><i class="ph-light ph-calendar"></i><span>${formattedDate}</span></div>
                    <div class="meta-item"><i class="ph-light ph-clock"></i><span>${timeDisplay}</span></div>
                    <div class="meta-item"><i class="ph-light ph-tag"></i><span>${task.category}</span></div>
                    <div class="meta-item"><i class="ph-light ph-flag"></i><span>${task.priority}</span></div>
                    ${task.recurring ? `<div class="meta-item"><i class="ph-fill ph-repeat" style="color: var(--primary-color);"></i><span>Diária</span></div>` : ''}
                </div>
                ${task.withNotification && !task.completed ? `<div class="meta-item"><div class="meta-item notification-countdown"><i class="ph-light ph-alarm"></i><span></span></div></div>` : ''}
                ${reactivationCountdown}
                ${task.description ? `<p class="task-description">${task.description.replace(/\n/g, '<br>')}</p>` : ''}
            </div>
            <div class="task-actions-menu">
                <button type="button" class="menu-btn"><i class="ph-bold ph-dots-three-vertical"></i></button>
                <div class="dropdown-menu hidden">
                    <button type="button" class="edit-btn"><i class="ph ph-pencil-simple"></i> Editar</button>
                    <button type="button" class="delete-btn"><i class="ph ph-trash"></i> Excluir</button>
                </div>
            </div>
        `;
        return taskCard;
    }

    async function loadTasks() {
        if (!authToken) return;
        try {
            const tasks = await apiRequest('/api/tasks');
            if (tasks) {
                allTasks = tasks;
                renderTasks();
            }
        } catch (error) {
            showToast("Não foi possível carregar as tarefas.", true);
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        }
    }

    // --- 5. MANIPULAÇÃO DE EVENTOS (Tarefas) ---
    document.body.addEventListener('click', async (event) => {
        const target = event.target;
        const taskCard = target.closest('.task-card');

        if (!target.closest('.task-actions-menu')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        }
        if (!taskCard) return;

        const id = taskCard.dataset.id;
        const task = allTasks.find(t => t.id == id);
        if (!task) return;

        if (target.classList.contains('task-checkbox')) {
            try {
                const isChecked = target.checked;
                task.completed = isChecked;
                await apiRequest(`/api/tasks/${id}`, 'PUT', task, true);

                if (task.recurring && isChecked) {
                    showToast("Rotina concluída! Ela será reativada amanhã.");
                } else {
                    showToast(isChecked ? "Tarefa concluída!" : "Tarefa reaberta!");
                }

                if (isChecked) playSound(completeSound, 0.3);
                await loadTasks();
                notifyOtherTabs();
            } catch (error) {
                showToast("Erro ao atualizar a tarefa.", true);
                loadTasks();
            }
        }

        if (target.closest('.menu-btn')) {
            const menu = taskCard.querySelector('.dropdown-menu');
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
        }

        if (target.classList.contains('edit-btn')) {
            openModalForEdit(task);
        }

        if (target.classList.contains('delete-btn')) {
            const confirmed = await showCustomConfirm('Tem certeza que deseja excluir esta tarefa?');
            if (confirmed) {
                try {
                    playSound(deleteSound, 0.4);
                    await apiRequest(`/api/tasks/${id}`, 'DELETE', null, true);
                    showToast("Tarefa excluída com sucesso!");
                    await loadTasks();
                    notifyOtherTabs();
                } catch (error) {
                    showToast("Erro ao excluir a tarefa.", true);
                }
            }
        }
    });

    filterControls.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            currentFilter = event.target.dataset.filter;
            filterControls.querySelector('.filter-btn.active').classList.remove('active');
            event.target.classList.add('active');
            renderTasks();
        }
    });

    categoryFilterControls.addEventListener('click', (event) => {
        if (event.target.tagName !== 'BUTTON') return;

        const clickedButton = event.target;
        const filter = clickedButton.dataset.filter;
        const currentlyActiveButton = categoryFilterControls.querySelector('.filter-btn.active');

        if (clickedButton.classList.contains('active')) {
            clickedButton.classList.remove('active');
            currentCategoryFilter = 'all';
        } else {
            if (currentlyActiveButton) {
                currentlyActiveButton.classList.remove('active');
            }
            clickedButton.classList.add('active');
            currentCategoryFilter = filter;
        }
        renderTasks();
    });

    async function handleFormSubmit(event) {
        event.preventDefault();
        const id = hiddenTaskId.value;
        const timeValue = timeInput.value;

        if (timeValue && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue)) {
            showToast("Formato de horário inválido. Use HH:mm.", true);
            return;
        }

        const dateValue = document.getElementById('date').value;
        const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        if (dateValue === today && timeValue) {
            const now = new Date();
            const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            if (timeValue < currentTime) {
                showToast("Não é possível agendar uma tarefa para um horário que já passou hoje.", true);
                return;
            }
        }

        const taskData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            date: dateValue,
            time: timeValue ? `${timeValue}:00` : null,
            category: document.getElementById('category').value,
            priority: document.getElementById('priority').value,
            withNotification: document.getElementById('withNotification').checked,
            recurring: document.getElementById('recurring').checked,
            completed: id ? allTasks.find(t => t.id == id).completed : false,
            notificationState: 0
        };

        const endpoint = id ? `/api/tasks/${id}` : '/api/tasks';
        const method = id ? 'PUT' : 'POST';

        try {
            await apiRequest(endpoint, method, taskData, true);
            showToast(id ? "Tarefa atualizada com sucesso!" : "Tarefa adicionada com sucesso!");

            if (!id) {
                playSound(addSound, 0.5);
                const currentTotal = parseInt(localStorage.getItem('totalTasks') || '0', 10);
                const newTotal = currentTotal + 1;
                localStorage.setItem('totalTasks', newTotal);
                userTotalTasksSpan.textContent = newTotal;
            }

            closeModal();
            await loadTasks();
            notifyOtherTabs();
        } catch (error) {
            showToast("Erro ao salvar a tarefa.", true);
        }
    }
    taskForm.addEventListener('submit', handleFormSubmit);

    // --- 6. LÓGICA DO MODAL E SUGESTÕES DE HORÁRIO ---
    function populateTimeSuggestions() {
        timeSuggestions.innerHTML = '';
        const now = new Date();
        let startHour = now.getHours();
        let startMinute = now.getMinutes();

        const dateValue = document.getElementById('date').value;
        const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        if (dateValue === today) {
            if (startMinute < 30) {
                startMinute = 30;
            } else {
                startMinute = 0;
                startHour += 1;
            }
        } else {
            startHour = 0;
            startMinute = 0;
        }

        for (let h = startHour; h < 24; h++) {
            for (let m = (h === startHour ? startMinute : 0); m < 60; m += 30) {
                const hourString = h.toString().padStart(2, '0');
                const minuteString = m.toString().padStart(2, '0');
                const timeString = `${hourString}:${minuteString}`;
                const option = document.createElement('option');
                option.value = timeString;
                timeSuggestions.appendChild(option);
            }
        }
    }

    timeInput.addEventListener('focus', populateTimeSuggestions);

    function setDateInputMin() {
        const dateInput = document.getElementById('date');
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const todayLocal = new Date(today.getTime() - (offset * 60 * 1000));
        dateInput.min = todayLocal.toISOString().split('T')[0];
        return dateInput.min;
    }

    function openModalForEdit(task) {
        modalTitle.textContent = 'Editar Tarefa';
        saveTaskBtn.innerHTML = '<i class="ph-bold ph-check"></i> Salvar Alterações';
        taskForm.reset();
        setDateInputMin();

        hiddenTaskId.value = task.id;
        document.getElementById('title').value = task.title;
        document.getElementById('description').value = task.description;
        document.getElementById('date').value = task.date;
        document.getElementById('time').value = task.time ? task.time.substring(0, 5) : "";
        document.getElementById('category').value = task.category;
        document.getElementById('priority').value = task.priority;
        document.getElementById('withNotification').checked = task.withNotification;
        document.getElementById('recurring').checked = task.recurring;

        taskModal.classList.remove('hidden');
    }

    function openModalForCreate() {
        modalTitle.textContent = 'Nova Tarefa';
        saveTaskBtn.innerHTML = '<i class="ph-bold ph-plus"></i> Adicionar Tarefa';
        taskForm.reset();
        hiddenTaskId.value = '';

        const defaultDate = setDateInputMin();
        document.getElementById('date').value = defaultDate;
        document.getElementById('withNotification').checked = true;

        taskModal.classList.remove('hidden');
    }

    function closeModal() { taskModal.classList.add('hidden'); }
    addTaskBtn.addEventListener('click', openModalForCreate);
    closeModalBtn.addEventListener('click', closeModal);

    // --- 7. GESTÃO DE USUÁRIO E AUTENTICAÇÃO ---
    function showLoginState() {
        mainContainer.classList.remove('hidden');
        fab.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        loginModal.classList.add('hidden');
        registerModal.classList.add('hidden');
    }

    function showLoggedOutState() {
        mainContainer.classList.remove('hidden');
        fab.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        loginModal.classList.remove('hidden');
        registerModal.classList.add('hidden');
        loader.classList.add('hidden');
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    }

    function logout() {
        authToken = null;
        localStorage.clear();
        allTasks = [];
        renderTasks();
        showLoggedOutState();
    }

    logoutBtn.addEventListener('click', logout);
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginModal.classList.add('hidden'); registerModal.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerModal.classList.add('hidden'); loginModal.classList.remove('hidden'); });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const data = await apiRequest('/api/user/login', 'POST', { username, password }, true);
            if (data && data.token) {
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('userName', data.name);
                localStorage.setItem('userAge', data.age);
                localStorage.setItem('userPhoto', data.photo);
                localStorage.setItem('totalTasks', data.totalTasks);

                showLoginState();
                updateUserInfoUI(data);
                initializeApp();
            }
        } catch (error) {
            showToast(error.message || "Erro ao fazer login.", true);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const age = document.getElementById('register-age').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        try {
            await apiRequest('/api/user/register', 'POST', { name, age, username, password }, true);
            showToast("Usuário registrado com sucesso! Faça o login.");
            registerModal.classList.add('hidden');
            loginModal.classList.remove('hidden');
        } catch (error) {
            showToast(error.message || "Erro ao registrar usuário. Tente outro nome.", true);
        }
    });

    function setUserInfoViewMode() {
        userInfoView.classList.remove('hidden');
        userInfoEdit.classList.add('hidden');
        editUserInfoBtn.classList.remove('hidden');
        saveUserInfoBtn.classList.add('hidden');
        profilePicUploader.classList.remove('edit-mode');
        userPhotoInput.disabled = true;
    }

    function setUserInfoEditMode() {
        userNameInput.value = localStorage.getItem('userName') || '';
        userAgeInput.value = localStorage.getItem('userAge') || '';
        userInfoView.classList.add('hidden');
        userInfoEdit.classList.remove('hidden');
        editUserInfoBtn.classList.add('hidden');
        saveUserInfoBtn.classList.remove('hidden');
        profilePicUploader.classList.add('edit-mode');
        userPhotoInput.disabled = false;
    }

    function updateUserInfoUI(userData = null) {
        const userName = userData ? userData.name : localStorage.getItem('userName') || '';
        const userAge = userData ? userData.age : localStorage.getItem('userAge') || '';
        const userPhoto = userData ? userData.photo : localStorage.getItem('userPhoto');
        const totalTasks = userData ? userData.totalTasks : localStorage.getItem('totalTasks') || '0';

        welcomeGreeting.textContent = userName ? `Olá, ${userName}!` : `Olá, Dev!`;
        userNameDisplay.textContent = userName || 'Não informado';
        userAgeDisplay.textContent = userAge || 'Não informada';
        userTotalTasksSpan.textContent = totalTasks;

        const defaultAvatarSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>`;

        if (userPhoto && userPhoto !== 'null') {
            userPhotoPreview.src = userPhoto;
            userPhotoPreview.style.display = 'block';
            avatarContainer.innerHTML = '';
            avatarContainer.appendChild(userPhotoPreview);
            profileIconBtn.innerHTML = `<img src="${userPhoto}" alt="Foto de Perfil">`;
        } else {
            avatarContainer.innerHTML = defaultAvatarSVG;
            userPhotoPreview.style.display = 'none';
            profileIconBtn.innerHTML = `<i class="ph-fill ph-user"></i>`;
        }
    }

    function openUserInfoModal() {
        const currentUserData = {
            name: localStorage.getItem('userName'),
            age: localStorage.getItem('userAge'),
            photo: localStorage.getItem('userPhoto'),
            totalTasks: localStorage.getItem('totalTasks')
        };
        updateUserInfoUI(currentUserData);
        setUserInfoViewMode();
        userInfoModal.classList.remove('hidden');
    }

    function closeUserInfoModal() {
        userInfoModal.classList.add('hidden');
    }

    async function handleUserInfoSubmit(event) {
        event.preventDefault();
        const name = userNameInput.value.trim();
        const age = userAgeInput.value.trim();
        const photoFile = userPhotoInput.files[0];

        if (!name || !age) {
            showToast("Por favor, preencha seu nome e idade.", true);
            return;
        }

        const updateData = { name, age };

        const saveAndUpdate = async (photoData) => {
            if (photoData) {
                updateData.photo = photoData;
            } else {
                const existingPhoto = localStorage.getItem('userPhoto');
                if (existingPhoto && existingPhoto.startsWith('data:image')) {
                    updateData.photo = existingPhoto;
                }
            }

            try {
                await apiRequest('/api/user/profile', 'PUT', updateData, true);
                localStorage.setItem('userName', name);
                localStorage.setItem('userAge', age);
                if (updateData.photo) {
                    localStorage.setItem('userPhoto', updateData.photo);
                }

                const refreshedUserData = {
                    name: name,
                    age: age,
                    photo: updateData.photo,
                    totalTasks: localStorage.getItem('totalTasks')
                };

                updateUserInfoUI(refreshedUserData);
                showToast("Informações salvas com sucesso!");
                closeUserInfoModal();
            } catch (error) {
                showToast("Erro ao salvar informações.", true);
            }
        };

        if (photoFile) {
            const reader = new FileReader();
            reader.onload = (e) => saveAndUpdate(e.target.result);
            reader.readAsDataURL(file);
        } else {
            saveAndUpdate(null);
        }
    }

    profileIconBtn.addEventListener('click', openUserInfoModal);
    closeUserModalBtn.addEventListener('click', closeUserInfoModal);
    editUserInfoBtn.addEventListener('click', setUserInfoEditMode);
    userInfoForm.addEventListener('submit', handleUserInfoSubmit);

    userPhotoInput.addEventListener('change', () => {
        const file = userPhotoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                userPhotoPreview.src = e.target.result;
                userPhotoPreview.style.display = 'block';
                avatarContainer.innerHTML = '';
                avatarContainer.appendChild(userPhotoPreview);
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 8. FUNÇÕES GERAIS E DE NOTIFICAÇÃO ---
    function createCategoryFilters() {
        categoryFilterControls.innerHTML = '';
        const categories = Object.keys(categoryEmojis).filter(cat => cat !== 'Rotina' && cat !== 'Default');
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.filter = category;
            button.textContent = category;
            categoryFilterControls.appendChild(button);
        });
    }

    function setTheme(theme) {
        document.body.dataset.theme = theme;
        themeIcon.className = theme === 'dark' ? 'ph ph-fill ph-moon' : 'ph ph-fill ph-sun';
        localStorage.setItem('theme', theme);
    }
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.dataset.theme;
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    function setMute(muted) { isMuted = muted; muteIcon.className = muted ? 'ph ph-fill ph-speaker-slash' : 'ph ph-fill ph-speaker-high'; localStorage.setItem('isMuted', muted); }
    muteToggleBtn.addEventListener('click', () => setMute(!isMuted) );

    function showCustomConfirm(message) {
        confirmModalText.textContent = message;
        confirmModal.classList.remove('hidden');
        return new Promise((resolve) => { resolveConfirm = resolve; });
    }
    function hideCustomConfirm(value) {
        confirmModal.classList.add('hidden');
        if (resolveConfirm) resolveConfirm(value);
    }
    confirmBtn.addEventListener('click', () => hideCustomConfirm(true));
    cancelBtn.addEventListener('click', () => hideCustomConfirm(false));

    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log("Este navegador não suporta notificações.");
            return;
        }

        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showToast("Notificações ativadas!");
                    subscribeUserToPush(); // Se o usuário permitir, inscrevemos ele.
                } else {
                    showToast("Notificações não foram permitidas.", true);
                }
            });
        } else if (Notification.permission === 'granted') {
             subscribeUserToPush(); // Se já tem permissão, apenas inscrevemos.
        }
    }

    function checkAndUpdateCountdown() {
        const now = new Date();
        allTasks.forEach(task => {
            if (task.completed || !task.withNotification || !task.date || !task.time) return;

            const taskDateTime = new Date(`${task.date}T${task.time}`);
            const diffMillis = taskDateTime - now;

            const countdownElement = document.querySelector(`.task-card[data-id='${task.id}'] .notification-countdown span`);
            if(countdownElement) {
                countdownElement.parentElement.classList.remove('hidden');
                if(diffMillis > 0) {
                   const minutes = Math.ceil(diffMillis / (1000 * 60));
                   if (minutes > 1440) {
                        countdownElement.textContent = `em ${Math.floor(minutes / 1440)}d`;
                   } else if (minutes > 60) {
                        countdownElement.textContent = `em ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
                   } else {
                        countdownElement.textContent = `em ${minutes}m`;
                   }
                } else {
                    countdownElement.parentElement.classList.add('hidden');
                }
            }
        });
    }

    function updateReactivationCountdown() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const diffMillis = tomorrow - now;
        const hours = Math.floor(diffMillis / (1000 * 60 * 60));
        const minutes = Math.floor((diffMillis % (1000 * 60 * 60)) / (1000 * 60));

        document.querySelectorAll('.reactivation-countdown span').forEach(span => {
            span.textContent = `Reativa em ${hours}h ${minutes}m`;
        });
    }

    function updateTaskStatusClasses(taskCard, task) {
        if (task.completed || !task.date || !task.time) {
            return;
        }

        const now = new Date();
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        const diffMillis = now - taskDateTime;
        const fiveMinutesInMillis = 5 * 60 * 1000;

        taskCard.classList.remove('in-progress', 'overdue');

        if (diffMillis >= fiveMinutesInMillis) {
            taskCard.classList.add('overdue');
        } else if (diffMillis >= 0) {
            taskCard.classList.add('in-progress');
        }
    }

    function scheduleTaskChecks() {
        if (taskCheckInterval) clearInterval(taskCheckInterval);

        function runPeriodicChecks() {
            allTasks.forEach(task => {
                const taskCard = document.querySelector(`.task-card[data-id='${task.id}']`);
                if (taskCard) {
                    updateTaskStatusClasses(taskCard, task);
                }
            });

            checkAndUpdateCountdown();
            updateReactivationCountdown();
            updateStats();
        }

        runPeriodicChecks();
        taskCheckInterval = setInterval(runPeriodicChecks, 30000);
    }

    // --- LÓGICA DE CLIMA E LOCALIZAÇÃO (COM FALLBACK) ---
    async function fetchLocationAndWeather() {
        let geoData;
        try {
            const geoResponse = await fetch('https://ipapi.co/json/');
            if (!geoResponse.ok) throw new Error('ipapi.co falhou');
            geoData = await geoResponse.json();
            if (geoData.error) throw new Error(geoData.reason);
        } catch (error) {
            console.warn("Falha ao obter geolocalização do provedor principal (ipapi.co). Tentando fallback.", error);
            try {
                const fallbackResponse = await fetch('https://ip-api.com/json');
                if (!fallbackResponse.ok) throw new Error('ip-api.com falhou');
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.status !== 'success') throw new Error(fallbackData.message);

                geoData = {
                    city: fallbackData.city,
                    country_name: fallbackData.country,
                    latitude: fallbackData.lat,
                    longitude: fallbackData.lon,
                    timezone: fallbackData.timezone
                };
            } catch (fallbackError) {
                console.error("Erro ao carregar informações de localização de ambos os provedores:", fallbackError);
                locationEl.textContent = 'Não foi possível carregar.';
                temperatureEl.textContent = '--';
                weatherIconEl.className = 'ph ph-fill ph-question';
                startClock('America/Sao_Paulo');
                locationWeatherSection.style.display = 'grid';
                return;
            }
        }

        try {
            const { city, country_name, latitude, longitude, timezone } = geoData;
            locationEl.textContent = `${city}, ${country_name}`;
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
            const weatherResponse = await fetch(weatherUrl);
            if (!weatherResponse.ok) throw new Error('Falha ao obter dados do clima.');
            const weatherData = await weatherResponse.json();

            const temp = Math.round(weatherData.current_weather.temperature);
            const weatherCode = weatherData.current_weather.weathercode;
            temperatureEl.textContent = `${temp}°C`;
            weatherIconEl.className = getWeatherIcon(weatherCode);
            startClock(timezone);
            locationWeatherSection.style.display = 'grid';
        } catch (weatherError) {
            console.error("Erro ao carregar informações do clima:", weatherError);
            locationEl.textContent = 'Clima indisponível.';
            temperatureEl.textContent = '--';
            weatherIconEl.className = 'ph ph-fill ph-cloud-slash';
            startClock(geoData.timezone || 'America/Sao_Paulo');
            locationWeatherSection.style.display = 'grid';
        }
    }

    function startClock(timezone) {
        if (clockInterval) clearInterval(clockInterval);

        function updateClock() {
            const now = new Date();
            const timeOptions = {
                hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone,
            };
            const dateOptions = {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone,
            };

            currentTimeEl.textContent = now.toLocaleTimeString('pt-BR', timeOptions);
            currentDateEl.textContent = new Intl.DateTimeFormat('pt-BR', dateOptions).format(now).replace(/(^|\s)\S/g, l => l.toUpperCase());
        }

        updateClock();
        clockInterval = setInterval(updateClock, 1000);
    }

    // *** FUNÇÃO CORRIGIDA ***
    function getWeatherIcon(weatherCode) {
        const icons = {
            0: 'ph-fill ph-sun', 1: 'ph-fill ph-cloud-sun', 2: 'ph-fill ph-cloud', 3: 'ph-fill ph-clouds',
            45: 'ph-fill ph-fog', 48: 'ph-fill ph-fog', 51: 'ph-light ph-cloud-drizzle', 53: 'ph-fill ph-cloud-drizzle',
            55: 'ph-bold ph-cloud-drizzle', 56: 'ph-light ph-cloud-snow', 57: 'ph-fill ph-cloud-snow',
            61: 'ph-light ph-cloud-rain', 63: 'ph-fill ph-cloud-rain', 65: 'ph-bold ph-cloud-rain',
            66: 'ph-light ph-cloud-rain', 67: 'ph-bold ph-cloud-rain', 71: 'ph-light ph-cloud-snow',
            73: 'ph-fill ph-cloud-snow', 75: 'ph-bold ph-cloud-snow', 77: 'ph-fill ph-snowflake',
            80: 'ph-light ph-cloud-lightning', 81: 'ph-fill ph-cloud-lightning', 82: 'ph-bold ph-cloud-lightning',
            85: 'ph-fill ph-cloud-snow', 86: 'ph-bold ph-cloud-snow', 95: 'ph-fill ph-cloud-lightning',
            96: 'ph-fill ph-cloud-lightning', 99: 'ph-bold ph-cloud-lightning',
        };
        // Adiciona a classe base 'ph' que estava faltando
        return `ph ${icons[weatherCode] || 'ph-fill ph-question'}`;
    }

    window.addEventListener('click', (event) => {
      if (event.target === taskModal) closeModal();
      if (event.target === confirmModal) hideCustomConfirm(false);
      if (event.target === userInfoModal) closeUserInfoModal();
    });

    // --- INICIALIZAÇÃO ---
    async function initializeApp() {
        loader.classList.remove('hidden');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        const savedMuteState = localStorage.getItem('isMuted') === 'true';
        setMute(savedMuteState);

        const currentUserData = {
            name: localStorage.getItem('userName'),
            age: localStorage.getItem('userAge'),
            photo: localStorage.getItem('userPhoto'),
            totalTasks: localStorage.getItem('totalTasks')
        };
        updateUserInfoUI(currentUserData);
        requestNotificationPermission();
        createCategoryFilters();

        try {
            await Promise.all([
                loadTasks(),
                fetchLocationAndWeather()
            ]);
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            autoRefreshInterval = setInterval(loadTasks, 60000);
        } catch (error) {
            console.error("Erro durante a inicialização:", error);
            showToast("Ocorreu um erro ao iniciar o aplicativo.", true);
        } finally {
            loader.classList.add('hidden');
        }
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => console.log('Service Worker registrado com sucesso:', registration))
                .catch(error => console.log('Falha ao registrar o Service Worker:', error));
        }
    }

    function startSelfPing() {
      setInterval(async () => {
        try {
          await fetch('/api/ping');
          console.log('Ping sent to keep server alive.');
        } catch (error) {
          console.error('Ping failed:', error);
        }
      }, 5 * 60 * 1000);
    }

    // --- LÓGICA PWA E SINCRONIZAÇÃO DE ABAS ---
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (installPwaBtn) {
            installPwaBtn.classList.remove('hidden');
        }
    });

    if (installPwaBtn) {
        installPwaBtn.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                const { outcome } = await deferredInstallPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredInstallPrompt = null;
                installPwaBtn.classList.add('hidden');
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        if (installPwaBtn) {
            installPwaBtn.classList.add('hidden');
        }
        console.log('PWA was installed');
    });

    window.addEventListener('storage', (event) => {
        if (event.key === 'tasks_last_updated') {
            loadTasks();
        }
    });

    // --- INÍCIO DA EXECUÇÃO ---
    if (authToken) {
        showLoginState();
        initializeApp();
    } else {
        showLoggedOutState();
    }

    registerServiceWorker();
    startSelfPing();
});