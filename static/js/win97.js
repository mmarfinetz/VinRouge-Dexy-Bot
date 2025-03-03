// Windows 97 UI JavaScript for Dexy
let activeWindow = null;
let windows = {};
let zIndex = 100;
let soundEnabled = true;
let isDragging = false;
let dragTarget = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isResizing = false;
let resizeTarget = null;
let originalWidth = 0;
let originalHeight = 0;
let startX = 0;
let startY = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize windows
    document.querySelectorAll('.window').forEach(window => {
        const id = window.id;
        windows[id] = {
            isOpen: false,
            isMaximized: false,
            originalWidth: window.style.width,
            originalHeight: window.style.height,
            originalLeft: window.style.left,
            originalTop: window.style.top
        };
    });

    // Set up drag events for windows
    document.querySelectorAll('.title-bar').forEach(titleBar => {
        titleBar.addEventListener('mousedown', startDrag);
        titleBar.addEventListener('touchstart', startDrag, { passive: false });
    });

    // Set global mouse events for dragging
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('touchmove', doDrag, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    // Set up taskbar time
    updateClock();
    setInterval(updateClock, 60000);

    // Set up Start button
    document.getElementById('start-button').addEventListener('click', toggleStartMenu);
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#start-menu') && !e.target.closest('#start-button')) {
            hideStartMenu();
        }
    });

    // Load settings
    loadSettings();

    // Initialize desktop
    playSound('startup-sound');

    // Auto-open chat window if configured
    if (localStorage.getItem('dexy_autostartChat') === 'true') {
        setTimeout(() => {
            openWindow('chat-window');
        }, 1000);
    }
});

// Window Management Functions
function openWindow(id) {
    hideStartMenu();
    playSound('click-sound');

    const windowElement = document.getElementById(id);
    if (!windowElement) return;

    // If the window is already open, just bring it to front
    if (windows[id].isOpen) {
        bringToFront(windowElement);
        return;
    }

    // Show the window
    windowElement.style.display = 'flex';
    windows[id].isOpen = true;

    // Add to taskbar
    addToTaskbar(id);

    // Bring to front
    bringToFront(windowElement);
}

function closeWindow(id) {
    playSound('click-sound');

    const windowElement = document.getElementById(id);
    if (!windowElement) return;

    // Hide the window
    windowElement.style.display = 'none';
    windows[id].isOpen = false;

    // If maximized, restore original size for next open
    if (windows[id].isMaximized) {
        restoreWindow(id);
    }

    // Remove from taskbar
    removeFromTaskbar(id);
}

function minimizeWindow(id) {
    playSound('click-sound');

    const windowElement = document.getElementById(id);
    if (!windowElement) return;

    // Hide the window but keep it in taskbar
    windowElement.style.display = 'none';
}

function toggleMaximize(id) {
    playSound('click-sound');

    const windowElement = document.getElementById(id);
    if (!windowElement) return;

    if (windows[id].isMaximized) {
        restoreWindow(id);
    } else {
        maximizeWindow(id);
    }
}

function maximizeWindow(id) {
    const windowElement = document.getElementById(id);
    if (!windowElement) return;

    // Save current dimensions and position
    if (!windows[id].isMaximized) {
        windows[id].originalWidth = windowElement.style.width;
        windows[id].originalHeight = windowElement.style.height;
        windows[id].originalLeft = windowElement.style.left;
        windows[id].originalTop = windowElement.style.top;
    }

    // Maximize (accounting for taskbar)
    windowElement.style.width = '100%';
    windowElement.style.height = 'calc(100% - 32px)';
    windowElement.style.top = '0';
    windowElement.style.left = '0';

    windows[id].isMaximized = true;
}

function restoreWindow(id) {
    const windowElement = document.getElementById(id);
    if (!windowElement) return;

    // Restore original dimensions and position
    windowElement.style.width = windows[id].originalWidth;
    windowElement.style.height = windows[id].originalHeight;
    windowElement.style.left = windows[id].originalLeft;
    windowElement.style.top = windows[id].originalTop;

    windows[id].isMaximized = false;
}

function bringToFront(element) {
    zIndex++;
    element.style.zIndex = zIndex;
    activeWindow = element.id;

    // Highlight active taskbar entry
    updateTaskbarHighlight();
}

// Dragging Functions
function startDrag(e) {
    e.preventDefault();

    // Get the window element (parent of title bar)
    const titleBar = e.currentTarget;
    const windowElement = titleBar.closest('.window');

    if (!windowElement || windows[windowElement.id].isMaximized) return;

    isDragging = true;
    dragTarget = windowElement;

    // Get mouse/touch position
    let clientX, clientY;
    if (e.type === 'mousedown') {
        clientX = e.clientX;
        clientY = e.clientY;
    } else if (e.type === 'touchstart') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    // Calculate offset from window top-left
    const rect = windowElement.getBoundingClientRect();
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;

    // Bring window to front
    bringToFront(windowElement);
}

function doDrag(e) {
    if (!isDragging || !dragTarget) return;

    e.preventDefault();

    // Get mouse/touch position
    let clientX, clientY;
    if (e.type === 'mousemove') {
        clientX = e.clientX;
        clientY = e.clientY;
    } else if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    // Calculate new position
    let newLeft = clientX - dragOffsetX;
    let newTop = clientY - dragOffsetY;

    // Keep window within viewport
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 100));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - 100));

    // Apply new position
    dragTarget.style.left = newLeft + 'px';
    dragTarget.style.top = newTop + 'px';
}

function stopDrag() {
    isDragging = false;
    dragTarget = null;
}

// Taskbar Functions
function addToTaskbar(id) {
    const taskbarEntries = document.getElementById('taskbar-entries');

    // Check if entry already exists
    if (document.getElementById('taskbar-' + id)) return;

    // Get window title
    const windowTitle = document.querySelector('#' + id + ' .title-bar-text').textContent.trim();

    // Get appropriate icon
    let iconSrc = 'static/img/w95_35.png'; // Default icon
    if (id === 'chat-window') iconSrc = 'static/img/w95_27.png';
    if (id === 'analysis-window') iconSrc = 'static/img/w95_52.png';
    if (id === 'settings-window') iconSrc = 'static/img/w2k_control_panel.png';
    if (id === 'help-window') iconSrc = 'static/img/w95_46.png';

    // Create taskbar entry
    const entry = document.createElement('div');
    entry.id = 'taskbar-' + id;
    entry.className = 'taskbar-entry';
    if (activeWindow === id) entry.className += ' active';
    entry.innerHTML = `<img src="${iconSrc}" alt="" class="taskbar-icon"> <span>${windowTitle}</span>`;

    // Add click event
    entry.addEventListener('click', function() {
        const windowElement = document.getElementById(id);
        if (windowElement.style.display === 'none') {
            windowElement.style.display = 'flex';
            bringToFront(windowElement);
        } else if (activeWindow === id) {
            minimizeWindow(id);
        } else {
            bringToFront(windowElement);
        }
    });

    // Add to taskbar
    taskbarEntries.appendChild(entry);
}

function removeFromTaskbar(id) {
    const entry = document.getElementById('taskbar-' + id);
    if (entry) {
        entry.remove();
    }
}

function updateTaskbarHighlight() {
    // Remove active class from all taskbar entries
    document.querySelectorAll('.taskbar-entry').forEach(entry => {
        entry.classList.remove('active');
    });

    // Add active class to current window's taskbar entry
    if (activeWindow) {
        const activeEntry = document.getElementById('taskbar-' + activeWindow);
        if (activeEntry) {
            activeEntry.classList.add('active');
        }
    }
}

// Start Menu Functions
function toggleStartMenu() {
    const startMenu = document.getElementById('start-menu');
    if (startMenu.style.display === 'block') {
        hideStartMenu();
    } else {
        showStartMenu();
    }
}

function showStartMenu() {
    playSound('click-sound');
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('start-button').classList.add('active');
}

function hideStartMenu() {
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('start-button').classList.remove('active');
}

// Help Tab Functions
function showHelpTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.help-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabId).classList.add('active');

    // Update sidebar selection
    document.querySelectorAll('.help-sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    // Find and activate the correct sidebar item
    document.querySelectorAll('.help-sidebar-item').forEach(item => {
        if (item.getAttribute('onclick').includes(tabId)) {
            item.classList.add('active');
        }
    });
}

// Analysis Tab Functions
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabId).classList.add('active');

    // Update tab button styling
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Find and activate the correct tab button
    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.getAttribute('onclick').includes(tabId)) {
            button.classList.add('active');
        }
    });
}

// Settings Functions
function loadSettings() {
    // Load settings from localStorage
    const apiKey = localStorage.getItem('dexy_apiKey') || '';
    const apiProvider = localStorage.getItem('dexy_apiProvider') || 'defillama';
    const enableSounds = localStorage.getItem('dexy_enableSounds') !== 'false'; // Default to true
    const autostartChat = localStorage.getItem('dexy_autostartChat') === 'true'; // Default to false

    // Apply settings
    document.getElementById('api-key').value = apiKey;
    document.getElementById('api-provider').value = apiProvider;
    document.getElementById('enable-sounds').checked = enableSounds;
    document.getElementById('autostart-chat').checked = autostartChat;

    // Apply sound setting
    soundEnabled = enableSounds;
}

function saveSettings() {
    // Get values
    const apiKey = document.getElementById('api-key').value;
    const apiProvider = document.getElementById('api-provider').value;
    const enableSounds = document.getElementById('enable-sounds').checked;
    const autostartChat = document.getElementById('autostart-chat').checked;

    // Save to localStorage
    localStorage.setItem('dexy_apiKey', apiKey);
    localStorage.setItem('dexy_apiProvider', apiProvider);
    localStorage.setItem('dexy_enableSounds', enableSounds);
    localStorage.setItem('dexy_autostartChat', autostartChat);

    // Apply sound setting
    soundEnabled = enableSounds;

    // Show confirmation
    showErrorDialog('Settings saved successfully!', 'Settings');

    // Close window
    closeWindow('settings-window');
}

function connectWallet() {
    // Show loading state
    document.getElementById('wallet-address').innerHTML = 'Connecting...';

    // Mock connection - in real app this would connect to CDP
    setTimeout(() => {
        const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
        document.getElementById('wallet-address').innerHTML = mockAddress.substr(0, 6) + '...' + mockAddress.substr(-4);
        playSound('notify-sound');
    }, 1500);
}

// Chat Functions
function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';

    // Add message to chat
    addUserMessage(message);

    // Show typing indicator
    showTypingIndicator();

    // Call API
    fetch('/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
        // Remove typing indicator
        removeTypingIndicator();

        // Add bot response
        addBotMessage(data.response || "I'm not sure how to respond to that.");
    })
    .catch(error => {
        // Remove typing indicator
        removeTypingIndicator();

        // Add error message
        addBotMessage("Sorry, I'm having trouble connecting to my brain right now. Please try again later.");
        console.error('Error:', error);
    });
}

