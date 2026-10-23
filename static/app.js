/**
 * KOMPYUTER HOLATINI MONITORING QILISH VA DARSLIK SIMULYATOR
 * JavaScript Frontend Logic: REST API polling, Canvas charts,
 * Educational Simulator Scenarios, OS Switcher, Audio Alerts, and Quiz.
 */

// Global holat (State)
const state = {
    mode: 'live', // 'live' yoki 'simulator'
    os: 'windows', // 'windows', 'linux', 'macos'
    soundEnabled: true,
    history: {
        cpu: Array(60).fill(10),
        ram: Array(60).fill(30)
    },
    simValues: {
        cpu: 8,
        ram: 35,
        disk: 45,
        temp: 45,
        fan: 1200,
        procs: 120,
        cores: [10, 8, 6, 12, 7, 9, 5, 11],
        netRxMb: 45.2,
        netTxMb: 12.8
    },
    quizScore: 0,
    answeredQuestions: new Set()
};

// Web Audio API yordamida avtonom audio ogohlantirish (Offline)
let audioCtx = null;
function playAlarmSound(type = 'warn') {
    if (!state.soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'danger') {
            // Sirena ovozi (Kritik holat)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else {
            // Oddiy ogohlantirish bipi
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    } catch (e) {
        console.warn("Audio Context error:", e);
    }
}

// ========================================================
// 1. REJLAR VA TABS NAVIGATSIYASI
// ========================================================
function initTabsAndModes() {
    // Tab almashtirish
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const target = btn.getAttribute('data-tab');
            document.getElementById(target).classList.add('active');
        });
    });

    // Rejim tugmalari (Live vs Simulyator)
    const btnLive = document.getElementById('btnModeLive');
    const btnSim = document.getElementById('btnModeSim');

    btnLive.addEventListener('click', () => {
        state.mode = 'live';
        btnLive.classList.add('active');
        btnSim.classList.remove('active');
        document.getElementById('footerStatusText').textContent = "Haqiqiy Tizim Monitoringi Faol (psutil) | Yangilanish: 1s";
    });

    btnSim.addEventListener('click', () => {
        state.mode = 'simulator';
        btnSim.classList.add('active');
        btnLive.classList.remove('active');
        document.getElementById('footerStatusText').textContent = "Dars Simulyatori Faol (O'qituvchi boshqaruvi)";
        // Simulyator tabiga avtomatik o'tkazish
        document.querySelector('.tab-btn[data-tab="tab-simulator"]').click();
        updateSimulationUI();
    });

    // Ovoz yoqish/o'chirish
    const btnSound = document.getElementById('btnSoundToggle');
    btnSound.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        btnSound.innerHTML = state.soundEnabled ? '🔊 <span>Ovoz yoqiq</span>' : '🔇 <span>Ovoz o\'chiq</span>';
        if (state.soundEnabled) playAlarmSound('warn');
    });

    // Soat
    setInterval(() => {
        const now = new Date();
        document.getElementById('clockDisplay').textContent = now.toTimeString().split(' ')[0];
    }, 1000);
}

// ========================================================
// 2. HAQIQIY TIZIM MONITORINGI (LIVE API POLLING)
// ========================================================
async function fetchLiveMetrics() {
    if (state.mode !== 'live') return;

    try {
        const res = await fetch('/api/metrics');
        if (!res.ok) throw new Error("API xatosi");
        const data = await res.json();
        renderLiveMetrics(data);
    } catch (err) {
        // Agar sayt Netlify yoki GitHub Pages da ochilgan bo'lsa (Backend yo'q)
        renderStandaloneWebMetrics();
    }
}

function renderStandaloneWebMetrics() {
    document.getElementById('footerStatusText').textContent = "🌐 Onlayn Veb Rejim Faol | Simulyator va barcha laboratoriya vositalari to'liq ishlamoqda";
    
    // Tasodifiy jonli tebranishlar
    const jitter = (Math.random() - 0.5) * 3;
    const cpuP = Math.max(8, Math.min(65, Math.round(28 + jitter)));
    const ramP = 46;

    document.getElementById('cpuPercentVal').textContent = `${cpuP}%`;
    const cpuBar = document.getElementById('cpuProgressBar');
    cpuBar.style.width = `${cpuP}%`;
    setBarColor(cpuBar, cpuP);

    document.getElementById('cpuFreqVal').textContent = "3200 MHz";
    document.getElementById('cpuCoresVal').textContent = "8 fiz / 16 log";
    document.getElementById('cpuTempVal').textContent = "48°C";

    const simulatedCores = [
        Math.max(5, Math.min(95, Math.round(cpuP + (Math.random() - 0.5) * 15))),
        Math.max(5, Math.min(95, Math.round(cpuP + (Math.random() - 0.5) * 12))),
        Math.max(5, Math.min(95, Math.round(cpuP + (Math.random() - 0.5) * 10))),
        Math.max(5, Math.min(95, Math.round(cpuP + (Math.random() - 0.5) * 8))),
        Math.max(5, Math.min(95, Math.round(cpuP + (Math.random() - 0.5) * 14))),
        Math.max(5, Math.min(95, Math.round(cpuP + (Math.random() - 0.5) * 11))),
        Math.max(5, Math.min(95, Math.round(cpuP + (Math.random() - 0.5) * 9))),
        Math.max(5, Math.min(95, Math.round(cpuP + (Math.random() - 0.5) * 13)))
    ];
    renderCoresGrid(simulatedCores);

    document.getElementById('ramPercentVal').textContent = `${ramP}%`;
    const ramBar = document.getElementById('ramProgressBar');
    ramBar.style.width = `${ramP}%`;
    setBarColor(ramBar, ramP);

    document.getElementById('ramUsedVal').textContent = "7.4 GB";
    document.getElementById('ramFreeVal').textContent = "8.6 GB";
    document.getElementById('ramTotalVal').textContent = "16.0 GB";

    document.getElementById('swapPercentVal').textContent = "12%";
    const swapBar = document.getElementById('swapProgressBar');
    swapBar.style.width = "12%";
    document.getElementById('swapUsedTotal').textContent = "1.0 GB / 8.0 GB";

    renderDiskPartitions([
        { device: "C:", fstype: "NTFS", mountpoint: "C:\\", percent: 54, used_gb: 276, free_gb: 236, total_gb: 512 },
        { device: "D:", fstype: "NTFS", mountpoint: "D:\\", percent: 28, used_gb: 280, free_gb: 720, total_gb: 1000 }
    ]);

    document.getElementById('sysOsName').textContent = "Veb-Simulyator (Windows 11 / Linux mos)";
    document.getElementById('sysHostName').textContent = "ONLINE-DEMO";
    document.getElementById('sysProcCount').textContent = "142 ta";
    document.getElementById('netRxVal').textContent = "124 MB";
    document.getElementById('netTxVal').textContent = "48 MB";
    document.getElementById('uptimeVal').textContent = "Onlayn Dars";

    renderProcessesTable([
        { pid: 1042, name: "browser.exe", cpu_percent: 8.5, memory_percent: 14.2 },
        { pid: 2190, name: "python_service.exe", cpu_percent: 6.2, memory_percent: 8.1 },
        { pid: 3104, name: "code_editor.exe", cpu_percent: 4.8, memory_percent: 11.4 },
        { pid: 4050, name: "system", cpu_percent: 2.1, memory_percent: 3.2 }
    ]);

    pushHistory(cpuP, ramP);
}

