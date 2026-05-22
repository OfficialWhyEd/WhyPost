#!/bin/bash
# WhyPost — setup crontab automatico
# Esegui: bash ~/Documents/WhyPost/setup_cron.sh

WHYPOST_DIR="$HOME/Documents/WhyPost"
PYTHON="$WHYPOST_DIR/venv/bin/python"

echo "WhyPost — configurazione crontab..."
echo "Dir: $WHYPOST_DIR"
echo "Python: $PYTHON"

# Verifica che venv esista
if [ ! -f "$PYTHON" ]; then
    echo "ERRORE: Python venv non trovato in $PYTHON"
    exit 1
fi

# Crea data/logs/ se non esiste
mkdir -p "$WHYPOST_DIR/data/logs"
mkdir -p "$WHYPOST_DIR/data/weekly_reviews"

# Rimuovi eventuali vecchi cron WhyPost
crontab -l 2>/dev/null | grep -v -i "whypost\|WhyPost" | crontab -

# Aggiungi nuovi cron
(crontab -l 2>/dev/null; cat << 'EOF'
# WhyPost — check buffer ogni 2 ore (06:00-22:00)
0 6,8,10,12,14,16,18,20,22 * * * cd $HOME/Documents/WhyPost && $HOME/Documents/WhyPost/venv/bin/python agents/main.py check_buffer >> data/logs/cron.log 2>&1

# WhyPost — EXEL scraping idee ogni mattina alle 7:30
30 7 * * * cd $HOME/Documents/WhyPost && $HOME/Documents/WhyPost/venv/bin/python agents/exel.py >> data/logs/cron.log 2>&1

# WhyPost — Telemetry ogni sera alle 23:00 (metriche post >24h)
0 23 * * * cd $HOME/Documents/WhyPost && $HOME/Documents/WhyPost/venv/bin/python agents/telemetry.py >> data/logs/cron.log 2>&1

# WhyPost — Weekly Review con Opus ogni domenica alle 09:00
0 9 * * 0 cd $HOME/Documents/WhyPost && $HOME/Documents/WhyPost/venv/bin/python agents/opus.py >> data/logs/cron.log 2>&1
EOF
) | crontab -

echo ""
echo "Crontab WhyPost configurato con successo:"
crontab -l | grep -i whypost