function addUserMessage(text) {
    const messagesContainer = document.getElementById('chat-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user';
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">
                <p>${text}</p>
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    playSound('click-sound');
}

function addBotMessage(text) {
    const messagesContainer = document.getElementById('chat-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message system';
    messageDiv.innerHTML = `
        <div class="message-content">
            <img src="static/img/w95_27.png" class="bot-avatar">
            <div class="message-text">
                <p>${text}</p>
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    playSound('notify-sound');
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');

    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'chat-message system typing-indicator';
    indicatorDiv.id = 'typing-indicator';
    indicatorDiv.innerHTML = `
        <div class="message-content">
            <img src="static/img/w95_27.png" class="bot-avatar">
            <div class="message-text">
                <p>Thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></p>
            </div>
        </div>
    `;

    messagesContainer.appendChild(indicatorDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Analysis Functions
function runQuickAnalysis() {
    const token = document.getElementById('quick-token').value;
    const resultDiv = document.getElementById('quick-analysis-results');
    const loadingDiv = document.getElementById('quick-analysis-loading');

    // Show loading
    resultDiv.querySelector('.placeholder-message').style.display = 'none';
    loadingDiv.style.display = 'flex';

    // Call API
    fetch('/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token_id: token })
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading
        loadingDiv.style.display = 'none';

        if (data.error) {
            showErrorDialog(data.error);
            resultDiv.querySelector('.placeholder-message').style.display = 'block';
            return;
        }

        // Display results
        displayQuickAnalysisResults(data.result, token);
        playSound('notify-sound');
    })
    .catch(error => {
        // Hide loading
        loadingDiv.style.display = 'none';
        resultDiv.querySelector('.placeholder-message').style.display = 'block';

        showErrorDialog("Failed to fetch analysis data. Please try again later.");
        console.error('Error:', error);
    });
}

function displayQuickAnalysisResults(data, token) {
    const resultDiv = document.getElementById('quick-analysis-results');

    // Format token name
    const tokenName = token.charAt(0).toUpperCase() + token.slice(1);

    // Create mock data if real data is not available
    if (!data) {
        data = {
            price: Math.random() * 10000,
            price_change_24h: (Math.random() * 20) - 10,
            rsi: Math.random() * 100,
            zscore: (Math.random() * 6) - 3,
            bollinger_position: Math.random()
        };
    }

    // Calculate rating
    let rating = "Neutral";
    let ratingClass = "neutral";

    if (data.zscore > 2 || data.rsi > 70) {
        rating = "Potentially Overbought";
        ratingClass = "negative";
    } else if (data.zscore < -2 || data.rsi < 30) {
        rating = "Potentially Oversold";
        ratingClass = "positive";
    }

    // Create HTML for results
    const resultsHTML = `
        <div class="analysis-result-card">
            <h3>${tokenName} Quick Analysis</h3>
            <div class="metric-row">
                <div class="metric-label">Current Price:</div>
                <div class="metric-value">$${data.price?.toFixed(2) || 'N/A'}</div>
            </div>
            <div class="metric-row">
                <div class="metric-label">24h Change:</div>
                <div class="metric-value ${data.price_change_24h > 0 ? 'positive' : 'negative'}">${data.price_change_24h?.toFixed(2) || 0}%</div>
            </div>
            <div class="metric-row">
                <div class="metric-label">RSI (14):</div>
                <div class="metric-value">${data.rsi?.toFixed(2) || 'N/A'}</div>
            </div>
            <div class="metric-row">
                <div class="metric-label">Z-Score:</div>
                <div class="metric-value">${data.zscore?.toFixed(2) || 'N/A'}</div>
            </div>
            <div class="metric-row">
                <div class="metric-label">Mean Reversion Signal:</div>
                <div class="metric-value ${ratingClass}">${rating}</div>
            </div>
        </div>
        <div class="chart-container">
            <canvas id="priceChart"></canvas>
        </div>
    `;

    // Update the DOM
    resultDiv.innerHTML = resultsHTML;

    // Generate chart
    generateMockPriceChart(token);
}

function runTechnicalAnalysis() {
    const token = document.getElementById('technical-token').value;
    const period = document.getElementById('time-period').value;
    const showZscore = document.getElementById('show-zscore').checked;
    const showRsi = document.getElementById('show-rsi').checked;
    const showBb = document.getElementById('show-bb').checked;

    const resultDiv = document.getElementById('technical-analysis-results');
    const loadingDiv = document.getElementById('technical-analysis-loading');

    // Show loading
    resultDiv.querySelector('.placeholder-message').style.display = 'none';
    loadingDiv.style.display = 'flex';

    // Call API
    fetch('/technical', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            token_id: token,
            period: period,
            indicators: {
                zscore: showZscore,
                rsi: showRsi,
                bollinger: showBb
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading
        loadingDiv.style.display = 'none';

        if (data.error) {
            showErrorDialog(data.error);
            resultDiv.querySelector('.placeholder-message').style.display = 'block';
            return;
        }

        // Display technical analysis results
        displayTechnicalResults(data, token, period);
        playSound('notify-sound');
    })
    .catch(error => {
        // Hide loading
        loadingDiv.style.display = 'none';
        resultDiv.querySelector('.placeholder-message').style.display = 'block';

        showErrorDialog("Failed to fetch technical data. Please try again later.");
        console.error('Error:', error);
    });
}

function displayTechnicalResults(data, token, period) {
    const resultDiv = document.getElementById('technical-analysis-results');

    // Generate mock chart for demo purposes
    const html = `
        <div class="tech-chart-container">
            <canvas id="technicalChart"></canvas>
        </div>
        <div class="indicator-summary">
            <h3>Technical Indicators Summary</h3>
            <div class="indicator-table">
                <div class="indicator-row">
                    <div class="indicator-name">RSI (14)</div>
                    <div class="indicator-value">${(Math.random() * 30 + 35).toFixed(2)}</div>
                    <div class="indicator-interpretation">Neutral</div>
                </div>
                <div class="indicator-row">
                    <div class="indicator-name">Z-Score</div>
                    <div class="indicator-value">${(Math.random() * 4 - 2).toFixed(2)}</div>
                    <div class="indicator-interpretation">Within normal range</div>
                </div>
                <div class="indicator-row">
                    <div class="indicator-name">Bollinger Position</div>
                    <div class="indicator-value">${(Math.random()).toFixed(2)}</div>
                    <div class="indicator-interpretation">Middle of band</div>
                </div>
            </div>
        </div>
    `;

    resultDiv.innerHTML = html;

    // Generate mock chart
    generateMockTechnicalChart(token, period);
}

function runWhaleAnalysis() {
    const token = document.getElementById('whale-token').value;
    const resultDiv = document.getElementById('whale-analysis-results');
    const loadingDiv = document.getElementById('whale-analysis-loading');

    // Show loading
    resultDiv.querySelector('.placeholder-message').style.display = 'none';
    loadingDiv.style.display = 'flex';

    // Call API
    fetch('/whale', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token_id: token })
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading
        loadingDiv.style.display = 'none';

        if (data.error) {
            showErrorDialog(data.error);
            resultDiv.querySelector('.placeholder-message').style.display = 'block';
            return;
        }

        // Display whale analysis results
        displayWhaleResults(data, token);
        playSound('notify-sound');
    })
    .catch(error => {
        // Hide loading
        loadingDiv.style.display = 'none';
        resultDiv.querySelector('.placeholder-message').style.display = 'block';

        showErrorDialog("Failed to fetch whale activity data. Please try again later.");
        console.error('Error:', error);
    });
}

function displayWhaleResults(data, token) {
    const resultDiv = document.getElementById('whale-analysis-results');

    // Format token name
    const tokenName = token.charAt(0).toUpperCase() + token.slice(1);

    // Create mock data if not available
    if (!data || !data.risk_score) {
        data = {
            risk_score: Math.floor(Math.random() * 100),
            level: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
            signals: [
                { name: "Exchange Inflow", value: Math.random() > 0.5 ? "High" : "Low", impact: Math.random() > 0.5 ? "Negative" : "Positive" },
                { name: "Whale Concentration", value: Math.random() > 0.5 ? "Increasing" : "Stable", impact: Math.random() > 0.5 ? "Negative" : "Neutral" },
                { name: "Distribution Pattern", value: Math.random() > 0.5 ? "Accumulation" : "Distribution", impact: Math.random() > 0.5 ? "Positive" : "Negative" }
            ]
        };
    }

    // Determine risk color
    let riskColor = "#FFD700"; // Medium (yellow)
    if (data.risk_score < 30) riskColor = "#00CD00"; // Low (green)
    if (data.risk_score > 70) riskColor = "#FF6347"; // High (red)

    // Create HTML
    const html = `
        <div class="whale-summary">
            <h3>${tokenName} Whale Activity</h3>
            <div class="risk-gauge">
                <canvas id="riskGauge" width="200" height="100"></canvas>
                <div class="risk-level">Risk Level: <span style="color:${riskColor}">${data.level}</span></div>
            </div>
            <div class="signal-list">
                <h4>Whale Signals</h4>
                ${data.signals.map(signal => `
                    <div class="signal-item">
                        <div class="signal-name">${signal.name}:</div>
                        <div class="signal-value">${signal.value}</div>
                        <div class="signal-impact ${signal.impact.toLowerCase()}">${signal.impact}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="whale-chart-container">
            <canvas id="whaleActivityChart"></canvas>
        </div>
    `;

    resultDiv.innerHTML = html;

    // Generate charts
    generateRiskGauge(data.risk_score);
    generateWhaleActivityChart(token);
}

// Chart Generation
function generateMockPriceChart(token) {
    const ctx = document.getElementById('priceChart').getContext('2d');

    // Generate 30 days of mock data
    const labels = Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (30 - i));
        return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    });

    // Generate prices with some trend
    const basePrice = Math.random() * 1000 + 100;
    const volatility = basePrice * 0.05;
    const trend = (Math.random() * 0.02) - 0.01;

    const prices = [];
    let currentPrice = basePrice;

    for (let i = 0; i < 30; i++) {
        currentPrice = currentPrice * (1 + trend) + (Math.random() * volatility * 2 - volatility);
        prices.push(currentPrice);
    }

    // Create chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${token.toUpperCase()} Price`,
                data: prices,
                borderColor: '#0078D7',
                backgroundColor: 'rgba(0, 120, 215, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                }
            }
        }
    });
}

function generateMockTechnicalChart(token, period) {
    const ctx = document.getElementById('technicalChart').getContext('2d');

    // Generate mock dates
    const days = parseInt(period);
    const labels = Array.from({length: days}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    });

    // Generate mock price data
    const basePrice = Math.random() * 1000 + 100;
    const volatility = basePrice * 0.05;
    const trend = (Math.random() * 0.04) - 0.02;

    const prices = [];
    let currentPrice = basePrice;

    for (let i = 0; i < days; i++) {
        currentPrice = currentPrice * (1 + trend) + (Math.random() * volatility * 2 - volatility);
        prices.push(currentPrice);
    }

    // Generate mock bollinger bands
    const upperBand = prices.map(price => price * (1 + Math.random() * 0.1 + 0.05));
    const lowerBand = prices.map(price => price * (1 - Math.random() * 0.1 - 0.05));

    // Create chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `${token.toUpperCase()} Price`,
                    data: prices,
                    borderColor: '#0078D7',
                    backgroundColor: 'rgba(0, 120, 215, 0.1)',
                    tension: 0.4,
                    fill: false,
                    order: 1
                },
                {
                    label: 'Upper Band',
                    data: upperBand,
                    borderColor: 'rgba(255, 99, 132, 0.7)',
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0,
                    order: 2
                },
                {
                    label: 'Lower Band',
                    data: lowerBand,
                    borderColor: 'rgba(255, 99, 132, 0.7)',
                    borderDash: [5, 5],
                    tension: 0.4,fill: 0,
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    pointRadius: 0,
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                }
            }
        }
    });
}