function renderLiveMetrics(data) {
    // 1. CPU
    const cpu = data.cpu || {};
    const cpuP = cpu.overall_percent || 0;
    document.getElementById('cpuPercentVal').textContent = `${cpuP}%`;
    const cpuBar = document.getElementById('cpuProgressBar');
    cpuBar.style.width = `${cpuP}%`;
    setBarColor(cpuBar, cpuP);

    document.getElementById('cpuFreqVal').textContent = cpu.frequency_current ? `${cpu.frequency_current} MHz` : 'N/A';
    document.getElementById('cpuCoresVal').textContent = `${cpu.physical_cores || 4} fiz / ${cpu.logical_cores || 4} log`;

    // Per-core
    renderCoresGrid(cpu.cores_percent || [cpuP]);

    // Load Average (Linux / macOS da)
    const loadAvgBox = document.getElementById('loadAvgContainer');
    if (cpu.load_average && cpu.load_average.length === 3) {
        loadAvgBox.style.display = 'flex';
        document.getElementById('loadAvgVal').textContent = cpu.load_average.join(', ');
    } else {
        loadAvgBox.style.display = 'none';
    }

    // 2. RAM
    const mem = data.memory || {};
    const ramP = mem.percent || 0;
    document.getElementById('ramPercentVal').textContent = `${ramP}%`;
    const ramBar = document.getElementById('ramProgressBar');
    ramBar.style.width = `${ramP}%`;
    setBarColor(ramBar, ramP);

    document.getElementById('ramUsedVal').textContent = `${mem.used_gb || 0} GB`;
    document.getElementById('ramFreeVal').textContent = `${mem.free_gb || 0} GB`;
    document.getElementById('ramTotalVal').textContent = `${mem.total_gb || 0} GB`;

    // Swap
    const swapP = mem.swap_percent || 0;
    document.getElementById('swapPercentVal').textContent = `${swapP}%`;
    const swapBar = document.getElementById('swapProgressBar');
    swapBar.style.width = `${swapP}%`;
    setBarColor(swapBar, swapP);
    document.getElementById('swapUsedTotal').textContent = `${mem.swap_used_gb || 0} GB / ${mem.swap_total_gb || 0} GB`;

    // 3. Disk
    renderDiskPartitions(data.disk || []);

    // 4. Tizim & Tarmoq
    const sys = data.platform || {};
    document.getElementById('sysOsName').textContent = `${sys.system} ${sys.release} (${sys.machine})`;
    document.getElementById('sysHostName').textContent = sys.node || 'N/A';
    document.getElementById('sysProcCount').textContent = `${data.total_processes_count || 0} ta`;

    const net = data.network || {};
    document.getElementById('netRxVal').textContent = `${net.bytes_recv_mb || 0} MB`;
    document.getElementById('netTxVal').textContent = `${net.bytes_sent_mb || 0} MB`;

    if (data.uptime) {
        document.getElementById('uptimeVal').textContent = `Uptime: ${data.uptime.formatted}`;
    }

    // OS Badge
    const osBadge = document.getElementById('osBadgeText');
    const osIcon = document.querySelector('.os-icon');
    if (sys.system === 'Windows') {
        osBadge.textContent = "Windows 11";
        osIcon.textContent = "🪟";
        document.getElementById('swapHint').textContent = "Windows: Pagefile.sys";
    } else if (sys.system === 'Linux') {
        osBadge.textContent = "Linux (Ubuntu)";
        osIcon.textContent = "🐧";
        document.getElementById('swapHint').textContent = "Linux: Swap partition";
    } else {
        osBadge.textContent = "macOS";
        osIcon.textContent = "🍎";
        document.getElementById('swapHint').textContent = "macOS: VM Swap";
    }

    // Top jarayonlar
    renderProcessesTable(data.processes || []);

    // Grafik ma'lumotlarini yangilash
    pushHistory(cpuP, ramP);

    // Xavf tekshiruvi
    checkSystemAlerts(cpuP, ramP, data.disk && data.disk[0] ? data.disk[0].percent : 0, 45);
}

