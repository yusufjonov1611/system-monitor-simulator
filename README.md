# 🖥️ Kompyuter Holatini Monitoring Qilish & Dars Simulyatori (v2.5)

Informatika va axborot texnologiyalari, operatsion tizimlar arxitekturasi va tizimli dasturlash darslari uchun maxsus ishlab chiqilgan **zamonaviy interaktiv monitoring paneli va laboratoriya simulyatori**.

Ushbu loyiha kompyuterning apparat va dasturiy resurslarini (CPU, RAM, Disk, Tarmoq, Jarayonlar) real vaqtda kuzatish hamda operatsion tizimlar o'rtasidagi farqlarni amaliy ko'rsatish imkonini beradi.

---

## 🎯 Dars Mavzusi: "13. Kompyuter holatini monitoring qilish"

### 📌 Asosiy Ko'rsatkichlar:
1. **CPU (Markaziy protsessor) yuklanishi:**
   * Umumiy yuklanish foizi (`% Processor Time`).
   * Har bir jismoniy va mantiqiy yadro yuklanishi (`Per-core utilization`).
   * Chastota (Current, Boost / Max MHz).
   * Harorat va termal trottling xavfi.
   * **OS bog'liqligi:** Linuxdagi `Load Average (1m, 5m, 15m)` navbati vs Windowsdagi foiz hisoblash farqi.

2. **RAM (Operativ tezkor xotira) ishlatilishi:**
   * Jami, ishlatilayotgan, bo'sh va mavjud xotira (`Total, Used, Free, Available`).
   * Virtual xotira: Windows `Pagefile.sys` vs Linux `Swap Partition / File`.
   * **OS bog'liqligi:** Nega Linuxda `Cached / Buffers` bo'sh xotira hisoblanadi ("Free RAM is wasted RAM" falsafasi)?

3. **Disk xotirasi bandligi:**
   * Disk bo'limlari (Partitions): Windows harflari (`C:\`, `D:\`) vs Linux unifikatsiyalangan VFS ierarxiyasi (`/`, `/home`, `/mnt`).
   * Fayl tizimlari: NTFS, ext4, APFS, FAT32.
   * Disk I/O tezligi (o'qish va yozish MB/s).

4. **Tizim holati va Tarmoq:**
   * OS versiyasi, yadro (kernel), arxitektura (`x86_64`, `ARM64`).
   * Tizimning uzluksiz ish vaqti (`Uptime`).
   * Faol jarayonlar soni va eng ko'p resurs yeyotgan `Top-6 Processes`.
   * Kiruvchi (RX) va chiquvchi (TX) tarmoq trafigi.

---

## 🌟 Simulyator Imkoniyatlari (Dars Rejimi)

O'qituvchi darsda proyektor orqali o'quvchilarga quyidagi **6 ta hayotiy va ekstremal vaziyatni 1 ta bosish bilan** ko'rsatib bera oladi:

1. 🟢 **Oddiy Rejim (Idle / Normal):** CPU ~8%, RAM ~35%, Fan 1100 RPM — kompyuterning sokin ish holati.
2. 🔥 **CPU Stress / Cheksiz Sikl (Infinite Loop / 100% Load):**
   * Dasturchi kodidagi `while True:` xatosi yoki 3D render.
   * Harorat 94°C ga ko'tariladi, kullerlar 4800 RPM ga chiqadi, protsessor chastotani pasaytiradi (**Termal Trottling**).
3. ⚠️ **Xotira Oqishi (Memory Leak / RAM 98%):**
   * Dastur RAMni bo'shatmasligi oqibatida Swap to'ladi, disk sekinlashadi (**Thrashing**).
   * Linuxdagi mashhur **OOM Killer (Out Of Memory Killer)** mexanizmining ishlash sababi.
4. 💾 **Disk To'lishi (Disk 99% Qizil):**
   * Nazoratsiz server loglari yoki yirik fayllar toshishi. Fayl yozish to'xtaydi, xatoliklar beradi.
5. ⚡ **Yadrolar Balansi (Single-thread vs Multi-thread):**
   * 1-yadro 100%, qolgan 7 ta yadro 0% bo'lgan holat.
   * Dasturchilarga parallel dasturlash (`multiprocessing`, `threading`) nega zarurligini isbotlovchi namoyish.
6. 🌐 **Tarmoq Hujumi (DDoS / Flood):**
   * Tarmoq o'tkazuvchanligi 1.2 Gbps ga chiqadi, tizim buferlari to'ladi.

### 🎛️ O'qituvchi Slayderlari:
O'qituvchi CPU %, RAM %, Disk %, Harorat (°C), Kuller RPM va Jarayonlar sonini slayderlar orqali real vaqtda surib, tizimning rangli ogohlantirishlarini (Yashil ➔ Sariq ➔ Qizil) o'quvchilarga ko'rsatishi mumkin.

### 🔍 Operatsion Tizimlar Taqqoslash Paneli:
* 🪟 **Windows 11**
* 🐧 **Ubuntu Linux**
* 🍎 **macOS Sonoma**

### 🎓 Darslik Viktorinasi (6 ta Test):
Dars yakunida o'quvchilar bilimini mustahkamlash uchun interaktiv test (ball hisoblash, to'g'ri/noto'g'ri rangli animatsiya va batafsil tushuntirish bilan).

---

## 🚀 Ishga Tushirish

Loyihada **ikkita qulay interfeys** mavjud:

### 1-usul: Zamonaviy Veb Panel (Tavsiya etiladi)
Eng oson yo'li — `start.bat` faylini ikki marta bosing. U avtomatik tarzda serverni yoqadi va brauzerda ochadi:
```bash
cd D:\Projeckt\system-monitor-simulator
start.bat
```
Yoki terminal orqali:
```bash
.venv\Scripts\python.exe app.py
```
Brauzerda: **`http://localhost:8080`**

### 2-usul: Terminal / Konsol Monitoringi (CLI Dashboard)
Konsolda `top` / `htop` kabi monitoringni ko'rsatish uchun:
```bash
start_cli.bat
```
Yoki:
```bash
.venv\Scripts\python.exe monitor_cli.py
```

---

## 📁 Loyiha Strukturasi

```
D:\Projeckt\system-monitor-simulator\
├── app.py              # Python HTTP server & REST API (psutil orqali)
├── monitor_cli.py      # Terminal / Konsol monitoring paneli (ANSI ranglar)
├── start.bat           # Veb panelni 1-klikda ishga tushirish
├── start_cli.bat       # Konsol monitoringini ishga tushirish
├── static/
│   ├── index.html      # Asosiy Dashboard, Simulyator, OS farqlari, Quiz
│   ├── style.css       # High-Tech Cyber Dark UI dizayni
│   └── app.js          # Jonli grafiklar (Canvas), simulyator logikasi, audio ogohlantirish
├── .venv/              # Python virtual muhiti (psutil o'rnatilgan)
└── README.md           # Ushbu to'liq qo'llanma
```

---

## 💡 Darsda O'qituvchiga Tavsiyalar
1. **10 daqiqa:** Veb panelda "Haqiqiy Tizim" rejimi orqali kompyuteringizning hozirgi holatini o'quvchilarga ko'rsating.
2. **15 daqiqa:** "Dars Simulyatori"ga o'tib, "CPU 100% Stress" va "Single-thread vs Multi-thread" ssenariylarini tushuntiring.
3. **10 daqiqa:** "OS Farqlari" bo'limida Linux `Load Average` va `Swap` tushunchalarini doskada tahlil qiling.
4. **10 daqiqa:** O'quvchilar bilan "Dars Viktorinasi" testini birgalikda yeching.