function generateRiskGauge(riskScore) {
    const ctx = document.getElementById('riskGauge').getContext('2d');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [riskScore, 100-riskScore],
                backgroundColor: [
                    riskScore > 70 ? '#FF6347' : (riskScore > 30 ? '#FFD700' : '#00CD00'),
                    '#F0F0F0'
                ],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });

    // Add risk score text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = riskScore > 70 ? '#FF6347' : (riskScore > 30 ? '#FFD700' : '#00CD00');
    ctx.fillText(riskScore, 100, 70);
}

function generateWhaleActivityChart(token) {
    const ctx = document.getElementById('whaleActivityChart').getContext('2d');

    // Generate mock dates
    const days = 14;
    const labels = Array.from({length: days}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    });

    // Generate mock whale activity data
    const walletCount = [];
    const concentration = [];

    for (let i = 0; i < days; i++) {
        walletCount.push(Math.floor(Math.random() * 20) + 180);
        concentration.push(Math.random() * 10 + 60);
    }

    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Top 100 Wallet Count',
                    data: walletCount,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Whale Concentration (%)',
                    data: concentration,
                    type: 'line',
                    fill: false,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    tension: 0.4,
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Wallet Count'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Concentration %'
                    },
                    min: 50,
                    max: 80,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Utility Functions
function showErrorDialog(message, title = 'Error') {
    document.getElementById('error-dialog-overlay').style.display = 'flex';
    document.getElementById('error-message').textContent = message;
    document.querySelector('#error-dialog .dialog-title').textContent = title;

    if (title === 'Error') {
        playSound('error-sound');
    }
}

function closeErrorDialog() {
    document.getElementById('error-dialog-overlay').style.display = 'none';
    playSound('click-sound');
}

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;

    const timeStr = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    document.getElementById('taskbar-time').textContent = timeStr;
}

function playSound(soundId) {
    if (!soundEnabled) return;

    try {
        const sound = document.getElementById(soundId);
        if (sound && sound.src && sound.src !== 'data:audio/mp3;base64,') {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Sound play error:', e));
        }
    } catch (e) {
        console.log('Sound error:', e);
    }
}

// API Configuration
// Update API_BASE_URL to always use the deployed Vercel URL in production
const API_BASE_URL = window.location.hostname.includes('vercel.app')
    ? 'https://' + window.location.hostname
    : window.location.origin;
let API_KEY = localStorage.getItem('api_key') || '';

// Handle Enter key in chat input
document.getElementById('chat-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// Attach event listeners to analysis buttons
document.getElementById('quick-token').addEventListener('change', function() {
    const resultsContainer = document.getElementById('quick-analysis-results');
    resultsContainer.innerHTML = '<div class="placeholder-message"><p>Select a cryptocurrency and click "Run Analysis" to see results.</p></div>';
});

document.getElementById('technical-token').addEventListener('change', function() {
    const resultsContainer = document.getElementById('technical-analysis-results');
    resultsContainer.innerHTML = '<div class="placeholder-message"><p>Configure your technical analysis parameters and click "Calculate Indicators".</p></div>';
});

document.getElementById('whale-token').addEventListener('change', function() {
    const resultsContainer = document.getElementById('whale-analysis-results');
    resultsContainer.innerHTML = '<div class="placeholder-message"><p>Select a cryptocurrency and click "Analyze Whale Activity" to see whale dominance metrics.</p></div>';
});


// Handle window focus on click
document.querySelectorAll('.window').forEach(function(windowEl) {
    windowEl.addEventListener('mousedown', function() {
        openWindow(windowEl.id);
    });
});

// Handle tab switching
document.querySelectorAll('.tab-button').forEach(function(button) {
    button.addEventListener('click', function() {
        const tabId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
        showTab(tabId);
    });
});

// Handle help tab switching
document.querySelectorAll('.help-sidebar-item').forEach(function(item) {
    item.addEventListener('click', function() {
        const tabId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
        showHelpTab(tabId);
    });
});

// Update CDP connection status
function updateCDPStatus() {
    const statusElement = document.getElementById('cdp-status');
    if (!statusElement) return;
    
    fetch(`${API_BASE_URL}/status`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "AgentKit is running") {
                statusElement.textContent = 'Connected to CDP';
                document.getElementById('status-text').textContent = 'Connected to CDP';
            } else {
                throw new Error('CDP not connected');
            }
        })
        .catch(error => {
            statusElement.textContent = 'CDP Connection Failed';
            document.getElementById('status-text').textContent = 'Not connected to CDP';
        });
}

// Call updateCDPStatus every 30 seconds
setInterval(updateCDPStatus, 30000);
// Initial CDP status check
updateCDPStatus();

// Global Variables
let isStartMenuOpen = false;
let isMaximized = {};
let windowPositions = {};
let windowSizes = {};


function getHighestZIndex() {
    let highest = 10; // Start from base z-index for windows
    
    document.querySelectorAll('.window').forEach(function(win) {
        const zIndex = parseInt(window.getComputedStyle(win).zIndex, 10);
        if (zIndex > highest) {
            highest = zIndex;
        }
    });
    
    return highest;
}

function initWindowDrag() {
    // Enable dragging for all window title bars
    document.querySelectorAll('.title-bar').forEach(function(titleBar) {
        titleBar.addEventListener('mousedown', function(e) {
            // Don't start drag if clicking on a title bar button
            if (e.target.closest('.title-bar-button')) {
                return;
            }
            
            const windowElement = titleBar.closest('.window');
            const windowId = windowElement.id;
            
            // Activate the window on drag start
            openWindow(windowId);
            
            // Don't drag maximized windows
            if (isMaximized[windowId]) {
                return;
            }
            
            isDragging = true;
            
            // Calculate offset of click relative to window position
            const windowRect = windowElement.getBoundingClientRect();
            dragOffsetX = e.clientX - windowRect.left;
            dragOffsetY = e.clientY - windowRect.top;
            
            // Add dragging class
            windowElement.classList.add('dragging');
            
            // Prevent text selection while dragging
            e.preventDefault();
        });
    });
    
    // Handle drag movement
    document.addEventListener('mousemove', function(e) {
        if (isDragging && activeWindow) {
            const windowElement = windows[activeWindow];
            
            // Calculate new position
            let newLeft = e.clientX - dragOffsetX;
            let newTop = e.clientY - dragOffsetY;
            
            // Constrain to window boundaries
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 100));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - 30));
            
            // Update position
            windowElement.style.left = newLeft + 'px';
            windowElement.style.top = newTop + 'px';
        }
    });
    
    // Handle drag end
    document.addEventListener('mouseup', function() {
        if (isDragging && activeWindow) {
            // Remove dragging class
            windows[activeWindow].classList.remove('dragging');
            isDragging = false;
        }
    });
}

function updateTaskbar() {
    const taskbarEntries = document.getElementById('taskbar-entries');
    taskbarEntries.innerHTML = '';
    
    // Add taskbar entries for open windows
    document.querySelectorAll('.window').forEach(function(windowEl) {
        if (windowEl.style.display !== 'none' || windowEl.classList.contains('minimized')) {
            const taskbarEntry = document.createElement('div');
            taskbarEntry.className = 'taskbar-entry';
            if (windowEl.classList.contains('active') && !windowEl.classList.contains('minimized')) {
                taskbarEntry.classList.add('active');
            }
            
            // Get title text
            const titleText = windowEl.querySelector('.title-bar-text').textContent.trim();
            
            // Get icon based on window id
            let iconPath = '';
            switch(windowEl.id) {
                case 'chat-window':
                    iconPath = 'static/img/w95_27.png';
                    break;
                case 'analysis-window':
                    iconPath = 'static/img/w95_52.png';
                    break;
                case 'settings-window':
                    iconPath = 'static/img/w2k_control_panel.png';
                    break;
                case 'help-window':
                    iconPath = 'static/img/w95_46.png';
                    break;
                default:
                    iconPath = 'static/img/w95_9.png';
            }
            
            // Add icon and text
            const icon = document.createElement('img');
            icon.className = 'taskbar-entry-icon';
            icon.src = iconPath;
            icon.alt = '';
            
            const text = document.createElement('span');
            text.className = 'taskbar-entry-text';
            text.textContent = titleText;
            
            taskbarEntry.appendChild(icon);
            taskbarEntry.appendChild(text);
            
            // Add click handler
            taskbarEntry.addEventListener('click', function() {
                playSound('click-sound');
                
                if (windowEl.classList.contains('minimized')) {
                    // Restore window from minimized state
                    windowEl.classList.remove('minimized');
                    openWindow(windowEl.id);
                } else if (windowEl.classList.contains('active')) {
                    // Minimize if already active
                    minimizeWindow(windowEl.id);
                } else {
                    // Activate if not active
                    openWindow(windowEl.id);
                }
            });
            
            taskbarEntries.appendChild(taskbarEntry);
        }
    });
}

