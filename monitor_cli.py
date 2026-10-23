"""
Terminal / Konsol asosidagi Kompyuter Holati Monitoringi (CLI Monitor)
Darsda terminalda ko'rsatish yoki Linux/Windows konsolida ishlatish uchun.
"""

import os
import sys
import time
import platform
from datetime import datetime

# Windows konsolida UTF-8 kodlashni yoqish
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

# ANSI rang kodlari (Konsol chiroyli ko'rinishi uchun)
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"
DIM = "\033[2m"

def make_bar(percent, width=24):
    """Foiz ko'rsatkichini rangli grafik chiziqqa aylantirish"""
    filled = int(width * (percent / 100))
    empty = width - filled
    
    if percent < 60:
        color = GREEN
    elif percent < 85:
        color = YELLOW
    else:
        color = RED
        
    bar = f"{color}{'#' * filled}{DIM}{'-' * empty}{RESET} {color}{percent:5.1f}%{RESET}"
    return bar

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def render_dashboard():
    """Konsol ekranida monitoring panelini chizish"""
    clear_screen()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"{CYAN}{BOLD}+-------------------------------------------------------------------------------+{RESET}")
    print(f"{CYAN}{BOLD}|         KOMPYUTER HOLATINI MONITORING QILISH (CLI DASHBOARD)                  |{RESET}")
    print(f"{CYAN}{BOLD}|         Vaqt: {now_str}  |  OS: {platform.system()} {platform.release():<15}       |{RESET}")
    print(f"{CYAN}{BOLD}+-------------------------------------------------------------------------------+{RESET}\n")

    if not HAS_PSUTIL:
        print(f"{YELLOW}Diqqat: 'psutil' moduli o'rnatilmagan. O'rnatish: pip install psutil{RESET}\n")
        return

    # 1. CPU
    cpu_percent = psutil.cpu_percent(interval=0.2)
    cores = psutil.cpu_percent(percpu=True, interval=0.1)
    freq = psutil.cpu_freq()
    freq_str = f"{freq.current:.0f} MHz" if freq else "N/A"
    
    print(f"{BOLD}📊 CPU (PROTSESSOR) YUKLANISHI:{RESET}")
    print(f"  Umumiy yuklanish: {make_bar(cpu_percent, 28)}  | Chastota: {freq_str} | Yadrolar: {len(cores)}")
    
    # Har bir yadro
    core_lines = []
    for i, c in enumerate(cores):
        core_lines.append(f"Yadro {i+1:02d}: {make_bar(c, 10)}")
    
    # 2 ustun shaklida chiqarish
    for j in range(0, len(core_lines), 2):
        col1 = core_lines[j]
        col2 = core_lines[j+1] if j+1 < len(core_lines) else ""
        print(f"    {col1}    {col2}")

    # Operatsion tizimga xos: Load average
    if hasattr(os, "getloadavg"):
        try:
            lavg = os.getloadavg()
            print(f"  {CYAN}[Linux/macOS xos] Load Average (1m, 5m, 15m): {lavg[0]:.2f}, {lavg[1]:.2f}, {lavg[2]:.2f}{RESET}")
        except Exception:
            pass
    else:
        print(f"  {DIM}[Windows xos] Windowsda 'Load Average' tushunchasi yo'q (uning o'rniga Processor Queue ishlatiladi){RESET}")

    print("\n" + "-" * 75 + "\n")

    # 2. RAM (XOTIRA)
    vmem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    total_gb = vmem.total / (1024**3)
    used_gb = vmem.used / (1024**3)
    free_gb = vmem.free / (1024**3)
    avail_gb = vmem.available / (1024**3)

    print(f"{BOLD}🧠 RAM (TEZKOR XOTIRA) VA SWAP:{RESET}")
    print(f"  RAM ishlatilishi: {make_bar(vmem.percent, 28)}  | Jami: {total_gb:.1f} GB | Ishlatilmoqda: {used_gb:.1f} GB | Bo'sh: {free_gb:.1f} GB")
    print(f"  Swap (Virtual):   {make_bar(swap.percent, 28)}  | Jami: {swap.total/(1024**3):.1f} GB | Ishlatilmoqda: {swap.used/(1024**3):.1f} GB")
    
    # Linux vs Windows kesh farqi
    if hasattr(vmem, 'cached'):
        cached_gb = vmem.cached / (1024**3)
        print(f"  {CYAN}[Kesh]: {cached_gb:.2f} GB (Linuxda 'Cached' xotira kerak bo'lganda tezda bo'shatiladi){RESET}")

    print("\n" + "-" * 75 + "\n")

    # 3. DISK BANDLIGI
    print(f"{BOLD}💾 DISK BO'LIMLARI (PARTITIONS):{RESET}")
    for part in psutil.disk_partitions(all=False):
        if 'cdrom' in part.opts or part.fstype == '':
            continue
        try:
            u = psutil.disk_usage(part.mountpoint)
            t_gb = u.total / (1024**3)
            u_gb = u.used / (1024**3)
            f_gb = u.free / (1024**3)
            print(f"  Bo'lim: {part.device:<10} [{part.fstype:<5}] -> {part.mountpoint}")
            print(f"    Bandlik: {make_bar(u.percent, 24)} | Jami: {t_gb:6.1f} GB | Ishlatildi: {u_gb:6.1f} GB | Bo'sh: {f_gb:6.1f} GB")
        except Exception:
            continue

    print("\n" + "-" * 75 + "\n")

    # 4. TIZIM VA TARMOQ
    net = psutil.net_io_counters()
    pids_count = len(psutil.pids())
    boot_time = datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M")
    
    print(f"{BOLD}⚙️  TIZIM HOLATI VA TARMOQ:{RESET}")
    print(f"  Jarayonlar soni: {BOLD}{pids_count}{RESET} ta faol jarayon  |  Tizim yoqilgan: {boot_time}")
    print(f"  Tarmoq uzatildi (TX): {net.bytes_sent / (1024**2):.1f} MB  |  Tarmoq qabul qilindi (RX): {net.bytes_recv / (1024**2):.1f} MB")

    print(f"\n{DIM}Chiqish uchun Ctrl+C bosing. Yangilanish har 2 soniyada...{RESET}")

def main():
    try:
        while True:
            render_dashboard()
            time.sleep(2)
    except KeyboardInterrupt:
        print(f"\n{GREEN}Monitoring to'xtatildi.{RESET}")

if __name__ == "__main__":
    main()