function setBarColor(elem, percent) {
    elem.classList.remove('warning', 'danger');
    if (percent >= 88) {
        elem.classList.add('danger');
    } else if (percent >= 70) {
        elem.classList.add('warning');
    }
}

function renderCoresGrid(coresArray) {
    const grid = document.getElementById('cpuCoresGrid');
    grid.innerHTML = '';
    coresArray.slice(0, 8).forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'core-item';
        let colorClass = 'text-cyan';
        if (p >= 85) colorClass = 'text-red';
        else if (p >= 65) colorClass = 'text-yellow';

        item.innerHTML = `
            <span class="core-name">Yadro #${idx + 1}</span>
            <span class="core-val ${colorClass}">${p}%</span>
        `;
        grid.appendChild(item);
    });
}

function renderDiskPartitions(partitions) {
    const container = document.getElementById('diskPartitionsList');
    container.innerHTML = '';

    if (!partitions || partitions.length === 0) {
        container.innerHTML = '<div class="part-card">Disk ma\'lumoti yo\'q</div>';
        return;
    }

    document.getElementById('primaryDiskPercentVal').textContent = `${partitions[0].percent}%`;

    partitions.forEach(p => {
        const card = document.createElement('div');
        card.className = 'part-card';
        card.innerHTML = `
            <div class="part-head">
                <span>📁 ${p.device} [${p.fstype}] -> ${p.mountpoint}</span>
                <span class="${p.percent >= 85 ? 'text-red' : 'text-cyan'}">${p.percent}%</span>
            </div>
            <div class="progress-bar-wrap mini">
                <div class="progress-bar ${p.percent >= 85 ? 'danger' : p.percent >= 70 ? 'warning' : ''}" style="width: ${p.percent}%;"></div>
            </div>
            <div class="swap-sub-info">
                <span>${p.used_gb} GB band</span>
                <span>${p.free_gb} GB bo'sh (${p.total_gb} GB)</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderProcessesTable(procs) {
    const tbody = document.getElementById('procsTableBody');
    tbody.innerHTML = '';

    procs.slice(0, 6).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${p.pid}</td>
            <td style="color: #fff; font-weight: 500;">${p.name}</td>
            <td class="${p.cpu_percent > 30 ? 'text-red' : 'text-cyan'}">${p.cpu_percent}%</td>
            <td class="${p.memory_percent > 20 ? 'text-purple' : ''}">${p.memory_percent}%</td>
        `;
        tbody.appendChild(tr);
    });
}

// ========================================================
// 3. JONLI GRAFIK (CANVAS REAL-TIME CHART)
// ========================================================
function pushHistory(cpuVal, ramVal) {
    state.history.cpu.push(cpuVal);
    state.history.cpu.shift();

    state.history.ram.push(ramVal);
    state.history.ram.shift();

    drawHistoryChart();
}