function showNotification(message) {
    playSound('notify-sound');
    
    // Create and show toast notification
    const notification = document.createElement('div');
    notification.className = 'win97-notification';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '40px';
    notification.style.right = '20px';
    notification.style.background = 'var(--win97-blue)';
    notification.style.color = 'white';
    notification.style.padding = '10px 15px';
    notification.style.border = '2px solid';
    notification.style.borderColor = 'var(--win97-light) var(--win97-dark) var(--win97-dark) var(--win97-light)';
    notification.style.zIndex = '2000';
    notification.style.transition = 'opacity 0.3s, transform 0.3s';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.boxShadow = '3px 3px 5px rgba(0,0,0,0.3)';
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function getSignalClassFromValue(value) {
    if (!value) return 'neutral';
    
    value = value.toString().toUpperCase();
    
    if (value.includes('BULLISH') || 
        value.includes('UPWARD') || 
        value.includes('OVERSOLD') || 
        value.includes('BUY') ||
        value.includes('LOW')) {
        return 'bullish';
    } else if (value.includes('BEARISH') || 
               value.includes('DOWNWARD') || 
               value.includes('OVERBOUGHT') || 
               value.includes('SELL') ||
               value.includes('HIGH')) {
        return 'bearish';
    } else {
        return 'neutral';
    }
}

function getSignalClass(signal) {
    return getSignalClassFromValue(signal);
}

function getRiskClass(score) {
    if (score < 40) return 'bullish';
    if (score > 60) return 'bearish';
    return 'neutral';
}

function getZScoreSignal(value) {
    if (value > 2) return 'STRONGLY OVERBOUGHT';
    if (value > 1) return 'OVERBOUGHT';
    if (value < -2) return 'STRONGLY OVERSOLD';
    if (value < -1) return 'OVERSOLD';
    return 'NEUTRAL';
}

function getRSISignal(value) {
    if (value > 70) return 'OVERBOUGHT';
    if (value > 60) return 'APPROACHING OVERBOUGHT';
    if (value < 30) return 'OVERSOLD';
    if (value < 40) return 'APPROACHING OVERSOLD';
    return 'NEUTRAL';
}

function getBBSignal(value) {
    if (value > 1) return 'ABOVE UPPER BAND';
    if (value > 0.8) return 'UPPER BAND TOUCH';
    if (value < 0) return 'BELOW LOWER BAND';
    if (value < 0.2) return 'LOWER BAND TOUCH';
    return 'MIDDLE BAND';
}

function getTechnicalSummary(token, metrics) {
    // Generate a meaningful summary based on the technical indicators
    let summary = '';
    
    if (metrics.z_score && metrics.rsi && metrics.bollinger_bands) {
        const z_score = metrics.z_score.value;
        const rsi = metrics.rsi.value;
        const bb = metrics.bollinger_bands.percent_b;
        
        // Overextended to the upside?
        if (z_score > 1 && rsi > 65 && bb > 0.8) {
            summary = `${token.toUpperCase()} is showing signs of being overextended to the upside, with multiple indicators in overbought territory. This often precedes a reversion to the mean (downward movement).`;
        } 
        // Overextended to the downside?
        else if (z_score < -1 && rsi < 35 && bb < 0.2) {
            summary = `${token.toUpperCase()} is showing signs of being overextended to the downside, with multiple indicators in oversold territory. This may present a buying opportunity as prices often revert to the mean.`;
        }
        // Mixed signals but leaning bullish
        else if ((z_score < 0 || rsi < 45 || bb < 0.4) && !(z_score > 1 || rsi > 65 || bb > 0.8)) {
            summary = `${token.toUpperCase()} is showing some signs of weakness, but not yet in extreme oversold territory. Watch for potential buying opportunities if indicators move further into oversold zones.`;
        }
        // Mixed signals but leaning bearish
        else if ((z_score > 0 || rsi > 55 || bb > 0.6) && !(z_score < -1 || rsi < 35 || bb < 0.2)) {
            summary = `${token.toUpperCase()} is showing some strength, but not yet in extreme overbought territory. Caution is advised if indicators continue to move higher into overbought zones.`;
        }
        // Neutral
        else {
            summary = `${token.toUpperCase()} is currently in neutral territory with no extreme readings on technical indicators. The asset may be in a ranging or consolidation phase.`;
        }
    } else {
        summary = `Technical indicators suggest monitoring ${token.toUpperCase()} for more decisive signals before making trading decisions.`;
    }
    
    return summary;
}

function getWhaleAnalysisSummary(data) {
    if (data.risk_score > 70) {
        return 'significant distribution from large holders, which often precedes downward price movements';
    } else if (data.risk_score > 50) {
        return 'moderate activity from larger players with some concerning transfer patterns';
    } else if (data.risk_score > 30) {
        return 'typical movement patterns with no significant anomalies in wallet transfers';
    } else {
        return 'accumulation patterns from large holders, which is typically a positive long-term signal';
    }
}

function parseAnalysisText(text) {
    // Parse the analysis text into sections
    const sections = {
        price: null,
        indicators: [],
        signal: null,
        recommendation: null,
        whale: null
    };
    
    // Split by lines
    const lines = text.split('\n');
    let currentSection = '';
    
    // Process each line
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) continue;
        
        // Check for section headers
        if (trimmedLine.includes('===')) {
            // Extract section name
            const match = trimmedLine.match(/===\s*(.*?)\s*===/) || [];
            if (match[1]) {
                currentSection = match[1].trim();
            }
            continue;
        }
        
        // Process content based on current section
        if (currentSection.includes('PRICE & TECHNICAL')) {
            if (trimmedLine.startsWith('Current Price:')) {
                sections.price = trimmedLine;
            } else if (trimmedLine.includes(':')) {
                sections.indicators.push(trimmedLine);
            }
        } else if (currentSection.includes('MEAN REVERSION')) {
            if (trimmedLine.includes('Direction:')) {
                sections.signal = trimmedLine.replace('Direction:', '').trim();
            }
        } else if (currentSection.includes('RECOMMENDATION')) {
            if (!sections.recommendation) {
                sections.recommendation = trimmedLine;
            } else {
                sections.recommendation += ' ' + trimmedLine;
            }
        } else if (currentSection.includes('WHALE')) {
            if (trimmedLine.includes('Risk Score:')) {
                sections.whale = trimmedLine;
            }
        }
    }
    
    return sections;
}

function async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add user message to chat
    addChatMessage(message, 'user');
    
    // Add thinking message
    addThinkingMessage();
    
    try {
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': API_KEY ? `Bearer ${API_KEY}` : undefined
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove thinking message
        removeThinkingMessage();
        
        // Add bot response to chat
        addChatMessage(data.response, 'bot');
        
        // Update status bar
        document.getElementById('status-text').textContent = 'Ready';
        
    } catch (error) {
        console.error('Error:', error);
        removeThinkingMessage();
        addChatMessage("I'm having trouble connecting right now. Please try again later.", 'error');
        document.getElementById('status-text').textContent = 'Error: Connection failed';
    }
}

function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = sender === 'user' ? 'chat-message user' : 'chat-message bot';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const avatar = document.createElement('img');
    avatar.className = 'bot-avatar';
    // Set default avatars and add error handling
    avatar.src = sender === 'user' ? 'static/img/w95_9.png' : 'static/img/w95_27.png';
    avatar.alt = sender === 'user' ? 'User' : 'Dexy';
    avatar.onerror = function() {
        // Fallback to a different icon if the avatar fails to load
        this.src = 'static/img/w95_9.png';
    };
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // Process text for markdown-like formatting
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    messageText.innerHTML = `<p>${formattedText}</p>`;
    
    contentDiv.appendChild(avatar);
    contentDiv.appendChild(messageText);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom of chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addThinkingMessage() {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot thinking';
    messageDiv.id = 'thinking-message';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const avatar = document.createElement('img');
    avatar.className = 'bot-avatar';
    avatar.src = 'static/img/w95_27.png';
    avatar.alt = 'Dexy';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.innerHTML = '<p>Dexy is thinking<span class="ellipsis">...</span></p>';
    
    contentDiv.appendChild(avatar);
    contentDiv.appendChild(messageText);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animate ellipsis
    let dots = 0;
    const ellipsis = messageText.querySelector('.ellipsis');
    const ellipsisInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        ellipsis.textContent = '.'.repeat(dots);
    }, 500);
    
    // Store the interval in a data attribute
    messageDiv.dataset.interval = ellipsisInterval;
}

function removeThinkingMessage() {
    const thinkingMessage = document.getElementById('thinking-message');
    if (thinkingMessage) {
        // Clear the interval
        clearInterval(thinkingMessage.dataset.interval);
        
        // Remove the message
        thinkingMessage.remove();
    }
}

function runQuickAnalysis() {
    playSound('click-sound');
    
    const token = document.getElementById('quick-token').value;
    const resultsContainer = document.getElementById('quick-analysis-results');
    const loadingContainer = document.getElementById('quick-analysis-loading');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Show loading
    loadingContainer.style.display = 'flex';
    resultsContainer.appendChild(loadingContainer);
    
    // Make the API call to the analyze endpoint
    fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: token }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Process result - extract sections from the formatted text
        const analysisText = data.result || "No analysis data available";
        
        // Parse the analysis result into sections
        const sections = parseAnalysisText(analysisText);
        
        // Create results HTML
        let resultsHTML = `
            <div class="analysis-header">
                <span>${token.toUpperCase()} Analysis</span>
                <span class="price-info">
                    ${sections.price || 'Price data unavailable'}
                </span>
            </div>
        `;
        
        // Add metrics section
        resultsHTML += `<div class="metric-container">`;
        
        // Add technical indicators
        if (sections.indicators && sections.indicators.length > 0) {
            sections.indicators.forEach(indicator => {
                const [label, value] = indicator.split(':').map(s => s.trim());
                if (label && value) {
                    // Determine signal class
                    const signalClass = getSignalClassFromValue(value);
                    
                    resultsHTML += `
                        <div class="metric-row">
                            <div class="metric-label">${label}:</div>
                            <div class="metric-value ${signalClass}">${value}</div>
                        </div>
                    `;
                }
            });
        }
        
        // Close metrics container
        resultsHTML += `</div>`;
        
        // Add mean reversion signal
        if (sections.signal) {
            const signalClass = getSignalClassFromValue(sections.signal);
            resultsHTML += `
                <div class="analysis-summary">
                    <div class="summary-title">Mean Reversion Signal:</div>
                    <div class="${signalClass}">${sections.signal}</div>
                </div>
            `;
        }
        
        // Add recommendation if available
        if (sections.recommendation) {
            resultsHTML += `
                <div class="analysis-summary" style="margin-top: 10px;">
                    <div class="summary-title">Recommendation:</div>
                    <div>${sections.recommendation}</div>
                </div>
            `;
        }
        
        // Add whale activity if available
        if (sections.whale) {
            const whaleClass = getSignalClassFromValue(sections.whale);
            resultsHTML += `
                <div class="analysis-summary" style="margin-top: 10px;">
                    <div class="summary-title">Whale Activity:</div>
                    <div class="${whaleClass}">${sections.whale}</div>
                </div>
            `;
        }
        
        // Add results to container
        resultsContainer.innerHTML = resultsHTML;
        
        // Play notification sound
        playSound('notify-sound');
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Show error message
        resultsContainer.innerHTML = `
            <div class="win95-error">
                <div class="error-title">
                    <img src="static/img/w98_msg_error.png" alt="Error" style="width: 24px; height: 24px; margin-right: 8px;">
                    Analysis Error
                </div>
                <div class="error-message">
                    Could not analyze ${token}. Please try again later.
                    <p>Error details: ${error.message}</p>
                </div>
            </div>
        `;
        
        // Play error sound
        playSound('error-sound');
    });
}

