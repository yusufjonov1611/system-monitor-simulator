"""
Kompyuter holatini monitoring qilish va Dars Simulyatori (System Monitor & Simulator)
Python backend server: psutil orqali haqiqiy ko'rsatkichlarni oladi va veb-interfeysga uzatadi.
"""

import http.server
import socketserver
import json
import os
import sys
import time
import platform
import threading
import urllib.parse
from datetime import datetime

# Windows konsolida UTF-8 kodlashni yoqish
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# psutil mavjudligini tekshirish
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = BASE_DIR

# Tizim ishga tushgan vaqt
START_TIME = time.time()

def get_real_system_metrics():
    """Haqiqiy kompyuter ko'rsatkichlarini yig'ish (psutil orqali)"""
    data = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "node": platform.node(),
            "python_version": platform.python_version()
        },
        "cpu": {},
        "memory": {},
        "disk": [],
        "network": {},
        "processes": [],
        "uptime": {}
    }

    if HAS_PSUTIL:
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_cores = psutil.cpu_percent(percpu=True, interval=0.1)
            cpu_freq = psutil.cpu_freq()
            cpu_count_logical = psutil.cpu_count(logical=True)
            cpu_count_physical = psutil.cpu_count(logical=False)
            
            # Linux uchun Load Average (Windowsda yo'q, xavfsiz tekshiriladi)
            load_avg = None
            if hasattr(os, "getloadavg"):
                try:
                    load_avg = [round(x, 2) for x in os.getloadavg()]
                except Exception:
                    load_avg = None

            data["cpu"] = {
                "overall_percent": round(cpu_percent, 1),
                "cores_percent": [round(c, 1) for c in cpu_cores],
                "physical_cores": cpu_count_physical or 1,
                "logical_cores": cpu_count_logical or 1,
                "frequency_current": round(cpu_freq.current, 0) if cpu_freq else 0,
                "frequency_min": round(cpu_freq.min, 0) if (cpu_freq and cpu_freq.min) else 0,
                "frequency_max": round(cpu_freq.max, 0) if (cpu_freq and cpu_freq.max) else 0,
                "load_average": load_avg  # Linux/macOS ga xos ko'rsatkich
            }

            # RAM (Tezkor xotira)
            vmem = psutil.virtual_memory()
            swap = psutil.swap_memory()
            data["memory"] = {
                "total_gb": round(vmem.total / (1024**3), 2),
                "used_gb": round(vmem.used / (1024**3), 2),
                "free_gb": round(vmem.free / (1024**3), 2),
                "available_gb": round(vmem.available / (1024**3), 2),
                "percent": round(vmem.percent, 1),
                "cached_gb": round(getattr(vmem, 'cached', 0) / (1024**3), 2),
                "buffers_gb": round(getattr(vmem, 'buffers', 0) / (1024**3), 2),
                "swap_total_gb": round(swap.total / (1024**3), 2),
                "swap_used_gb": round(swap.used / (1024**3), 2),
                "swap_percent": round(swap.percent, 1)
            }

            # Disklar
            partitions = psutil.disk_partitions(all=False)
            for part in partitions:
                try:
                    # cdrom yoki o'qib bo'lmaydigan disklarni o'tkazib yuborish
                    if 'cdrom' in part.opts or part.fstype == '':
                        continue
                    usage = psutil.disk_usage(part.mountpoint)
                    data["disk"].append({
                        "device": part.device,
                        "mountpoint": part.mountpoint,
                        "fstype": part.fstype,
                        "total_gb": round(usage.total / (1024**3), 2),
                        "used_gb": round(usage.used / (1024**3), 2),
                        "free_gb": round(usage.free / (1024**3), 2),
                        "percent": round(usage.percent, 1)
                    })
                except PermissionError:
                    continue
                except Exception:
                    continue

            # Tarmoq (Network I/O)
            net_io = psutil.net_io_counters()
            data["network"] = {
                "bytes_sent_mb": round(net_io.bytes_sent / (1024**2), 1),
                "bytes_recv_mb": round(net_io.bytes_recv / (1024**2), 1),
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv,
                "errin": net_io.errin,
                "errout": net_io.errout
            }

            # Tizim ish vaqti (Uptime)
            boot_time = psutil.boot_time()
            uptime_seconds = int(time.time() - boot_time)
            hours = uptime_seconds // 3600
            minutes = (uptime_seconds % 3600) // 60
            seconds = uptime_seconds % 60
            data["uptime"] = {
                "boot_time": datetime.fromtimestamp(boot_time).strftime("%Y-%m-%d %H:%M:%S"),
                "uptime_seconds": uptime_seconds,
                "formatted": f"{hours} soat {minutes} daqiqa {seconds} sek"
            }

            # Top 6 ta eng ko'p resurs yeyotgan jarayonlar
            procs = []
            for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    info = p.info
                    if info['name']:
                        procs.append({
                            "pid": info['pid'],
                            "name": info['name'],
                            "cpu_percent": round(info['cpu_percent'] or 0.0, 1),
                            "memory_percent": round(info['memory_percent'] or 0.0, 1)
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # CPU va RAM bo'yicha saralash
            procs.sort(key=lambda x: x['cpu_percent'] + x['memory_percent'], reverse=True)
            data["processes"] = procs[:6]
            data["total_processes_count"] = len(psutil.pids())

        except Exception as e:
            data["error"] = str(e)
    else:
        # Fallback standart kutubxona bilan
        data["note"] = "psutil o'rnatilmagan, asosiy standart ko'rsatkichlar berilmoqda."
        data["cpu"] = {
            "overall_percent": 25.0,
            "cores_percent": [25.0, 20.0, 30.0, 22.0],
            "physical_cores": os.cpu_count() or 4,
            "logical_cores": os.cpu_count() or 4,
            "frequency_current": 2400,
            "frequency_min": 1800,
            "frequency_max": 3200,
            "load_average": [1.2, 0.9, 0.7] if hasattr(os, "getloadavg") else None
        }
        data["memory"] = {
            "total_gb": 16.0,
            "used_gb": 8.0,
            "free_gb": 8.0,
            "available_gb": 8.0,
            "percent": 50.0,
            "cached_gb": 3.0,
            "buffers_gb": 0.5,
            "swap_total_gb": 4.0,
            "swap_used_gb": 1.0,
            "swap_percent": 25.0
        }
        data["disk"] = [{
            "device": "C:" if platform.system() == "Windows" else "/",
            "mountpoint": "C:\\" if platform.system() == "Windows" else "/",
            "fstype": "NTFS" if platform.system() == "Windows" else "ext4",
            "total_gb": 512.0,
            "used_gb": 256.0,
            "free_gb": 256.0,
            "percent": 50.0
        }]
        data["network"] = {
            "bytes_sent_mb": 120.5,
            "bytes_recv_mb": 450.2,
            "packets_sent": 12000,
            "packets_recv": 45000,
            "errin": 0,
            "errout": 0
        }
        data["uptime"] = {
            "boot_time": "Noma'lum",
            "uptime_seconds": 3600,
            "formatted": "1 soat 0 daqiqa"
        }
        data["processes"] = [
            {"pid": 1024, "name": "python.exe", "cpu_percent": 5.2, "memory_percent": 2.1},
            {"pid": 2048, "name": "chrome.exe", "cpu_percent": 12.4, "memory_percent": 8.5},
            {"pid": 3072, "name": "system", "cpu_percent": 3.0, "memory_percent": 1.5}
        ]
        data["total_processes_count"] = 120

    return data


class MonitoringRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Veb server va REST API so'rovlarini boshqaruvchi klass"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/metrics":
            # Haqiqiy tizim ko'rsatkichlarini JSON formatida qaytarish
            metrics = get_real_system_metrics()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            self.wfile.write(json.dumps(metrics).encode("utf-8"))
            return

        if path == "/api/ping":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "has_psutil": HAS_PSUTIL}).encode("utf-8"))
            return

        # Qolgan barcha so'rovlarni (HTML, CSS, JS) static papkadan uzatish
        return super().do_GET()

    def log_message(self, format, *args):
        # Konsol ifloslanmasligi uchun faqat xatoliklarni chiqaramiz
        if "404" in args or "500" in args:
            super().log_message(format, *args)


def start_server(port=PORT):
    """Veb-serverni ishga tushirish"""
    server_address = ("", port)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(server_address, MonitoringRequestHandler) as httpd:
        print("=" * 65)
        print("  🖥️  KOMPYUTER HOLATINI MONITORING QILISH VA DARSLIK SIMULYATOR")
        print("=" * 65)
        print(f"  * Backend: Python {platform.python_version()}")
        psutil_status = "✅ Faol (Real ko'rsatkichlar)" if HAS_PSUTIL else "⚠️ Yo'q (Simulyatsiya rejimi)"
        print(f"  * psutil moduli: {psutil_status}")
        print(f"  * Veb-panel manzili: http://localhost:{port}")
        print(f"  * Dars simulyatori: Veb panel ichida integratsiya qilingan")
        print("=" * 65)
        print("Serverni to'xtatish uchun Ctrl+C bosing.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer muvaffaqiyatli to'xtatildi.")


if __name__ == "__main__":
    port_to_use = PORT
    if len(sys.argv) > 1:
        try:
            port_to_use = int(sys.argv[1])
        except ValueError:
            pass
    start_server(port_to_use)