function drawHistoryChart() {
    const canvas = document.getElementById('liveHistoryCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fon to'ri (Grid lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += 44) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    for (let x = 0; x <= w; x += 70) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    // 100%, 50%, 0% yozuvlari
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '10px Fira Code';
    ctx.fillText('100%', 6, 14);
    ctx.fillText('50%', 6, h / 2 + 4);
    ctx.fillText('0%', 6, h - 6);

    // Chiziq chizuvchi yordamchi funksiya
    function drawLine(data, color, fillGradient) {
        ctx.beginPath();
        const step = w / (data.length - 1);

        for (let i = 0; i < data.length; i++) {
            const x = i * step;
            const y = h - (data[i] / 100) * (h - 20) - 10;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Tagini shaffof rang bilan to'ldirish
        if (fillGradient) {
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fillStyle = fillGradient;
            ctx.fill();
        }
    }

    // RAM gradient va chizig'i
    const ramGrad = ctx.createLinearGradient(0, 0, 0, h);
    ramGrad.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
    ramGrad.addColorStop(1, 'rgba(168, 85, 247, 0.0)');
    drawLine(state.history.ram, '#a855f7', ramGrad);

    // CPU gradient va chizig'i
    const cpuGrad = ctx.createLinearGradient(0, 0, 0, h);
    cpuGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    cpuGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
    drawLine(state.history.cpu, '#00f0ff', cpuGrad);
}

// ========================================================
// 4. DARS SIMULYATORI VA SSENARIYLAR
// ========================================================
const SCENARIOS = {
    'idle': {
        title: "Oddiy Ofis Rejimi (Tizim Sokin)",
        cpu: 8,
        ram: 35,
        disk: 45,
        temp: 42,
        fan: 1100,
        procs: 110,
        cores: [9, 7, 11, 6, 8, 5, 9, 7],
        explanation: "Kompyuter me'yorida ishlamoqda. Matn muharrirlari yoki brauzerning 1-2 ta varag'i ochiq. Protsessor harorati xavfsiz (42°C), kuller shovqinsiz aylanmoqda. Resurslar zaxirasi yetarli.",
        risk: "0% - Xavf yo'q",
        thermal: "42°C - Sovuq (Trottling xavfi yo'q)",
        fanDesc: "1100 RPM (Deyarli eshitilmaydi)",
        status: "green",
        statusText: "Tizim Barqaror (Optimal Holat)",
        procsList: [
            { pid: 1024, name: "explorer.exe", cpu_percent: 2.1, memory_percent: 4.5 },
            { pid: 2150, name: "word.exe", cpu_percent: 1.8, memory_percent: 6.2 },
            { pid: 3410, name: "system", cpu_percent: 1.2, memory_percent: 2.0 }
        ]
    },
    'cpu-stress': {
        title: "CPU 100% Stress: Cheksiz Sikl / 3D Render / Mining",
        cpu: 99,
        ram: 68,
        disk: 52,
        temp: 94,
        fan: 4800,
        procs: 220,
        cores: [100, 99, 100, 98, 100, 99, 100, 99],
        explanation: "DIQQAT: Barcha CPU yadrolari 100% yuklandi! Dasturchi kodida cheksiz sikl (while True) yuzaga kelgan yoki og'ir render ketmoqda. Harorat 94°C ga yetdi. Protsessor o'zini kuyishdan asrash uchun chastotasini pasaytira boshladi (Termal Trottling)!",
        risk: "95% - Kritik (Termal Trottling)",
        thermal: "94°C - O'TA ISSIQ! (Trottling faol)",
        fanDesc: "4800 RPM (Maksimal shovqin / Reaktiv rejim)",
        status: "red",
        statusText: "KRITIK HOLAT: CPU Overload & Trottling!",
        procsList: [
            { pid: 9999, name: "infinite_loop.py", cpu_percent: 88.5, memory_percent: 12.0 },
            { pid: 4510, name: "blender_render.exe", cpu_percent: 8.2, memory_percent: 24.5 },
            { pid: 1024, name: "system", cpu_percent: 2.3, memory_percent: 3.1 }
        ]
    },
    'mem-leak': {
        title: "Xotira Oqishi (Memory Leak): RAM 98% + Swap Thrashing",
        cpu: 45,
        ram: 98,
        disk: 88,
        temp: 68,
        fan: 2800,
        procs: 340,
        cores: [48, 42, 50, 44, 46, 40, 49, 43],
        explanation: "DIQQAT: Dastur operativ xotirani egallab, bo'shatishni unutgan (Memory Leak). Natijada jismoniy RAM 98% to'ldi va tizim diskdagi Swap (Virtual Memory) ga o'ta boshladi. Disk doimiy o'qish/yozish bilan band bo'lib, butun kompyuter qotib qoldi (Thrashing). Linuxda OOM Killer (Out Of Memory) bu jarayonni o'ldiradi!",
        risk: "90% - Tizim Muzlab Qolishi Xavfi",
        thermal: "68°C - O'rtacha iliq",
        fanDesc: "2800 RPM (O'rtacha shovqin)",
        status: "red",
        statusText: "OGOHLANTIRISH: Xotira To'ldi (OOM Killer xavfi)",
        procsList: [
            { pid: 8812, name: "leaking_service.node", cpu_percent: 14.2, memory_percent: 68.4 },
            { pid: 6120, name: "chrome_tab_leak.exe", cpu_percent: 18.0, memory_percent: 24.1 },
            { pid: 1024, name: "explorer.exe", cpu_percent: 4.5, memory_percent: 4.2 }
        ]
    },
    'disk-full': {
        title: "Disk To'lishi (Disk 99% Qizil): Log Toshishi",
        cpu: 18,
        ram: 42,
        disk: 99,
        temp: 48,
        fan: 1400,
        procs: 135,
        cores: [18, 15, 20, 16, 17, 14, 19, 17],
        explanation: "Disk xotirasi 99% to'ldi! Serverlarda bunday holat ko'pincha nazoratsiz toshib ketgan log fayllar (log explosion) sababli yuzaga keladi. Tizimda yangi fayllarni saqlab bo'lmaydi, ma'lumotlar bazasi yozishni to'xtatadi va yangilanishlar o'rnatilmaydi.",
        risk: "85% - Ma'lumot Yo'qolishi Xavfi",
        thermal: "48°C - Normal",
        fanDesc: "1400 RPM (Sokin)",
        status: "red",
        statusText: "XAVF: Disk To'liq Band (Write Error)",
        procsList: [
            { pid: 4421, name: "system_logger.exe", cpu_percent: 8.5, memory_percent: 5.1 },
            { pid: 1024, name: "sqlservr.exe", cpu_percent: 4.2, memory_percent: 18.5 },
            { pid: 2100, name: "antivirus_scan.exe", cpu_percent: 3.5, memory_percent: 7.2 }
        ]
    },
    'single-thread': {
        title: "Dasturlash Darsi: 1 Yadro vs Ko'p Yadro (Multithreading)",
        cpu: 25, // 8 yadrodan bittasi 100% bo'lsa umumiy yuklanish 12.5 - 25%
        ram: 32,
        disk: 40,
        temp: 58,
        fan: 2100,
        procs: 115,
        cores: [100, 2, 1, 3, 2, 1, 0, 2], // 1-yadro 100%, qolganlari bo'sh!
        explanation: "DARSLIK MISOLI: O'quvchilarga ko'p oqimli (multithreading) dasturlash nega kerakligini ko'rsatuvchi klassik holat! Dastur faqat 1-yadroni 100% yuklab qotmoqda, ammo qolgan 7 ta yadro bekor turibdi. Umumiy CPU atigi 25% ko'rinsa-da, dastur sekin ishlamoqda. Yechim: Python 'multiprocessing' yoki 'concurrent.futures' orqali yuklamani barcha yadrolarga taqsimlash!",
        risk: "30% - Noto'g'ri Resurs Ishlatilishi",
        thermal: "58°C - Yadro #1 qizimoqda",
        fanDesc: "2100 RPM",
        status: "yellow",
        statusText: "Yadro Disbalansi: Multithreading talab etiladi",
        procsList: [
            { pid: 7710, name: "single_thread_app.py", cpu_percent: 98.0, memory_percent: 4.5 },
            { pid: 1024, name: "system", cpu_percent: 1.2, memory_percent: 2.1 }
        ]
    },
    'ddos': {
        title: "Tarmoq Hujumi (DDoS Flood / Portlash)",
        cpu: 75,
        ram: 65,
        disk: 50,
        temp: 74,
        fan: 3400,
        procs: 280,
        cores: [78, 72, 80, 75, 76, 70, 77, 73],
        explanation: "Tarmoq interfeysi daqiqasiga millionlab soxta so'rovlar (SYN flood / UDP packet storm) bilan bombardimon qilinmoqda. Tarmoq o'tkazuvchanligi chegaraga yetdi (1.2 Gbps). Operatsion tizim socket buferlari to'lib, qonuniy foydalanuvchilarning ulanishi uzilmoqda.",
        risk: "80% - Xizmat Ko'rsatish Uzilishi",
        thermal: "74°C - Issiq",
        fanDesc: "3400 RPM (Baland shovqin)",
        status: "red",
        statusText: "XAVF: Tarmoq Bandligi 100% (DDoS Hujumi)",
        procsList: [
            { pid: 5540, name: "nginx_worker", cpu_percent: 42.1, memory_percent: 18.2 },
            { pid: 5541, name: "nginx_worker", cpu_percent: 31.4, memory_percent: 17.8 },
            { pid: 1200, name: "firewall_filter.exe", cpu_percent: 12.0, memory_percent: 6.5 }
        ]
    }
};

function initSimulator() {
    // Ssenariy tugmalari
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const scKey = btn.getAttribute('data-scenario');
            applyScenario(scKey);
        });
    });

    // Slayderlar hodisalari
    const sliderCpu = document.getElementById('sliderCpu');
    const sliderRam = document.getElementById('sliderRam');
    const sliderDisk = document.getElementById('sliderDisk');
    const sliderTemp = document.getElementById('sliderTemp');
    const sliderFan = document.getElementById('sliderFan');
    const sliderProc = document.getElementById('sliderProc');

    sliderCpu.addEventListener('input', (e) => {
        state.simValues.cpu = parseInt(e.target.value);
        document.getElementById('sliderCpuVal').textContent = `${state.simValues.cpu}%`;
        // Yadrolarga taqsimlash
        state.simValues.cores = Array(8).fill(state.simValues.cpu);
        recalcSimulatorCustom();
    });

    sliderRam.addEventListener('input', (e) => {
        state.simValues.ram = parseInt(e.target.value);
        document.getElementById('sliderRamVal').textContent = `${state.simValues.ram}%`;
        recalcSimulatorCustom();
    });

    sliderDisk.addEventListener('input', (e) => {
        state.simValues.disk = parseInt(e.target.value);
        document.getElementById('sliderDiskVal').textContent = `${state.simValues.disk}%`;
        recalcSimulatorCustom();
    });

    sliderTemp.addEventListener('input', (e) => {
        state.simValues.temp = parseInt(e.target.value);
        document.getElementById('sliderTempVal').textContent = `${state.simValues.temp}°C`;
        recalcSimulatorCustom();
    });

    sliderFan.addEventListener('input', (e) => {
        state.simValues.fan = parseInt(e.target.value);
        document.getElementById('sliderFanVal').textContent = `${state.simValues.fan} RPM`;
    });

    sliderProc.addEventListener('input', (e) => {
        state.simValues.procs = parseInt(e.target.value);
        document.getElementById('sliderProcVal').textContent = `${state.simValues.procs} ta`;
    });

    // OS Switcher tugmalari
    const osBtns = document.querySelectorAll('.os-btn');
    osBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            osBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.os = btn.getAttribute('data-os');
            applyOsSwitch(state.os);
        });
    });
}