function runTechnicalAnalysis() {
    playSound('click-sound');
    
    const token = document.getElementById('technical-token').value;
    const timePeriod = document.getElementById('time-period').value;
    const showZScore = document.getElementById('show-zscore').checked;
    const showRSI = document.getElementById('show-rsi').checked;
    const showBB = document.getElementById('show-bb').checked;
    
    const resultsContainer = document.getElementById('technical-analysis-results');
    const loadingContainer = document.getElementById('technical-analysis-loading');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Show loading
    loadingContainer.style.display = 'flex';
    resultsContainer.appendChild(loadingContainer);
    
    // Check if at least one indicator is selected
    if (!showZScore && !showRSI && !showBB) {
        loadingContainer.style.display = 'none';
        showErrorDialog('Please select at least one technical indicator to display.');
        return;
    }
    
    // Make the API call to the technical endpoint
    fetch(`${API_BASE_URL}/technical`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            token_id: token,
            days: parseInt(timePeriod)
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingContainer.style.display = 'none';
                
        // Extract indicators from API response
        const indicators = data.indicators || {};
        const metrics = indicators.metrics || {};
        const currentPrice = indicators.current_price || 0;
        
        // Create results HTML
        let resultsHTML = `
            <div class="analysis-header">
                <span>${token.toUpperCase()} Technical Analysis (${timePeriod} days)</span>
                <span class="price-info">$${currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            
            <div class="chart-container">
                <div class="chart-placeholder">
                    [Technical indicators chart would appear here in production version]
                </div>
            </div>
            
            <div class="metric-container">
        `;
        
        // Add selected indicators
        let hasValidMetrics = false;
        
        if (showZScore && metrics.z_score) {
            hasValidMetrics = true;
            const zScoreValue = metrics.z_score.value;
            const zScoreInterpretation = metrics.z_score.interpretation || getZScoreSignal(zScoreValue);
            
            resultsHTML += `
                <div class="metric-row">
                    <div class="metric-label">Z-Score:</div>
                    <div class="metric-value ${getSignalClass(zScoreInterpretation)}">
                        ${zScoreValue.toFixed(2)} (${zScoreInterpretation})
                    </div>
                </div>
            `;
        }
        
        if (showRSI && metrics.rsi) {
            hasValidMetrics = true;
            const rsiValue = metrics.rsi.value;
            const rsiInterpretation = metrics.rsi.interpretation || getRSISignal(rsiValue);
            
            resultsHTML += `
                <div class="metric-row">
                    <div class="metric-label">RSI:</div>
                    <div class="metric-value ${getSignalClass(rsiInterpretation)}">
                        ${rsiValue.toFixed(2)} (${rsiInterpretation})
                    </div>
                </div>
            `;
        }
        
        if (showBB && metrics.bollinger_bands) {
            hasValidMetrics = true;
            const bbValue = metrics.bollinger_bands.percent_b;
            const bbInterpretation = metrics.bollinger_bands.interpretation || getBBSignal(bbValue);
            
            resultsHTML += `
                <div class="metric-row">
                    <div class="metric-label">Bollinger %B:</div>
                    <div class="metric-value ${getSignalClass(bbInterpretation)}">
                        ${bbValue.toFixed(2)} (${bbInterpretation})
                    </div>
                </div>
            `;
        }
        
        // If no valid metrics were found, show fallback content
        if (!hasValidMetrics) {
            resultsHTML += `
                <div class="metric-row">
                    <div class="metric-label">No indicators available</div>
                    <div class="metric-value">Unable to retrieve the selected indicators for ${token}.</div>
                </div>
            `;
        }
        
        // Close metrics container
        resultsHTML += `</div>`;
        
        // Add summary
        let summaryText = "";
        if (indicators.summary) {
            summaryText = indicators.summary;
        } else {
            summaryText = getTechnicalSummary(token, metrics);
        }
        
        resultsHTML += `
            <div class="analysis-summary">
                <div class="summary-title">Analysis Summary:</div>
                <div>This technical analysis is based on ${timePeriod} days of historical data. ${summaryText}</div>
            </div>
        `;
        
        // Add results to container
        resultsContainer.innerHTML = resultsHTML;
        
        // Play notification sound
        playSound('notify-sound');
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Show error message
        resultsContainer.innerHTML = `
            <div class="win95-error">
                <div class="error-title">
                    <img src="static/img/w98_msg_error.png" alt="Error" style="width: 24px; height: 24px; margin-right: 8px;">
                    Analysis Error
                </div>
                <div class="error-message">
                    Could not retrieve technical indicators for ${token}. Please try again later.
                    <p>Error details: ${error.message}</p>
                </div>
            </div>
        `;
        
        // Play error sound
        playSound('error-sound');
    });
}

function runWhaleAnalysis() {
    playSound('click-sound');
    
    const token = document.getElementById('whale-token').value;
    const resultsContainer = document.getElementById('whale-analysis-results');
    const loadingContainer = document.getElementById('whale-analysis-loading');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Show loading
    loadingContainer.style.display = 'flex';
    resultsContainer.appendChild(loadingContainer);
    
    // Make the API call to the whale endpoint
    fetch(`${API_BASE_URL}/whale`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: token }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Get price data in a separate API call
        fetch(`${API_BASE_URL}/technical`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token_id: token }),
        })
        .then(priceResponse => priceResponse.json())
        .then(priceData => {
            // Extract the price if available, otherwise use a placeholder
            const price = priceData.indicators?.current_price || 0;
            
            // Create results HTML with current price
            displayWhaleResults(token, data, price, resultsContainer);
        })
        .catch(priceError => {
            console.error('Price fetch error:', priceError);
            // Display results without price
            displayWhaleResults(token, data, 0, resultsContainer);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Show error message
        resultsContainer.innerHTML = `
            <div class="win95-error">
                <div class="error-title">
                    <img src="static/img/w98_msg_error.png" alt="Error" style="width: 24px; height: 24px; margin-right: 8px;">
                    Analysis Error
                </div>
                <div class="error-message">
                    Could not retrieve whale activity data for ${token}. Please try again later.
                    <p>Error details: ${error.message}</p>
                </div>
            </div>
        `;
        
        // Play error sound
        playSound('error-sound');
    });
}

