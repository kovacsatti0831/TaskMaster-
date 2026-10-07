let tasks = [];
let history = [];
let categories = ["Work", "Study", "Personal", "Other"];

const STORAGE_KEY = 'tasks';
const HISTORY_KEY = 'history';
const CAT_KEY = 'categories';

let pendingAction = null;
let pendingIndex = null;
let currentEditIndex = null;

// ==================== BETÖLTÉS ÉS MENTÉS ====================
function loadData() {
    if (localStorage.getItem(STORAGE_KEY)) {
        tasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
    }
    if (localStorage.getItem(HISTORY_KEY)) {
        history = JSON.parse(localStorage.getItem(HISTORY_KEY));
    }
    if (localStorage.getItem(CAT_KEY)) {
        categories = JSON.parse(localStorage.getItem(CAT_KEY));
    }
    
    renderCategories();
    renderTasks();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(CAT_KEY, JSON.stringify(categories));
}

// ==================== FELADATOK MEGJELENÍTÉSE ====================
function renderTasks(filter = 'all', sortBy = 'created-desc') {
    const list = document.getElementById('task-list');
    if (!list) return;
    list.innerHTML = '';

    let filtered = tasks;
    if (filter !== 'all') {
        filtered = tasks.filter(t => t.category === filter);
    }

    filtered.sort((a, b) => {
        if (sortBy === 'created-desc') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'deadline-asc') return (a.deadline || '9999').localeCompare(b.deadline || '9999');
        if (sortBy === 'deadline-desc') return (b.deadline || '0000').localeCompare(a.deadline || '0000');
        if (sortBy === 'priority') {
            const order = { high: 1, medium: 2, low: 3 };
            return order[getTaskColorClass(a)] - order[getTaskColorClass(b)];
        }
        return 0;
    });

    filtered.forEach(task => {
        const realIndex = tasks.findIndex(t => t.id === task.id);
        const colorClass = getTaskColorClass(task);

        const li = document.createElement('li');
        li.className = `task-item ${colorClass}`;
        li.innerHTML = `
            <input type="checkbox" class="complete-checkbox" data-index="${realIndex}" ${task.completed ? 'checked' : ''}>
            <div class="task-info">
                <span class="task-title ${task.completed ? 'completed' : ''}">${task.title}</span>
                ${task.note ? `<span class="note">${task.note}</span>` : ''}
            </div>
            <small class="category">${task.category || 'Other'}</small>
            ${task.deadline ? `<span class="deadline">${task.deadline}</span>` : ''}
            <div class="task-actions">
                <button class="edit-btn" data-index="${realIndex}">Edit</button>
                <button class="delete-btn" data-index="${realIndex}">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
};

// ==================== ÚJ FELADAT HOZZÁADÁSA ====================
document.getElementById('task-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value.trim();
    if (!title) {
        alert("Task title cannot be empty!");
        return;
    }

    const newTask = {
        id: Date.now(),
        title: title,
        note: document.getElementById('task-note').value.trim(),
        deadline: document.getElementById('task-deadline').value || null,
        priority: document.getElementById('task-priority').value,
        category: document.getElementById('task-category').value || 'Other',
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveData();
    renderTasks();
    this.reset();
});

// ==================== KATEGÓRIÁK ====================
function renderCategories() {
    const catSelect = document.getElementById('task-category');
    const filterSelect = document.getElementById('category-filter');
    const editCatSelect = document.getElementById('edit-category');

    const html = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    if (catSelect) catSelect.innerHTML = '<option value="">Select category</option>' + html;
    if (filterSelect) filterSelect.innerHTML = '<option value="all">All Categories</option>' + html;
    if (editCatSelect) editCatSelect.innerHTML = html;
}

// ==================== SZÍNEZÉS ====================
function getTaskColorClass(task) {
    if (task.completed) return 'low';
    if (task.priority === 'high') return 'high';

    if (!task.deadline) {
        if (task.priority === 'medium') return 'medium';
        return 'low';
    }

    const deadlineDate = new Date(task.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays <= 3) return 'high';
    if (diffDays <= 7) return 'medium';
    if (task.priority === 'medium') return 'medium';
    return 'low';
}

// ==================== SZŰRÉS ÉS RENDEZÉS ====================
document.getElementById('category-filter').addEventListener('change', () => {
    const filter = document.getElementById('category-filter').value;
    const sortBy = document.getElementById('sort-option').value;
    renderTasks(filter, sortBy);
});

document.getElementById('sort-option').addEventListener('change', () => {
    const filter = document.getElementById('category-filter').value;
    const sortBy = document.getElementById('sort-option').value;
    renderTasks(filter, sortBy);
});

// ==================== CONFIRM MODAL ====================
function showConfirmModal(title, message, actionType, index) {
    pendingAction = actionType;
    pendingIndex = index;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-action-modal').style.display = 'flex';
}

document.getElementById('confirm-yes').addEventListener('click', () => {
    if (pendingAction === 'complete' && pendingIndex !== null) {
        const task = tasks[pendingIndex];
        task.completed = true;
        history.unshift({ ...task, action: "completed", completedAt: new Date().toISOString() });
        tasks.splice(pendingIndex, 1);
    } 
    else if (pendingAction === 'delete' && pendingIndex !== null) {
        const task = tasks[pendingIndex];
        history.unshift({ ...task, action: "deleted", deletedAt: new Date().toISOString() });
        tasks.splice(pendingIndex, 1);
    }

    saveData();
    renderTasks();
    document.getElementById('confirm-action-modal').style.display = 'none';
    pendingAction = null;
    pendingIndex = null;
});

document.getElementById('confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-action-modal').style.display = 'none';
    pendingAction = null;
    pendingIndex = null;
});

// ==================== KATTINTÁSOK (Edit, Delete, Complete gombok megnyomása) ====================
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('complete-checkbox')) {
        const index = parseInt(e.target.dataset.index);
        if (tasks[index] && !tasks[index].completed) {
            e.target.checked = false;
            showConfirmModal("Complete Task", "Mark this task as completed?", 'complete', index);
        }
    }

    if (e.target.classList.contains('delete-btn')) {
        const index = parseInt(e.target.dataset.index);
        showConfirmModal("Delete Task", "Are you sure you want to delete this task?", 'delete', index);
    }

    if (e.target.classList.contains('edit-btn')) {
        currentEditIndex = parseInt(e.target.dataset.index);
        const task = tasks[currentEditIndex];

        document.getElementById('edit-title').value = task.title;
        document.getElementById('edit-note').value = task.note || '';
        document.getElementById('edit-deadline').value = task.deadline || '';
        document.getElementById('edit-priority').value = task.priority;
        document.getElementById('edit-category').value = task.category || '';

        document.getElementById('edit-modal').style.display = 'flex';
    }
});

// ==================== EDIT MODAL ====================
document.getElementById('save-edit').addEventListener('click', () => {
    if (currentEditIndex === null) return;

    const task = tasks[currentEditIndex];
    task.title = document.getElementById('edit-title').value.trim();
    task.note = document.getElementById('edit-note').value.trim();
    task.deadline = document.getElementById('edit-deadline').value || null;
    task.priority = document.getElementById('edit-priority').value;
    task.category = document.getElementById('edit-category').value;

    saveData();
    renderTasks();
    document.getElementById('edit-modal').style.display = 'none';
    currentEditIndex = null;
});

document.getElementById('cancel-edit').addEventListener('click', () => {
    document.getElementById('edit-modal').style.display = 'none';
    currentEditIndex = null;
});

// ==================== HISTORY MODAL ====================
document.getElementById('show-history').addEventListener('click', () => {
    let html = '<h3>Completed Tasks</h3>';
    const completed = history.filter(h => h.action === "completed");
    const deleted = history.filter(h => h.action === "deleted");

    if (completed.length > 0) {
        completed.forEach((item) => {
            const globalIndex = history.indexOf(item);
            html += `
                <div class="history-item completed">
                    <span class="task-title">${item.title}</span>
                    <small>${item.category || 'Other'} • ${item.deadline || ''}</small>
                    ${item.note ? `<p class="note">${item.note}</p>` : ''}
                    <button class="undo-btn" data-index="${globalIndex}">Restore</button>
                </div>
            `;
        });
    } else {
        html += '<p>No completed tasks yet.</p>';
    }

    html += '<h3>Deleted Tasks</h3>';

    if (deleted.length > 0) {
        deleted.forEach(item => {
            const globalIndex = history.indexOf(item);
            html += `
                <div class="history-item deleted">
                    <span class="task-title">${item.title}</span>
                    <small>${item.category || 'Other'} • ${item.deadline || ''}</small>
                    <button class="undo-btn" data-index="${globalIndex}">Restore</button>
                </div>
            `;
        });
    } else {
        html += '<p>No deleted tasks yet.</p>';
    }

    document.getElementById('history-content').innerHTML = html;
    document.getElementById('history-modal').style.display = 'flex';

    // Restore gombok
    document.querySelectorAll('.undo-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const taskToRestore = history[index];
            if (taskToRestore) {
                tasks.unshift({
                    id: Date.now(),
                    title: taskToRestore.title,
                    note: taskToRestore.note || '',
                    deadline: taskToRestore.deadline,
                    priority: taskToRestore.priority,
                    category: taskToRestore.category,
                    completed: false,
                    createdAt: new Date().toISOString()
                });
                history.splice(index, 1);
                saveData();
                renderTasks();
                document.getElementById('show-history').click();
            }
        });
    });
});

document.getElementById('close-history').addEventListener('click', () => {
    document.getElementById('history-modal').style.display = 'none';
});

// ==================== NEW CATEGORY, RESET ALL DATA, CONFIRMATION MESSAGE ====================
document.getElementById('add-category-btn').addEventListener('click', () => {
    document.getElementById('new-category-name').value = '';
    document.getElementById('category-modal').style.display = 'flex';
});

document.getElementById('save-category').addEventListener('click', () => {
    const newName = document.getElementById('new-category-name').value.trim();
    if (newName === '') {
        showMessage("Error", "Category name cannot be empty!");
        return;
    }
    if (categories.includes(newName)) {
        showMessage("Error", "This category already exists!");
        return;
    }
    categories.push(newName);
    saveData();
    renderCategories();
    document.getElementById('category-modal').style.display = 'none';
});

document.getElementById('cancel-category').addEventListener('click', () => {
    document.getElementById('category-modal').style.display = 'none';
});

document.getElementById('reset-data').addEventListener('click', () => {
    document.getElementById('reset-modal').style.display = 'flex';
});

document.getElementById('confirm-reset').addEventListener('click', () => {
    localStorage.clear();
    tasks = [];
    history = [];
    categories = ["Work", "Study", "Personal", "Other"];
    document.getElementById('reset-modal').style.display = 'none';
    showMessage("Success", "All data has been successfully reset.");
    setTimeout(() => location.reload(), 2500);
});

document.getElementById('cancel-reset').addEventListener('click', () => {
    document.getElementById('reset-modal').style.display = 'none';
});

function showMessage(title, text) {
    document.getElementById('message-title').textContent = title;
    document.getElementById('message-text').textContent = text;
    document.getElementById('message-modal').style.display = 'flex';
}

document.getElementById('close-message').addEventListener('click', () => {
    document.getElementById('message-modal').style.display = 'none';
});

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
});

// ==================== RANDOM TIP MODAL ====================
const tips = [ 
  "Backup important files", "Clean up your desktop", "Organize digital photos", "Delete unused apps", "Review browser bookmarks", "Update software", "Clear email inbox",
  "Archive old messages", "Review cloud storage", "Scan for duplicate files", "Organize downloads folder", "Empty trash folders", "Update device settings", "Check security alerts",
  "Call a family member", "Reply to pending messages", "Plan a meetup with friends", "Send thank-you notes", "Update contact information", "Check important notifications", "Organize contacts",
  "Reach out to an old friend", "Schedule a video call", "Send birthday wishes", "Update emergency contacts", "Review social media privacy settings", "Clean up friend lists", "Respond to invitations",
  "Go for a walk", "Stretch for 15 minutes", "Drink more water", "Prepare healthy snacks", "Track daily steps", "Plan workout sessions", "Review sleep habits",
  "Meditate for 10 minutes", "Take a screen break", "Schedule a fitness activity", "Update health goals", "Practice good posture", "Prepare a healthy meal", "Track your progress",
  "Read industry news", "Learn a new skill", "Watch an educational video", "Take course notes", "Review study materials", "Practice a foreign language", "Research a topic of interest",
  "Update learning resources", "Create a study schedule", "Review personal notes", "Finish a tutorial", "Set learning milestones", "Take a practice test", "Review key concepts",
  "Review monthly goals", "Update your journal", "Plan the weekend", "Reflect on recent achievements", "Write down new ideas", "Set priorities for tomorrow", "Review long-term plans",
  "Create a vision board", "Track personal progress", "Declutter your task list", "Plan a productive morning", "Review daily habits", "Set a new challenge", "Update your bucket list",
  "Water the plants", "Check household supplies", "Replace light bulbs if needed", "Test smoke detectors", "Organize storage spaces", "Fix minor household issues", "Clean windows",
  "Sort recycling", "Inspect home maintenance tasks", "Organize cables", "Check batteries in devices", "Refresh home decor", "Tidy up common areas", "Clean door handles",
  "Review travel documents", "Research future destinations", "Check flight prices", "Create a packing checklist", "Renew travel memberships", "Organize travel photos", "Plan a weekend getaway",
  "Review travel budget", "Save interesting locations", "Update travel apps", "Check hotel reservations", "Prepare travel essentials", "Review travel insurance", "Create an itinerary",
  "Review subscriptions again", "Check upcoming renewals", "Compare utility providers", "Review loyalty programs", "Update payment methods", "Track recurring expenses", "Review savings goals",
  "Check investment performance", "Update financial records", "Organize receipts", "Monitor monthly budget", "Review spending categories", "Set a savings target", "Review bank notifications",
  "Clean your keyboard", "Wipe down your monitor", "Organize your workspace", "Refill office supplies", "Review pending tasks", "Create a focus playlist", "Update productivity tools",
  "Check calendar events", "Prepare tomorrow's agenda", "Review meeting notes", "Organize digital documents", "Archive completed tasks", "Set work priorities", "Update project status",
  "Review wardrobe items", "Donate unused clothes", "Organize shoes", "Sort accessories", "Create outfit combinations", "Repair damaged clothing", "Store seasonal items",
  "Clean your closet", "Check clothing sizes", "Make a shopping list", "Fold laundry", "Replace worn-out items", "Organize drawers", "Refresh your wardrobe",
  "Review passwords", "Enable two-factor authentication", "Check account security", "Update recovery information", "Review connected devices", "Remove unused accounts", "Check login activity",
  "Update privacy settings", "Review app permissions", "Secure important documents", "Backup passwords", "Check security software", "Update browser extensions", "Review data sharing settings",
  "Listen to a podcast", "Watch a documentary", "Read an article", "Explore a new hobby", "Practice a creative skill", "Write a short journal entry", "Sketch an idea",
  "Learn a keyboard shortcut", "Try a new recipe", "Read a chapter of a book", "Practice photography", "Explore a new music genre", "Write down inspirations", "Review favorite resources",
  "Talk to a stranger for 5 minutes today", "Try a food you've never dared to eat before", "Go to the cinema or a café alone", "Message someone you haven't spoken to in a long time", "Say no to something you would usually say yes to", "Ask for help from someone you normally wouldn't",  "Wear something you usually think is too bold",
  "Go to an event where you don't know anyone","Don't check your phone for 10 minutes when you're bored", "Give a compliment to a stranger", "Ask a question you've always wanted to ask but never dared",
  "Apply for something you're not sure you qualify for","Try a new sport or form of exercise","Post something publicly that you usually keep private",
  "Visit a place in your city you've never been to","Sell or give away something you're attached to", "Speak in public for 1 minute on any topic",  "Ask someone for honest feedback on your work or appearance",
  "Start a new hobby where you're a complete beginner","Share your opinion in a conversation where you usually stay quiet", "Call someone instead of sending an email or message","Go alone to a group event",
  "Start a conversation with someone you find interesting", "Tell a personal story you don't usually share", "Ask someone to teach you something new",
  "Invite someone to do something together", "Give honest but kind feedback to someone", "Attend a meeting where you're not the most prepared", "Talk to a stranger on the bus or train", "Compliment someone on their appearance or work","Spend 30 minutes doing something uncomfortable but useful",
  "Finish a task you've been putting off","Write down 3 things you're afraid of and face one of them today", "Go for a 1-hour walk alone without your phone", "Cook a recipe you've never tried before", "Read a book about a topic that never interested you","Go one full day without complaining",
  "Ask someone to evaluate your work or project","Go somewhere that makes you feel a little uncomfortable", "Start a new habit that feels slightly scary","Introduce yourself to someone new at work or school", "Try a different route to work or school today","Order something new at a restaurant instead of your usual",
  "Speak up in a meeting even if your idea isn't perfect","Ask for a discount or a better deal politely", "Take a different seat than usual in class or on the bus","Send a voice message instead of a text",
  "Join a short online class or workshop you've been curious about","Dance or sing along to a song when no one is watching",
  "Write a short thank-you note to someone who helped you","Try meditating or sitting in silence for 10 minutes","Change your morning routine completely for one day",
  "Ask a colleague or classmate for advice on something","Wear a color you almost never wear", "Start a conversation with the barista or cashier","Try a new app or tool you've been avoiding",
  "Go to a museum or gallery by yourself","Record a short video of yourself talking about any topic","Ask someone out for coffee (even just as friends)","Try drawing or doodling for 15 minutes without judgment",
  "Leave a positive review for a local business","Practice saying “I disagree” politely in a conversation","Try a short workout video you've never done before",
  "Write down one big goal and take one small step toward it","Sit in a different spot in a familiar place", "Ask a stranger for directions even if you know the way","Try listening to a podcast genre you never listen to","Share an unpopular opinion kindly","Take a photo of something ordinary and post it","Offer to help someone with a small task",
  "Try a new hairstyle or small style change","Read a news article from a source you usually avoid","Practice making small talk for 5 minutes","Go to a library and pick a random book to read a chapter from","Try writing with your non-dominant hand for a few minutes",
  "Ask for feedback on a creative idea you have","Take the stairs instead of the elevator all day","Smile and make eye contact with 5 people today",
  "Try a new playlist or music genre","Clean or organize one small area you’ve been ignoring","Send a message to an old friend just to say hi","Practice introducing yourself confidently out loud", "Try a short language lesson in a language you don’t know","Eat lunch somewhere different than usual",
  "Write a short letter or email to your future self","Try standing instead of sitting while working for 20 minutes","Ask someone what they’re working on and listen fully","Go for a walk in a neighborhood you don’t know well",
  "Try a 5-minute cold shower or cold water rinse","Share one small win with someone today","Practice saying “thank you” more intentionally", "Try a new productivity method for one day",
  "Leave your phone in another room for 30 minutes", "Ask a question in a group chat or forum", "Try sketching the view from your window",
  "Offer a genuine compliment to a family member", "Try cooking without a recipe for one meal", "Watch a short documentary on a topic you know nothing about", "Practice deep breathing for 3 minutes when you feel stressed", "Write a list of 10 things you’re grateful for right now"
];

document.getElementById('random-tip-btn').addEventListener('click', () => {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    document.getElementById('tip-text').textContent = randomTip;
    document.getElementById('tip-modal').style.display = 'flex';
});

document.getElementById('new-tip-btn').addEventListener('click', () => {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    document.getElementById('tip-text').textContent = randomTip;
});

document.getElementById('close-tip').addEventListener('click', () => {
    document.getElementById('tip-modal').style.display = 'none';
});

// ==================== STATISTICS ====================
document.getElementById('show-stats').addEventListener('click', () => {
    const total = tasks.length + history.length;
    const active = tasks.length;
    const completed = history.filter(h => h.action === "completed").length;
    const deleted = history.filter(h => h.action === "deleted").length;
    const overdue = tasks.filter(t => {
        if (!t.deadline || t.completed) return false;
        const diffDays = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        return diffDays < 0;
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let html = `
        <p><strong>Total Tasks:</strong> ${total}</p>
        <p><strong>Active Tasks:</strong> ${active}</p>
        <p><strong>Completed Tasks:</strong> ${completed}</p>
        <p><strong>Deleted Tasks:</strong> ${deleted}</p>
        <p><strong>Overdue Tasks:</strong> ${overdue}</p>
        <p><strong>Completion Rate:</strong> ${completionRate}%</p>
    `;

    document.getElementById('stats-content').innerHTML = html;
    document.getElementById('stats-modal').style.display = 'flex';
});

document.getElementById('close-stats').addEventListener('click', () => {
    document.getElementById('stats-modal').style.display = 'none';
});

// ==================== BOTTOM NAVIGATION ====================
document.getElementById('nav-history').addEventListener('click', function() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('show-history').click();
});

document.getElementById('nav-stats').addEventListener('click', function() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('show-stats').click();
});

document.getElementById('nav-reset').addEventListener('click', function() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('reset-data').click();
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderTasks();
    document.getElementById('nav-history').classList.add('active');
});