function applyScenario(key) {
    const sc = SCENARIOS[key];
    if (!sc) return;

    state.simValues.cpu = sc.cpu;
    state.simValues.ram = sc.ram;
    state.simValues.disk = sc.disk;
    state.simValues.temp = sc.temp;
    state.simValues.fan = sc.fan;
    state.simValues.procs = sc.procs;
    state.simValues.cores = sc.cores;

    // Slayderlarni sinxronlashtirish
    document.getElementById('sliderCpu').value = sc.cpu;
    document.getElementById('sliderCpuVal').textContent = `${sc.cpu}%`;

    document.getElementById('sliderRam').value = sc.ram;
    document.getElementById('sliderRamVal').textContent = `${sc.ram}%`;

    document.getElementById('sliderDisk').value = sc.disk;
    document.getElementById('sliderDiskVal').textContent = `${sc.disk}%`;

    document.getElementById('sliderTemp').value = sc.temp;
    document.getElementById('sliderTempVal').textContent = `${sc.temp}°C`;

    document.getElementById('sliderFan').value = sc.fan;
    document.getElementById('sliderFanVal').textContent = `${sc.fan} RPM`;

    document.getElementById('sliderProc').value = sc.procs;
    document.getElementById('sliderProcVal').textContent = `${sc.procs} ta`;

    // Natija matnlarini yangilash
    document.getElementById('simStatusTitle').textContent = sc.statusText;
    document.getElementById('simExplanationText').textContent = sc.explanation;
    document.getElementById('simFanDesc').textContent = sc.fanDesc;
    document.getElementById('simThermalDesc').textContent = sc.thermal;
    document.getElementById('simRiskDesc').textContent = sc.risk;

    const dot = document.getElementById('simStatusDot');
    dot.className = `result-status-dot status-${sc.status}`;

    const resBox = document.getElementById('simResultBox');
    resBox.style.borderLeftColor = sc.status === 'red' ? 'var(--accent-red)' : sc.status === 'yellow' ? 'var(--accent-yellow)' : 'var(--accent-green)';

    if (sc.status === 'red') {
        playAlarmSound('danger');
    }

    updateSimulationUI(sc.procsList);
}