function displayWhaleResults(token, data, price, container) {
    const priceDisplay = price > 0 ? 
        `$${price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
        'Price data unavailable';
    
    // Create results HTML
    const resultsHTML = `
        <div class="analysis-header">
            <span>${token.toUpperCase()} Whale Activity Analysis</span>
            <span class="price-info">${priceDisplay}</span>
        </div>
        
        <div class="chart-container">
            <div class="chart-placeholder">
                [Whale activity chart would appear here in production version]
            </div>
        </div>
        
        <div class="metric-container">
            <div class="metric-row">
                <div class="metric-label">Risk Score:</div>
                <div class="metric-value ${getRiskClass(data.risk_score)}">
                    ${data.risk_score} / 100 (${data.level})
                </div>
            </div>
            
            <div class="metric-row">
                <div class="metric-label">Detected Signals:</div>
                <div class="metric-value">
                    ${data.signals && data.signals.length > 0 ? 
                        `<ul>${data.signals.map(signal => `<li>${signal}</li>`).join('')}</ul>` : 
                        'No specific risk signals detected'}
                </div>
            </div>
        </div>
        
        <div class="analysis-summary">
            <div class="summary-title">Whale Analysis Summary:</div>
            <div>The current whale activity for ${token.toUpperCase()} shows ${getWhaleAnalysisSummary(data)}.</div>
        </div>
    `;
    
    // Add results to container
    container.innerHTML = resultsHTML;
    
    // Play notification sound
    playSound('notify-sound');
}

// Helper Functions
function getSignalClassFromValue(value) {
    if (!value) return 'neutral';
    
    value = value.toString().toUpperCase();
    
    if (value.includes('BULLISH') || 
        value.includes('UPWARD') || 
        value.includes('OVERSOLD') || 
        value.includes('BUY') ||
        value.includes('LOW')) {
        return 'bullish';
    } else if (value.includes('BEARISH') || 
               value.includes('DOWNWARD') || 
               value.includes('OVERBOUGHT') || 
               value.includes('SELL') ||
               value.includes('HIGH')) {
        return 'bearish';
    } else {
        return 'neutral';
    }
}

function getSignalClass(signal) {
    return getSignalClassFromValue(signal);
}

function getRiskClass(score) {
    if (score < 40) return 'bullish';
    if (score > 60) return 'bearish';
    return 'neutral';
}

function getZScoreSignal(value) {
    if (value > 2) return 'STRONGLY OVERBOUGHT';
    if (value > 1) return 'OVERBOUGHT';
    if (value < -2) return 'STRONGLY OVERSOLD';
    if (value < -1) return 'OVERSOLD';
    return 'NEUTRAL';
}

function getRSISignal(value) {
    if (value > 70) return 'OVERBOUGHT';
    if (value > 60) return 'APPROACHING OVERBOUGHT';
    if (value < 30) return 'OVERSOLD';
    if (value < 40) return 'APPROACHING OVERSOLD';
    return 'NEUTRAL';
}

function getBBSignal(value) {
    if (value > 1) return 'ABOVE UPPER BAND';
    if (value > 0.8) return 'UPPER BAND TOUCH';
    if (value < 0) return 'BELOW LOWER BAND';
    if (value < 0.2) return 'LOWER BAND TOUCH';
    return 'MIDDLE BAND';
}

function getTechnicalSummary(token, metrics) {
    // Generate a meaningful summary based on the technical indicators
    let summary = '';
    
    if (metrics.z_score && metrics.rsi && metrics.bollinger_bands) {
        const z_score = metrics.z_score.value;
        const rsi = metrics.rsi.value;
        const bb = metrics.bollinger_bands.percent_b;
        
        // Overextended to the upside?
        if (z_score > 1 && rsi > 65 && bb > 0.8) {
            summary = `${token.toUpperCase()} is showing signs of being overextended to the upside, with multiple indicators in overbought territory. This often precedes a reversion to the mean (downward movement).`;
        } 
        // Overextended to the downside?
        else if (z_score < -1 && rsi < 35 && bb < 0.2) {
            summary = `${token.toUpperCase()} is showing signs of being overextended to the downside, with multiple indicators in oversold territory. This may present a buying opportunity as prices often revert to the mean.`;
        }
        // Mixed signals but leaning bullish
        else if ((z_score < 0 || rsi < 45 || bb < 0.4) && !(z_score > 1 || rsi > 65 || bb > 0.8)) {
            summary = `${token.toUpperCase()} is showing some signs of weakness, but not yet in extreme oversold territory. Watch for potential buying opportunities if indicators move further into oversold zones.`;
        }
        // Mixed signals but leaning bearish
        else if ((z_score > 0 || rsi > 55 || bb > 0.6) && !(z_score < -1 || rsi < 35 || bb < 0.2)) {
            summary = `${token.toUpperCase()} is showing some strength, but not yet in extreme overbought territory. Caution is advised if indicators continue to move higher into overbought zones.`;
        }
        // Neutral
        else {
            summary = `${token.toUpperCase()} is currently in neutral territory with no extreme readings on technical indicators. The asset may be in a ranging or consolidation phase.`;
        }
    } else {
        summary = `Technical indicators suggest monitoring ${token.toUpperCase()} for more decisive signals before making trading decisions.`;
    }
    
    return summary;
}

function getWhaleAnalysisSummary(data) {
    if (data.risk_score > 70) {
        return 'significant distribution from large holders, which often precedes downward price movements';
    } else if (data.risk_score > 50) {
        return 'moderate activity from larger players with some concerning transfer patterns';
    } else if (data.risk_score > 30) {
        return 'typical movement patterns with no significant anomalies in wallet transfers';
    } else {
        return 'accumulation patterns from large holders, which is typically a positive long-term signal';
    }
}

function parseAnalysisText(text) {
    // Parse the analysis text into sections
    const sections = {
        price: null,
        indicators: [],
        signal: null,
        recommendation: null,
        whale: null
    };
    
    // Split by lines
    const lines = text.split('\n');
    let currentSection = '';
    
    // Process each line
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) continue;
        
        // Check for section headers
        if (trimmedLine.includes('===')) {
            // Extract section name
            const match = trimmedLine.match(/===\s*(.*?)\s*===/) || [];
            if (match[1]) {
                currentSection = match[1].trim();
            }
            continue;
        }
        
        // Process content based on current section
        if (currentSection.includes('PRICE & TECHNICAL')) {
            if (trimmedLine.startsWith('Current Price:')) {
                sections.price = trimmedLine;
            } else if (trimmedLine.includes(':')) {
                sections.indicators.push(trimmedLine);
            }
        } else if (currentSection.includes('MEAN REVERSION')) {
            if (trimmedLine.includes('Direction:')) {
                sections.signal = trimmedLine.replace('Direction:', '').trim();
            }
        } else if (currentSection.includes('RECOMMENDATION')) {
            if (!sections.recommendation) {
                sections.recommendation = trimmedLine;
            } else {
                sections.recommendation += ' ' + trimmedLine;
            }
        } else if (currentSection.includes('WHALE')) {
            if (trimmedLine.includes('Risk Score:')) {
                sections.whale = trimmedLine;
            }
        }
    }
    
    return sections;
}

function async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add user message to chat
    addChatMessage(message, 'user');
    
    // Add thinking message
    addThinkingMessage();
    
    try {
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': API_KEY ? `Bearer ${API_KEY}` : undefined
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove thinking message
        removeThinkingMessage();
        
        // Add bot response to chat
        addChatMessage(data.response, 'bot');
        
        // Update status bar
        document.getElementById('status-text').textContent = 'Ready';
        
    } catch (error) {
        console.error('Error:', error);
        removeThinkingMessage();
        addChatMessage("I'm having trouble connecting right now. Please try again later.", 'error');
        document.getElementById('status-text').textContent = 'Error: Connection failed';
    }
}

function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = sender === 'user' ? 'chat-message user' : 'chat-message bot';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const avatar = document.createElement('img');
    avatar.className = 'bot-avatar';
    // Set default avatars and add error handling
    avatar.src = sender === 'user' ? 'static/img/w95_9.png' : 'static/img/w95_27.png';
    avatar.alt = sender === 'user' ? 'User' : 'Dexy';
    avatar.onerror = function() {
        // Fallback to a different icon if the avatar fails to load
        this.src = 'static/img/w95_9.png';
    };
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // Process text for markdown-like formatting
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    messageText.innerHTML = `<p>${formattedText}</p>`;
    
    contentDiv.appendChild(avatar);
    contentDiv.appendChild(messageText);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom of chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addThinkingMessage() {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot thinking';
    messageDiv.id = 'thinking-message';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const avatar = document.createElement('img');
    avatar.className = 'bot-avatar';
    avatar.src = 'static/img/w95_27.png';
    avatar.alt = 'Dexy';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.innerHTML = '<p>Dexy is thinking<span class="ellipsis">...</span></p>';
    
    contentDiv.appendChild(avatar);
    contentDiv.appendChild(messageText);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animate ellipsis
    let dots = 0;
    const ellipsis = messageText.querySelector('.ellipsis');
    const ellipsisInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        ellipsis.textContent = '.'.repeat(dots);
    }, 500);
    
    // Store the interval in a data attribute
    messageDiv.dataset.interval = ellipsisInterval;
}

function removeThinkingMessage() {
    const thinkingMessage = document.getElementById('thinking-message');
    if (thinkingMessage) {
        // Clear the interval
        clearInterval(thinkingMessage.dataset.interval);
        
        // Remove the message
        thinkingMessage.remove();
    }
}

function runQuickAnalysis() {
    playSound('click-sound');
    
    const token = document.getElementById('quick-token').value;
    const resultsContainer = document.getElementById('quick-analysis-results');
    const loadingContainer = document.getElementById('quick-analysis-loading');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Show loading
    loadingContainer.style.display = 'flex';
    resultsContainer.appendChild(loadingContainer);
    
    // Make the API call to the analyze endpoint
    fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: token }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Process result - extract sections from the formatted text
        const analysisText = data.result || "No analysis data available";
        
        // Parse the analysis result into sections
        const sections = parseAnalysisText(analysisText);
        
        // Create results HTML
        let resultsHTML = `
            <div class="analysis-header">
                <span>${token.toUpperCase()} Analysis</span>
                <span class="price-info">
                    ${sections.price || 'Price data unavailable'}
                </span>
            </div>
        `;
        
        // Add metrics section
        resultsHTML += `<div class="metric-container">`;
        
        // Add technical indicators
        if (sections.indicators && sections.indicators.length > 0) {
            sections.indicators.forEach(indicator => {
                const [label, value] = indicator.split(':').map(s => s.trim());
                if (label && value) {
                    // Determine signal class
                    const signalClass = getSignalClassFromValue(value);
                    
                    resultsHTML += `
                        <div class="metric-row">
                            <div class="metric-label">${label}:</div>
                            <div class="metric-value ${signalClass}">${value}</div>
                        </div>
                    `;
                }
            });
        }
        
        // Close metrics container
        resultsHTML += `</div>`;
        
        // Add mean reversion signal
        if (sections.signal) {
            const signalClass = getSignalClassFromValue(sections.signal);
            resultsHTML += `
                <div class="analysis-summary">
                    <div class="summary-title">Mean Reversion Signal:</div>
                    <div class="${signalClass}">${sections.signal}</div>
                </div>
            `;
        }
        
        // Add recommendation if available
        if (sections.recommendation) {
            resultsHTML += `
                <div class="analysis-summary" style="margin-top: 10px;">
                    <div class="summary-title">Recommendation:</div>
                    <div>${sections.recommendation}</div>
                </div>
            `;
        }
        
        // Add whale activity if available
        if (sections.whale) {
            const whaleClass = getSignalClassFromValue(sections.whale);
            resultsHTML += `
                <div class="analysis-summary" style="margin-top: 10px;">
                    <div class="summary-title">Whale Activity:</div>
                    <div class="${whaleClass}">${sections.whale}</div>
                </div>
            `;
        }
        
        // Add results to container
        resultsContainer.innerHTML = resultsHTML;
        
        // Play notification sound
        playSound('notify-sound');
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Show error message
        resultsContainer.innerHTML = `
            <div class="win95-error">
                <div class="error-title">
                    <img src="static/img/w98_msg_error.png" alt="Error" style="width: 24px; height: 24px; margin-right: 8px;">
                    Analysis Error
                </div>
                <div class="error-message">
                    Could not analyze ${token}. Please try again later.
                    <p>Error details: ${error.message}</p>
                </div>
            </div>
        `;
        
        // Play error sound
        playSound('error-sound');
    });
}

function runTechnicalAnalysis() {
    playSound('click-sound');
    
    const token = document.getElementById('technical-token').value;
    const timePeriod = document.getElementById('time-period').value;
    const showZScore = document.getElementById('show-zscore').checked;
    const showRSI = document.getElementById('show-rsi').checked;
    const showBB = document.getElementById('show-bb').checked;
    
    const resultsContainer = document.getElementById('technical-analysis-results');
    const loadingContainer = document.getElementById('technical-analysis-loading');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Show loading
    loadingContainer.style.display = 'flex';
    resultsContainer.appendChild(loadingContainer);
    
    // Check if at least one indicator is selected
    if (!showZScore && !showRSI && !showBB) {
        loadingContainer.style.display = 'none';
        showErrorDialog('Please select at least one technical indicator to display.');
        return;
    }
    
    // Make the API call to the technical endpoint
    fetch(`${API_BASE_URL}/technical`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            token_id: token,
            days: parseInt(timePeriod)
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Extract indicators from API response
        const indicators = data.indicators || {};
        const metrics = indicators.metrics || {};
        const currentPrice = indicators.current_price || 0;
        
        // Create results HTML
        let resultsHTML = `
            <div class="analysis-header">
                <span>${token.toUpperCase()} Technical Analysis (${timePeriod} days)</span>
                <span class="price-info">$${currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            
            <div class="chart-container">
                <div class="chart-placeholder">
                    [Technical indicators chart would appear here in production version]
                </div>
            </div>
            
            <div class="metric-container">
        `;
        
        // Add selected indicators
        let hasValidMetrics = false;
        
        if (showZScore && metrics.z_score) {
            hasValidMetrics = true;
            const zScoreValue = metrics.z_score.value;
            const zScoreInterpretation = metrics.z_score.interpretation || getZScoreSignal(zScoreValue);
            
            resultsHTML += `
                <div class="metric-row">
                    <div class="metric-label">Z-Score:</div>
                    <div class="metric-value ${getSignalClass(zScoreInterpretation)}">
                        ${zScoreValue.toFixed(2)} (${zScoreInterpretation})
                    </div>
                </div>
            `;
        }
        
        if (showRSI && metrics.rsi) {
            hasValidMetrics = true;
            const rsiValue = metrics.rsi.value;
            const rsiInterpretation = metrics.rsi.interpretation || getRSISignal(rsiValue);
            
            resultsHTML += `
                <div class="metric-row">
                    <div class="metric-label">RSI:</div>
                    <div class="metric-value ${getSignalClass(rsiInterpretation)}">
                        ${rsiValue.toFixed(2)} (${rsiInterpretation})
                    </div>
                </div>
            `;
        }
        
        if (showBB && metrics.bollinger_bands) {
            hasValidMetrics = true;
            const bbValue = metrics.bollinger_bands.percent_b;
            const bbInterpretation = metrics.bollinger_bands.interpretation || getBBSignal(bbValue);
            
            resultsHTML += `
                <div class="metric-row">
                    <div class="metric-label">Bollinger %B:</div>
                    <div class="metric-value ${getSignalClass(bbInterpretation)}">
                        ${bbValue.toFixed(2)} (${bbInterpretation})
                    </div>
                </div>
            `;
        }
        
        // If no valid metrics were found, show fallback content
        if (!hasValidMetrics) {
            resultsHTML += `
                <div class="metric-row">
                    <div class="metric-label">No indicators available</div>
                    <div class="metric-value">Unable to retrieve the selected indicators for ${token}.</div>
                </div>
            `;
        }
        
        // Close metrics container
        resultsHTML += `</div>`;
        
        // Add summary
        let summaryText = "";
        if (indicators.summary) {
            summaryText = indicators.summary;
        } else {
            summaryText = getTechnicalSummary(token, metrics);
        }
        
        resultsHTML += `
            <div class="analysis-summary">
                <div class="summary-title">Analysis Summary:</div>
                <div>This technical analysis is based on ${timePeriod} days of historical data. ${summaryText}</div>
            </div>
        `;
        
        // Add results to container
        resultsContainer.innerHTML = resultsHTML;
        
        // Play notification sound
        playSound('notify-sound');
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Show error message
        resultsContainer.innerHTML = `
            <div class="win95-error">
                <div class="error-title">
                    <img src="static/img/w98_msg_error.png" alt="Error" style="width: 24px; height: 24px; margin-right: 8px;">
                    Analysis Error
                </div>
                <div class="error-message">
                    Could not retrieve technical indicators for ${token}. Please try again later.
                    <p>Error details: ${error.message}</p>
                </div>
            </div>
        `;
        
        // Play error sound
        playSound('error-sound');
    });
}

function runWhaleAnalysis() {
    playSound('click-sound');
    
    const token = document.getElementById('whale-token').value;
    const resultsContainer = document.getElementById('whale-analysis-results');
    const loadingContainer = document.getElementById('whale-analysis-loading');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Show loading
    loadingContainer.style.display = 'flex';
    resultsContainer.appendChild(loadingContainer);
    
    // Make the API call to the whale endpoint
    fetch(`${API_BASE_URL}/whale`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: token }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Get price data in a separate API call
        fetch(`${API_BASE_URL}/technical`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token_id: token }),
        })
        .then(priceResponse => priceResponse.json())
        .then(priceData => {
            // Extract the price if available, otherwise use a placeholder
            const price = priceData.indicators?.current_price || 0;
            
            // Create results HTML with current price
            displayWhaleResults(token, data, price, resultsContainer);
        })
        .catch(priceError => {
            console.error('Price fetch error:', priceError);
            // Display results without price
            displayWhaleResults(token, data, 0, resultsContainer);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Hide loading
        loadingContainer.style.display = 'none';
        
        // Show error message
        resultsContainer.innerHTML = `
            <div class="win95-error">
                <div class="error-title">
                    <img<img src="static/img/w98_msg_error.png" alt="Error" style="width: 24px; height: 24px; margin-right: 8px;">
                    Analysis Error
                </div>
                <div class="error-message">
                    Could not retrieve whale activity data for ${token}. Please try again later.
                    <p>Error details: ${error.message}</p>
                </div>
            </div>
        `;
        
        // Play error sound
        playSound('error-sound');
    });
}

function displayWhaleResults(token, data, price, container) {
    const priceDisplay = price > 0 ? 
        `$${price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
        'Price data unavailable';
    
    // Create results HTML
    const resultsHTML = `
        <div class="analysis-header">
            <span>${token.toUpperCase()} Whale Activity Analysis</span>
            <span class="price-info">${priceDisplay}</span>
        </div>
        
        <div class="chart-container">
            <div class="chart-placeholder">
                [Whale activity chart would appear here in production version]
            </div>
        </div>
        
        <div class="metric-container">
            <div class="metric-row">
                <div class="metric-label">Risk Score:</div>
                <div class="metric-value ${getRiskClass(data.risk_score)}">
                    ${data.risk_score} / 100 (${data.level})
                </div>
            </div>
            
            <div class="metric-row">
                <div class="metric-label">Detected Signals:</div>
                <div class="metric-value">
                    ${data.signals && data.signals.length > 0 ? 
                        `<ul>${data.signals.map(signal => `<li>${signal}</li>`).join('')}</ul>` : 
                        'No specific risk signals detected'}
                </div>
            </div>
        </div>
        
        <div class="analysis-summary">
            <div class="summary-title">Whale Analysis Summary:</div>
            <div>The current whale activity for ${token.toUpperCase()} shows ${getWhaleAnalysisSummary(data)}.</div>
        </div>
    `;
    
    // Add results to container
    container.innerHTML = resultsHTML;
    
    // Play notification sound
    playSound('notify-sound');
}

// Helper Functions
function getSignalClassFromValue(value) {
    if (!value) return 'neutral';
    
    value = value.toString().toUpperCase();
    
    if (value.includes('BULLISH') || 
        value.includes('UPWARD') || 
        value.includes('OVERSOLD') || 
        value.includes('BUY') ||
        value.includes('LOW')) {
        return 'bullish';
    } else if (value.includes('BEARISH') || 
               value.includes('DOWNWARD') || 
               value.includes('OVERBOUGHT') || 
               value.includes('SELL') ||
               value.includes('HIGH')) {
        return 'bearish';
    } else {
        return 'neutral';
    }
}

function getSignalClass(signal) {
    return getSignalClassFromValue(signal);
}

function getRiskClass(score) {
    if (score < 40) return 'bullish';
    if (score > 60) return 'bearish';
    return 'neutral';
}

function getZScoreSignal(value) {
    if (value > 2) return 'STRONGLY OVERBOUGHT';
    if (value > 1) return 'OVERBOUGHT';
    if (value < -2) return 'STRONGLY OVERSOLD';
    if (value < -1) return 'OVERSOLD';
    return 'NEUTRAL';
}

function getRSISignal(value) {
    if (value > 70) return 'OVERBOUGHT';
    if (value > 60) return 'APPROACHING OVERBOUGHT';
    if (value < 30) return 'OVERSOLD';
    if (value < 40) return 'APPROACHING OVERSOLD';
    return 'NEUTRAL';
}

function getBBSignal(value) {
    if (value > 1) return 'ABOVE UPPER BAND';
    if (value > 0.8) return 'UPPER BAND TOUCH';
    if (value < 0) return 'BELOW LOWER BAND';
    if (value < 0.2) return 'LOWER BAND TOUCH';
    return 'MIDDLE BAND';
}

function getTechnicalSummary(token, metrics) {
    // Generate a meaningful summary based on the technical indicators
    let summary = '';
    
    if (metrics.z_score && metrics.rsi && metrics.bollinger_bands) {
        const z_score = metrics.z_score.value;
        const rsi = metrics.rsi.value;
        const bb = metrics.bollinger_bands.percent_b;
        
        // Overextended to the upside?
        if (z_score > 1 && rsi > 65 && bb > 0.8) {
            summary = `${token.toUpperCase()} is showing signs of being overextended to the upside, with multiple indicators in overbought territory. This often precedes a reversion to the mean (downward movement).`;
        } 
        // Overextended to the downside?
        else if (z_score < -1 && rsi < 35 && bb < 0.2) {
            summary = `${token.toUpperCase()} is showing signs of being overextended to the downside, with multiple indicators in oversold territory. This may present a buying opportunity as prices often revert to the mean.`;
        }
        // Mixed signals but leaning bullish
        else if ((z_score < 0 || rsi < 45 || bb < 0.4) && !(z_score > 1 || rsi > 65 || bb > 0.8)) {
            summary = `${token.toUpperCase()} is showing some signs of weakness, but not yet in extreme oversold territory. Watch for potential buying opportunities if indicators move further into oversold zones.`;
        }
        // Mixed signals but leaning bearish
        else if ((z_score > 0 || rsi > 55 || bb > 0.6) && !(z_score < -1 || rsi < 35 || bb < 0.2)) {
            summary = `${token.toUpperCase()} is showing some strength, but not yet in extreme overbought territory. Caution is advised if indicators continue to move higher into overbought zones.`;
        }
        // Neutral
        else {
            summary = `${token.toUpperCase()} is currently in neutral territory with no extreme readings on technical indicators. The asset may be in a ranging or consolidation phase.`;
        }
    } else {
        summary = `Technical indicators suggest monitoring ${token.toUpperCase()} for more decisive signals before making trading decisions.`;
    }
    
    return summary;
}

function getWhaleAnalysisSummary(data) {
    if (data.risk_score > 70) {
        return 'significant distribution from large holders, which often precedes downward price movements';
    } else if (data.risk_score > 50) {
        return 'moderate activity from larger players with some concerning transfer patterns';
    } else if (data.risk_score > 30) {
        return 'typical movement patterns with no significant anomalies in wallet transfers';
    } else {
        return 'accumulation patterns from large holders, which is typically a positive long-term signal';
    }
}

function parseAnalysisText(text) {
    // Parse the analysis text into sections
    const sections = {
        price: null,
        indicators: [],
        signal: null,
        recommendation: null,
        whale: null
    };
    
    // Split by lines
    const lines = text.split('\n');
    let currentSection = '';
    
    // Process each line
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) continue;
        
        // Check for section headers
        if (trimmedLine.includes('===')) {
            // Extract section name
            const match = trimmedLine.match(/===\s*(.*?)\s*===/) || [];
            if (match[1]) {
                currentSection = match[1].trim();
            }
            continue;
        }
        
        // Process content based on current section
        if (currentSection.includes('PRICE & TECHNICAL')) {
            if (trimmedLine.startsWith('Current Price:')) {
                sections.price = trimmedLine;
            } else if (trimmedLine.includes(':')) {
                sections.indicators.push(trimmedLine);
            }
        } else if (currentSection.includes('MEAN REVERSION')) {
            if (trimmedLine.includes('Direction:')) {
                sections.signal = trimmedLine.replace('Direction:', '').trim();
            }
        } else if (currentSection.includes('RECOMMENDATION')) {
            if (!sections.recommendation) {
                sections.recommendation = trimmedLine;
            } else {
                sections.recommendation += ' ' + trimmedLine;
            }
        } else if (currentSection.includes('WHALE')) {
            if (trimmedLine.includes('Risk Score:')) {
                sections.whale = trimmedLine;
            }
        }
    }
    
    return sections;
}
// Windows 97 Style UI Implementation
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    updateClock();
    setInterval(updateClock, 60000);
    
    // Show the chat window by default
    setTimeout(() => {
        openWindow('chat-window');
    }, 500);
    
    // Start menu toggle
    document.getElementById('start-button').addEventListener('click', toggleStartMenu);
    
    // Close start menu when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#start-menu') && !e.target.closest('#start-button')) {
            document.getElementById('start-menu').style.display = 'none';
        }
    });
    
    // Make windows draggable
    makeWindowsDraggable();
});