function recalcSimulatorCustom() {
    const { cpu, ram, disk, temp } = state.simValues;
    let status = 'green';
    let title = "Tizim Barqaror (Optimal)";
    let desc = "Kompyuter me'yorida ishlamoqda. CPU va xotira zaxiralari yetarli.";
    let risk = "0% - Xavf yo'q";

    if (cpu >= 90 || temp >= 90 || ram >= 95 || disk >= 95) {
        status = 'red';
        title = "KRITIK HOLAT: Resurslar Chegarada!";
        desc = "Tizim resurslari haddan tashqari to'ldi. Termal trottling yoki xotira yetishmovchiligi sabab dasturlar to'xtab qolishi mumkin.";
        risk = "90%+ - Juda yuqori";
        playAlarmSound('danger');
    } else if (cpu >= 70 || ram >= 80 || disk >= 85 || temp >= 75) {
        status = 'yellow';
        title = "OGOHLANTIRISH: Yuqori Yuklanish";
        desc = "Kompyuter faol ishlamoqda. Kullerlar tezligi oshgan. Tizim resurslarining katta qismi band.";
        risk = "45% - O'rtacha xavf";
    }

    const dot = document.getElementById('simStatusDot');
    dot.className = `result-status-dot status-${status}`;
    document.getElementById('simStatusTitle').textContent = title;
    document.getElementById('simExplanationText').textContent = desc;
    document.getElementById('simRiskDesc').textContent = risk;
    document.getElementById('simThermalDesc').textContent = `${temp}°C (${temp >= 85 ? 'Trottling xavfi!' : 'Normal'})`;
    document.getElementById('simResultBox').style.borderLeftColor = status === 'red' ? 'var(--accent-red)' : status === 'yellow' ? 'var(--accent-yellow)' : 'var(--accent-green)';

    updateSimulationUI();
}

function applyOsSwitch(os) {
    const badge = document.getElementById('osBadgeText');
    const icon = document.querySelector('.os-icon');
    const swapHint = document.getElementById('swapHint');
    const loadAvg = document.getElementById('loadAvgContainer');

    if (os === 'windows') {
        badge.textContent = "Windows 11 Pro";
        icon.textContent = "🪟";
        swapHint.textContent = "Windows: Pagefile.sys";
        loadAvg.style.display = 'none';
        document.getElementById('sysOsName').textContent = "Windows 11 Pro (Build 22631, x64)";
    } else if (os === 'linux') {
        badge.textContent = "Ubuntu 24.04 LTS";
        icon.textContent = "🐧";
        swapHint.textContent = "Linux: /dev/nvme0n1p3 (Swap)";
        loadAvg.style.display = 'flex';
        document.getElementById('loadAvgVal').textContent = `${(state.simValues.cpu / 25).toFixed(2)}, ${(state.simValues.cpu / 30).toFixed(2)}, ${(state.simValues.cpu / 35).toFixed(2)}`;
        document.getElementById('sysOsName').textContent = "Linux 6.8.0-generic (Ubuntu x86_64)";
    } else {
        badge.textContent = "macOS Sonoma";
        icon.textContent = "🍎";
        swapHint.textContent = "macOS: VM Swap (APFS dynamic)";
        loadAvg.style.display = 'flex';
        document.getElementById('loadAvgVal').textContent = `${(state.simValues.cpu / 28).toFixed(2)}, 1.15, 0.90`;
        document.getElementById('sysOsName').textContent = "macOS Sonoma 14.5 (Darwin 23.5.0, Apple Silicon)";
    }

    updateSimulationUI();
}

function updateSimulationUI(customProcs) {
    if (state.mode !== 'simulator') return;

    const v = state.simValues;

    // CPU
    document.getElementById('cpuPercentVal').textContent = `${v.cpu}%`;
    const cpuBar = document.getElementById('cpuProgressBar');
    cpuBar.style.width = `${v.cpu}%`;
    setBarColor(cpuBar, v.cpu);

    document.getElementById('cpuFreqVal').textContent = v.temp >= 90 ? "2400 MHz (Trottled)" : "4200 MHz (Boost)";
    document.getElementById('cpuCoresVal').textContent = "8 fiz / 16 log";
    document.getElementById('cpuTempVal').textContent = `${v.temp}°C`;

    renderCoresGrid(v.cores);

    // RAM
    document.getElementById('ramPercentVal').textContent = `${v.ram}%`;
    const ramBar = document.getElementById('ramProgressBar');
    ramBar.style.width = `${v.ram}%`;
    setBarColor(ramBar, v.ram);

    const usedRam = (16 * (v.ram / 100)).toFixed(1);
    const freeRam = (16 - usedRam).toFixed(1);
    document.getElementById('ramUsedVal').textContent = `${usedRam} GB`;
    document.getElementById('ramFreeVal').textContent = `${freeRam} GB`;
    document.getElementById('ramTotalVal').textContent = "16.0 GB";

    const swapP = v.ram > 85 ? (v.ram - 20) : 10;
    document.getElementById('swapPercentVal').textContent = `${swapP}%`;
    const swapBar = document.getElementById('swapProgressBar');
    swapBar.style.width = `${swapP}%`;
    setBarColor(swapBar, swapP);
    document.getElementById('swapUsedTotal').textContent = `${(8 * (swapP/100)).toFixed(1)} GB / 8.0 GB`;

    // Disk
    let mockDisks = [];
    if (state.os === 'windows') {
        mockDisks = [
            { device: "C:", fstype: "NTFS", mountpoint: "C:\\", percent: v.disk, used_gb: (512 * (v.disk / 100)).toFixed(0), free_gb: (512 * (1 - v.disk / 100)).toFixed(0), total_gb: 512 },
            { device: "D:", fstype: "NTFS", mountpoint: "D:\\", percent: 35, used_gb: 350, free_gb: 650, total_gb: 1000 }
        ];
    } else {
        mockDisks = [
            { device: "/dev/sda2", fstype: "ext4", mountpoint: "/", percent: v.disk, used_gb: (256 * (v.disk / 100)).toFixed(0), free_gb: (256 * (1 - v.disk / 100)).toFixed(0), total_gb: 256 },
            { device: "/dev/sdb1", fstype: "ext4", mountpoint: "/home", percent: 40, used_gb: 400, free_gb: 600, total_gb: 1000 }
        ];
    }
    renderDiskPartitions(mockDisks);

    // Tizim
    document.getElementById('sysProcCount').textContent = `${v.procs} ta`;
    document.getElementById('netRxVal').textContent = v.cpu > 70 && v.fan > 3000 ? "1,240 MB" : "125 MB";
    document.getElementById('netTxVal').textContent = v.cpu > 70 && v.fan > 3000 ? "980 MB" : "45 MB";
    document.getElementById('uptimeVal').textContent = "Simulyator Darsi";

    // Procs
    if (customProcs) {
        renderProcessesTable(customProcs);
    }

    pushHistory(v.cpu, v.ram);
    checkSystemAlerts(v.cpu, v.ram, v.disk, v.temp);
}

function checkSystemAlerts(cpu, ram, disk, temp) {
    const banner = document.getElementById('alertBanner');
    const msg = document.getElementById('alertMessage');

    if (cpu >= 90) {
        banner.classList.remove('hidden');
        msg.textContent = `DIQQAT: CPU yuklanishi kritik darajada (${cpu}%)! Termal trottling xavfi mavjud.`;
    } else if (ram >= 92) {
        banner.classList.remove('hidden');
        msg.textContent = `DIQQAT: Operativ xotira deyarli to'ldi (${ram}%)! Swap ishlatilmoqda, kompyuter sekinlashishi mumkin.`;
    } else if (disk >= 95) {
        banner.classList.remove('hidden');
        msg.textContent = `DIQQAT: Disk xotirasi 95% dan oshdi (${disk}%)! Yangi fayllarni yozish imkonsiz.`;
    } else if (temp >= 85) {
        banner.classList.remove('hidden');
        msg.textContent = `DIQQAT: Protsessor harorati xavfli darajada qizimoqda (${temp}°C)! Kullerlar to'liq quvvatda.`;
    } else {
        banner.classList.add('hidden');
    }
}