// Make windows draggable
function makeWindowsDraggable() {
    const windows = document.querySelectorAll('.window');
    
    windows.forEach(window => {
        const titleBar = window.querySelector('.title-bar');
        
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        if (titleBar) {
            titleBar.onmousedown = dragMouseDown;
        }
        
        function dragMouseDown(e) {
            e.preventDefault();
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // Call a function whenever the cursor moves
            document.onmousemove = elementDrag;
            
            // Bring window to front
            bringToFront(window);
        }
        
        function elementDrag(e) {
            e.preventDefault();
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Set the element's new position
            window.style.top = (window.offsetTop - pos2) + "px";
            window.style.left = (window.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
        }
    });
}

// Window Management Functions
function openWindow(windowId) {
    // Play click sound
    playSound('click-sound');
    
    const window = document.getElementById(windowId);
    window.style.display = 'block';
    
    // Bring this window to front
    bringToFront(window);
    
    // Add to taskbar if not already there
    addToTaskbar(windowId);
}

function closeWindow(windowId) {
    // Play click sound
    playSound('click-sound');
    
    document.getElementById(windowId).style.display = 'none';
    
    // Remove from taskbar
    removeFromTaskbar(windowId);
}

function minimizeWindow(windowId) {
    // Play click sound
    playSound('click-sound');
    
    document.getElementById(windowId).style.display = 'none';
}

function toggleMaximize(windowId) {
    // Play click sound
    playSound('click-sound');
    
    const window = document.getElementById(windowId);
    
    if (window.classList.contains('maximized')) {
        // Restore window
        window.classList.remove('maximized');
    } else {
        // Maximize window
        window.classList.add('maximized');
    }
}

function bringToFront(window) {
    // Set z-index for all windows to base value
    document.querySelectorAll('.window').forEach(w => {
        w.style.zIndex = "10";
    });
    
    // Set target window to higher z-index
    window.style.zIndex = "20";
}

// Taskbar Management
function addToTaskbar(windowId) {
    const taskbarEntries = document.getElementById('taskbar-entries');
    
    // Check if entry already exists
    if (!document.querySelector(`.taskbar-entry[data-window="${windowId}"]`)) {
        const windowElement = document.getElementById(windowId);
        const windowTitle = windowElement.querySelector('.title-bar-text').textContent.trim();
        
        const entry = document.createElement('div');
        entry.className = 'taskbar-entry';
        entry.setAttribute('data-window', windowId);
        entry.innerHTML = windowTitle;
        
        entry.addEventListener('click', () => {
            const window = document.getElementById(windowId);
            if (window.style.display === 'none') {
                window.style.display = 'block';
                bringToFront(window);
            } else {
                window.style.display = 'none';
            }
        });
        
        taskbarEntries.appendChild(entry);
    }
}

function removeFromTaskbar(windowId) {
    const entry = document.querySelector(`.taskbar-entry[data-window="${windowId}"]`);
    if (entry) {
        entry.remove();
    }
}

// Start Menu
function toggleStartMenu() {
    // Play click sound
    playSound('click-sound');
    
    const startMenu = document.getElementById('start-menu');
    startMenu.style.display = startMenu.style.display === 'block' ? 'none' : 'block';
}

// Chat functionality
function sendMessage() {
    const inputElement = document.getElementById('chat-input');
    const messagesElement = document.getElementById('chat-messages');
    const message = inputElement.value.trim();
    
    if (message === '') {
        return;
    }
    
    // Add user message to chat
    const userMessageElement = document.createElement('div');
    userMessageElement.className = 'chat-message user';
    userMessageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">
                <p>${message}</p>
            </div>
        </div>
    `;
    messagesElement.appendChild(userMessageElement);
    
    // Clear input
    inputElement.value = '';
    
    // Scroll to bottom
    messagesElement.scrollTop = messagesElement.scrollHeight;
    
    // Show thinking indicator
    const thinkingElement = document.createElement('div');
    thinkingElement.className = 'chat-message system thinking';
    thinkingElement.innerHTML = `
        <div class="message-content">
            <img src="static/img/w95_27.png" class="bot-avatar">
            <div class="message-text">
                <p>Thinking...</p>
            </div>
        </div>
    `;
    messagesElement.appendChild(thinkingElement);
    
    // Send message to server
    fetch('/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message }),
    })
    .then(response => response.json())
    .then(data => {
        // Remove thinking indicator
        messagesElement.removeChild(thinkingElement);
        
        // Add bot response to chat
        const botMessageElement = document.createElement('div');
        botMessageElement.className = 'chat-message system';
        botMessageElement.innerHTML = `
            <div class="message-content">
                <img src="static/img/w95_27.png" class="bot-avatar">
                <div class="message-text">
                    <p>${data.response}</p>
                </div>
            </div>
        `;
        messagesElement.appendChild(botMessageElement);
        
        // Scroll to bottom
        messagesElement.scrollTop = messagesElement.scrollHeight;
        
        // Play notification sound
        playSound('notify-sound');
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Remove thinking indicator
        messagesElement.removeChild(thinkingElement);
        
        // Add error message
        const errorMessageElement = document.createElement('div');
        errorMessageElement.className = 'chat-message system error';
        errorMessageElement.innerHTML = `
            <div class="message-content">
                <img src="static/img/w95_27.png" class="bot-avatar">
                <div class="message-text">
                    <p>Sorry, an error occurred. Please try again.</p>
                </div>
            </div>
        `;
        messagesElement.appendChild(errorMessageElement);
        
        // Play error sound
        playSound('error-sound');
    });
}

// Analysis Tab Functions
function showTab(tabId) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab pane
    document.getElementById(tabId).classList.add('active');
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Find and activate the button that called this function
    document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// Help Tab Functions
function showHelpTab(tabId) {
    // Hide all help tab contents
    document.querySelectorAll('.help-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected help tab content
    document.getElementById(tabId).classList.add('active');
    
    // Update sidebar items
    document.querySelectorAll('.help-sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate the sidebar item
    document.querySelector(`.help-sidebar-item[onclick="showHelpTab('${tabId}')"]`).classList.add('active');
}

// Analysis Functions
function runQuickAnalysis() {
    const tokenSelect = document.getElementById('quick-token');
    const token = tokenSelect.value;
    const resultsContainer = document.getElementById('quick-analysis-results');
    const loadingIndicator = document.getElementById('quick-analysis-loading');
    
    // Show loading indicator
    resultsContainer.innerHTML = '';
    loadingIndicator.style.display = 'flex';
    
    // Send request to server
    fetch('/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: token }),
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (data.error) {
            resultsContainer.innerHTML = `<div class="error-message">${data.error}</div>`;
            return;
        }
        
        // Display results
        const result = data.result;
        resultsContainer.innerHTML = `
            <div class="analysis-result-card">
                <h3>${token.toUpperCase()} Analysis</h3>
                <div class="result-item">
                    <span class="label">Current Price:</span>
                    <span class="value">$${result.current_price.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="label">Z-Score:</span>
                    <span class="value ${getZScoreClass(result.metrics.z_score.value)}">${result.metrics.z_score.value.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="label">RSI:</span>
                    <span class="value ${getRSIClass(result.metrics.rsi.value)}">${result.metrics.rsi.value.toFixed(2)}</span>
                </div>
                <div class="result-item">
                    <span class="label">Bollinger %B:</span>
                    <span class="value ${getBBClass(result.metrics.bollinger_bands.percent_b)}">${result.metrics.bollinger_bands.percent_b.toFixed(2)}</span>
                </div>
                <div class="result-summary">
                    <h4>Interpretation:</h4>
                    <p>${result.summary}</p>
                </div>
            </div>
        `;
    })
    .catch(error => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        // Show error
        resultsContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    });
}

function getZScoreClass(value) {
    if (value > 2) return 'high';
    if (value < -2) return 'low';
    return 'normal';
}

function getRSIClass(value) {
    if (value > 70) return 'high';
    if (value < 30) return 'low';
    return 'normal';
}

function getBBClass(value) {
    if (value > 1) return 'high';
    if (value < 0) return 'low';
    return 'normal';
}

function runTechnicalAnalysis() {
    const tokenSelect = document.getElementById('technical-token');
    const token = tokenSelect.value;
    const timePeriod = document.getElementById('time-period').value;
    const showZScore = document.getElementById('show-zscore').checked;
    const showRSI = document.getElementById('show-rsi').checked;
    const showBB = document.getElementById('show-bb').checked;
    
    const resultsContainer = document.getElementById('technical-analysis-results');
    const loadingIndicator = document.getElementById('technical-analysis-loading');
    
    // Show loading indicator
    resultsContainer.innerHTML = '';
    loadingIndicator.style.display = 'flex';
    
    // Send request to server
    fetch('/technical', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            token_id: token,
            time_period: timePeriod
        }),
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (data.error) {
            resultsContainer.innerHTML = `<div class="error-message">${data.error}</div>`;
            return;
        }
        
        // Create chart container
        resultsContainer.innerHTML = `
            <div class="chart-container">
                <canvas id="technical-chart"></canvas>
            </div>
            <div class="indicators-summary">
                <h4>Technical Indicators Summary</h4>
                <div class="indicator-grid" id="indicator-summary"></div>
            </div>
        `;
        
        // Create chart (placeholder data since actual implementation would depend on API response)
        createTechnicalChart();
        
        // Add indicator summary
        const indicatorSummary = document.getElementById('indicator-summary');
        indicatorSummary.innerHTML = `
            <div class="indicator-item">
                <span class="indicator-name">Z-Score:</span>
                <span class="indicator-value ${getZScoreClass(data.indicators.z_score)}">${data.indicators.z_score.toFixed(2)}</span>
            </div>
            <div class="indicator-item">
                <span class="indicator-name">RSI:</span>
                <span class="indicator-value ${getRSIClass(data.indicators.rsi)}">${data.indicators.rsi.toFixed(2)}</span>
            </div>
            <div class="indicator-item">
                <span class="indicator-name">Signal:</span>
                <span class="indicator-value signal">${data.indicators.signal}</span>
            </div>
        `;
    })
    .catch(error => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        // Show error
        resultsContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    });
}

function createTechnicalChart() {
    // Sample data - in a real implementation, this would use data from the API
    const ctx = document.getElementById('technical-chart').getContext('2d');
    
    // Generate 30 days of sample data
    const labels = Array.from({length: 30}, (_, i) => `Day ${i+1}`);
    const priceData = Array.from({length: 30}, () => Math.random() * 5000 + 25000);
    
    // Create gradients
    const priceGradient = ctx.createLinearGradient(0, 0, 0, 400);
    priceGradient.addColorStop(0, 'rgba(75, 192, 192, 0.6)');
    priceGradient.addColorStop(1, 'rgba(75, 192, 192, 0.1)');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (USD)',
                data: priceData,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: priceGradient,
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

function runWhaleAnalysis() {
    const tokenSelect = document.getElementById('whale-token');
    const token = tokenSelect.value;
    const resultsContainer = document.getElementById('whale-analysis-results');
    const loadingIndicator = document.getElementById('whale-analysis-loading');
    
    // Show loading indicator
    resultsContainer.innerHTML = '';
    loadingIndicator.style.display = 'flex';
    
    // Send request to server
    fetch('/whale', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: token }),
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (data.error) {
            resultsContainer.innerHTML = `<div class="error-message">${data.error}</div>`;
            return;
        }
        
        // Display results
        resultsContainer.innerHTML = `
            <div class="whale-result-card">
                <h3>${token.toUpperCase()} Whale Analysis</h3>
                <div class="risk-meter">
                    <div class="risk-level ${getRiskClass(data.risk_score)}">
                        <span class="risk-label">Risk Level: ${data.level}</span>
                        <div class="risk-bar">
                            <div class="risk-fill" style="width: ${data.risk_score}%;"></div>
                        </div>
                    </div>
                </div>
                <div class="signals-list">
                    <h4>Signals Detected:</h4>
                    <ul id="whale-signals"></ul>
                </div>
            </div>
        `;
        
        // Add signals
        const signalsList = document.getElementById('whale-signals');
        data.signals.forEach(signal => {
            const li = document.createElement('li');
            li.className = `signal-item ${signal.type}`;
            li.textContent = signal.description;
            signalsList.appendChild(li);
        });
    })
    .catch(error => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        // Show error
        resultsContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    });
}

function getRiskClass(score) {
    if (score > 75) return 'high-risk';
    if (score > 50) return 'medium-risk';
    if (score > 25) return 'low-risk';
    return 'very-low-risk';
}

// Settings Functions
function saveSettings() {
    const apiKey = document.getElementById('api-key').value;
    const apiProvider = document.getElementById('api-provider').value;
    const enableSounds = document.getElementById('enable-sounds').checked;
    const autostartChat = document.getElementById('autostart-chat').checked;
    
    // Here you would normally save these settings to the server
    
    // Show confirmation
    showDialog('Settings', 'Settings saved successfully!');
    
    // Close settings window
    closeWindow('settings-window');
}

function connectWallet() {
    // Show a loading message
    const walletDisplay = document.getElementById('wallet-address');
    walletDisplay.textContent = 'Connecting...';
    
    // In a real implementation, this would connect to CDP wallet
    setTimeout(() => {
        walletDisplay.textContent = '0x1a2b...3c4d';
    }, 2000);
}

// Error Dialog
function showErrorDialog(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-dialog-overlay').style.display = 'flex';
    playSound('error-sound');
}

function closeErrorDialog() {
    document.getElementById('error-dialog-overlay').style.display = 'none';
}

// Utility Functions
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    const timeString = hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;
    document.getElementById('taskbar-time').textContent = timeString;
}

function playSound(soundId) {
    // Check if sounds are enabled
    const enableSounds = document.getElementById('enable-sounds') ? document.getElementById('enable-sounds').checked : true;
    
    if (enableSounds) {
        const sound = document.getElementById(soundId);
        if (sound && sound.play) {
            sound.currentTime = 0;
            sound.play().catch(e => {
                // Autoplay might be blocked
                console.log('Sound play failed:', e);
            });
        }
    }
}

// Generic dialog
function showDialog(title, message) {
    // Create dialog if it doesn't exist
    if (!document.getElementById('generic-dialog-overlay')) {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay';
        dialogOverlay.id = 'generic-dialog-overlay';
        
        dialogOverlay.innerHTML = `
            <div class="dialog" id="generic-dialog">
                <div class="dialog-title-bar">
                    <div class="dialog-title" id="generic-dialog-title">Message</div>
                    <button class="dialog-close" onclick="closeGenericDialog()">✕</button>
                </div>
                <div class="dialog-content">
                    <img src="static/img/w98_msg_info.png" alt="Info" class="dialog-icon">
                    <div class="dialog-message" id="generic-dialog-message"></div>
                </div>
                <div class="dialog-buttons">
                    <button class="win97-button" onclick="closeGenericDialog()">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialogOverlay);
    }
    
    // Set dialog content
    document.getElementById('generic-dialog-title').textContent = title;
    document.getElementById('generic-dialog-message').textContent = message;
    document.getElementById('generic-dialog-overlay').style.display = 'flex';
    
    // Play notification sound
    playSound('notify-sound');
}

function closeGenericDialog() {
    document.getElementById('generic-dialog-overlay').style.display = 'none';
}