// ========================================================
// 5. DARSLIK VIKTORINASI (CLASSROOM QUIZ)
// ========================================================
const QUIZ_QUESTIONS = [
    {
        question: "1. Kompyuterda 'Termal Trottling' (Thermal Throttling) nima sababdan yuzaga keladi?",
        options: [
            "A) RAM xotirasi to'lib ketganda",
            "B) CPU harorati kritik chegaradan (90-100°C) oshganda o'zini kuyishdan asrash uchun chastotasini pasaytirishi",
            "C) Internet tezligi sekinlashganda",
            "D) Diskda yetarli joy qolmaganda"
        ],
        correct: 1,
        explanation: "To'g'ri javob: B. Trottling — protsessor qizib ketganda (odatda 90°C dan oshganda) kuyib ketmaslik uchun soat takt chastotasini majburiy pasaytirishi va natijada sekinlashishidir."
    },
    {
        question: "2. Nega Linux tizimlarida 'Load Average' (masalan: 1.5, 2.0, 1.8) mavjud, lekin Windowsda u ko'rsatilmaydi?",
        options: [
            "A) Chunki Linuxda protsessor yuklanishi o'rniga CPU va Disk navbatidagi barcha jarayonlar soni o'lchanadi",
            "B) Windowsda protsessor yuklanishini hisoblash algoritmi yo'q",
            "C) Linux faqat serverlarda ishlagani uchun",
            "D) Bu faqat grafik interfeysdagi farq, mohiyat bir xil"
        ],
        correct: 0,
        explanation: "To'g'ri javob: A. Unix/Linux Load Average ko'rsatkichi bajarilishini kutayotgan (Run queue) va I/O (disk) kutayotgan faol jarayonlar sonining vaqt bo'yicha o'rtacha qiymatini ifodalaydi."
    },
    {
        question: "3. Dasturda 'Memory Leak' (Xotira oqishi) yuz bersa nima sodir bo'ladi?",
        options: [
            "A) Kompyuter zaryadi tezroq tugaydi",
            "B) Dastur operativ xotirani egallab olib qayta bo'shatmaydi, oxir-oqibat RAM to'lib tizim qotadi",
            "C) CPU bir zumda 0% ga tushib qoladi",
            "D) Ekran o'chib qoladi"
        ],
        correct: 1,
        explanation: "To'g'ri javob: B. Memory Leak — dasturchi xotira ajratib (malloc yoki obyekt yaratib), ish yakunlangach uni bo'shatishni esdan chiqarganda RAM doimiy to'lib borishidir."
    },
    {
        question: "4. Linuxda 'Bo'sh turgan RAM - isrof qilingan RAMdir' (Free RAM is wasted RAM) qoidasi nimani anglatadi?",
        options: [
            "A) Linux barcha RAMni o'chirib tashlaydi",
            "B) Linux bo'sh xotirani disk keshiga (Page Cache) aylantiradi, yangi dastur kelganda uni darhol bo'shatib beradi",
            "C) Linux faqat kamida 64 GB RAMli kompyuterlarda ishlaydi",
            "D) Linuxda swap ishlamaydi"
        ],
        correct: 1,
        explanation: "To'g'ri javob: B. Linux tezkor disk o'qishini ta'minlash uchun bo'sh RAMdan kesh sifatida unumli foydalanadi. Shu sababli 'free' buyrug'ida bo'sh RAM kam ko'rinsa ham, 'available' ko'rsatkichi yuqori bo'ladi."
    },
    {
        question: "5. Bitta oqimli (Single-threaded) og'ir dastur 8 yadroli protsessorda ishlaganda qanday manzara kuzatiladi?",
        options: [
            "A) Barcha 8 ta yadro teng 100% ga to'ladi",
            "B) Faqat 1 ta yadro 100% ga to'ladi, qolgan 7 ta yadro deyarli bekor turadi, umumiy CPU ~12-15% bo'ladi",
            "C) Protsessor portlab ketadi",
            "D) Disk 100% to'ladi"
        ],
        correct: 1,
        explanation: "To'g'ri javob: B. Ko'p yadroli protsessorlarda bitta oqimli dastur faqat 1 ta yadroni yuklay oladi. Dasturchi dasturni tezlashtirish uchun parallel oqimlar (multithreading / multiprocessing) qo'llashi shart."
    },
    {
        question: "6. Operativ xotira (RAM) to'liq to'lganda Linux tizimida qaysi mashhur xizmat ishga tushadi?",
        options: [
            "A) Disk Defragmenter",
            "B) OOM Killer (Out Of Memory Killer) — eng ko'p xotira yeyotgan jarayonni majburiy to'xtatadi",
            "C) Windows Update",
            "D) Safe Mode"
        ],
        correct: 1,
        explanation: "To'g'ri javob: B. Linux yadrosidagi OOM Killer mexanizmi tizim butunlay qulab tushishining oldini olish uchun eng ko'p xotira sarflayotgan aybdor jarayonni majburan 'kill' qiladi."
    }
];

function initQuiz() {
    const container = document.getElementById('quizQuestionsContainer');
    container.innerHTML = '';
    state.quizScore = 0;
    state.answeredQuestions.clear();
    document.getElementById('quizScoreBadge').textContent = `Ball: 0 / ${QUIZ_QUESTIONS.length}`;

    QUIZ_QUESTIONS.forEach((q, qIdx) => {
        const card = document.createElement('div');
        card.className = 'quiz-question-card';
        card.innerHTML = `
            <div class="q-title">${q.question}</div>
            <div class="q-options">
                ${q.options.map((opt, oIdx) => `
                    <button class="q-opt-btn" data-qid="${qIdx}" data-oid="${oIdx}">${opt}</button>
                `).join('')}
            </div>
            <div class="q-feedback" id="feedback-${qIdx}"></div>
        `;
        container.appendChild(card);
    });

    // Variant bosilganda
    container.querySelectorAll('.q-opt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qId = parseInt(btn.getAttribute('data-qid'));
            const oId = parseInt(btn.getAttribute('data-oid'));

            if (state.answeredQuestions.has(qId)) return;
            state.answeredQuestions.add(qId);

            const qData = QUIZ_QUESTIONS[qId];
            const isCorrect = oId === qData.correct;
            const parent = btn.parentElement;
            const allOpts = parent.querySelectorAll('.q-opt-btn');

            allOpts.forEach((b, idx) => {
                b.disabled = true;
                if (idx === qData.correct) {
                    b.classList.add('correct');
                } else if (idx === oId && !isCorrect) {
                    b.classList.add('wrong');
                }
            });

            if (isCorrect) {
                state.quizScore++;
                playAlarmSound('warn');
            }

            document.getElementById('quizScoreBadge').textContent = `Ball: ${state.quizScore} / ${QUIZ_QUESTIONS.length}`;

            const feedback = document.getElementById(`feedback-${qId}`);
            feedback.innerHTML = `
                <strong style="color: ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'}">
                    ${isCorrect ? '✅ To\'g\'ri javob!' : '❌ Noto\'g\'ri javob.'}
                </strong>
                <p style="margin-top: 4px; color: var(--text-secondary);">${qData.explanation}</p>
            `;
            feedback.classList.add('show');
        });
    });

    document.getElementById('btnRestartQuiz').addEventListener('click', initQuiz);
}

// ========================================================
// ASOSIY BOSHLANISH (INIT)
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    initTabsAndModes();
    initSimulator();
    initQuiz();
    drawHistoryChart();

    // Dastlabki so'rov
    fetchLiveMetrics();

    // Har 1 soniyada tsikl
    setInterval(() => {
        if (state.mode === 'live') {
            fetchLiveMetrics();
        } else {
            // Simulyatorda yengil tasodifiy tebranish berish (Jonli tuyulishi uchun)
            const jitter = (Math.random() - 0.5) * 1.5;
            const currentP = Math.max(1, Math.min(100, Math.round(state.simValues.cpu + jitter)));
            pushHistory(currentP, state.simValues.ram);
        }
    }, 1000);
});
