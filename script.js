// --- 0. Initialization & UI Logic ---
let jsPDF;
try {
    if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
    }
} catch (e) {
    console.error("Initialization Error:", e);
}

function setStatus(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

// --- 1. File Converters Logic ---
function setupConverters() {
    console.log("Setting up converters...");
    const saferAddListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
        else console.warn(`Element #${id} not found for ${event} listener.`);
    };

    // PNG to JPG
    saferAddListener('pngInput', 'change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setStatus('pngStatus', '⏳ Converting...');
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "white"; // Background for transparency
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/jpeg', 0.9);
                link.download = `${file.name.split('.')[0]}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setStatus('pngStatus', '✅ Converted!');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // JPG to PDF
    saferAddListener('jpgInput', 'change', async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;

            const quality = document.getElementById('jpgQuality').value / 100;
            setStatus('jpgStatus', `⏳ Processing (Qual: ${Math.round(quality*100)}%)...`);
            
            if (!jsPDF) throw new Error("PDF Library not loaded.");

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        const dataUrl = canvas.toDataURL('image/jpeg', quality);
                        
                        // --- FIX: Match PDF size exactly to image size (no white borders) ---
                        // jsPDF(orientation, unit, format)
                        // orientation: 'p' or 'l', unit: 'px', format: [width, height]
                        const orientation = img.width > img.height ? 'l' : 'p';
                        const pdf = new jsPDF(orientation, 'px', [img.width, img.height]);
                        
                        pdf.addImage(dataUrl, 'JPEG', 0, 0, img.width, img.height);
                        pdf.save(`${file.name.split('.')[0]}.pdf`);
                        setStatus('jpgStatus', '✅ Downloaded!');
                    } catch (innerErr) {
                        alert(`Add Image Error: ${innerErr.message}`);
                        setStatus('jpgStatus', '❌ Failed');
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } catch (err) {
            alert(`Error: ${err.message}`);
            setStatus('jpgStatus', '❌ Error');
        }
    });

    // --- 2. Word to PDF (Premium Quality) ---
    // --- 2. Word to PDF (Premium Quality via Text Extraction) ---
    saferAddListener('wordInput', 'change', async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;

            setStatus('wordStatus', '⏳ Parsing Word...');
            if (typeof mammoth === 'undefined') throw new Error("Mammoth library not loaded.");

            const reader = new FileReader();
            reader.onload = async function(ev) {
                try {
                    const result = await mammoth.extractRawText({arrayBuffer: ev.target.result});
                    const text = result.value || "No text found in document";
                    
                    setStatus('wordStatus', '⏳ Generating PDF...');

                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF('p', 'pt', 'a4');
                    
                    const margin = 40;
                    const pageWidth = doc.internal.pageSize.width;
                    const maxLineWidth = pageWidth - margin * 2;
                    
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "normal");
                    
                    // Split text into lines that fit the page width
                    const lines = doc.splitTextToSize(text, maxLineWidth);
                    let y = margin;
                    const pageHeight = doc.internal.pageSize.height;
                    const lineHeight = 16;
                    
                    for(let i=0; i<lines.length; i++) {
                        if (y > pageHeight - margin) {
                            doc.addPage();
                            y = margin;
                        }
                        doc.text(lines[i], margin, y);
                        y += lineHeight;
                    }

                    doc.save(file.name.replace(".docx", ".pdf"));
                    setStatus('wordStatus', '✅ Downloaded!');
                } catch (procErr) {
                    alert(`Word to PDF Error: ${procErr.message}`);
                    setStatus('wordStatus', '❌ Error');
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            alert(`Error: ${err.message}`);
            setStatus('wordStatus', '❌ Failed');
        }
    });
}

// --- 7. Unit Converter ---
function convertUnit() {
    const val = parseFloat(document.getElementById('unitVal').value);
    const type = document.getElementById('unitType').value;
    const res = document.getElementById('unitResult');
    let output = "";

    if (isNaN(val)) return alert("Please enter a valid number");

    if (type === "ft2m") output = (val * 0.3048).toFixed(2) + " Meters";
    else if (type === "m2ft") output = (val * 3.28084).toFixed(2) + " Feet";
    else if (type === "kg2lb") output = (val * 2.20462).toFixed(2) + " Lbs";
    else if (type === "lb2kg") output = (val * 0.453592).toFixed(2) + " KG";

    res.innerText = output;
    setStatus('unitStatus', '✅ Converted!');
}

// --- 9. YouTube Compact Link Box (FINAL FIX) ---
function loadYTVideo() {
    const urlInput = document.getElementById('ytLink');
    const url = urlInput.value.trim();
    const cinema = document.getElementById('cinema');
    const downloadBtn = document.getElementById('ytDownloadLink');
    const watchOnYT = document.getElementById('watchOnYT');
    
    if (!url) return alert("Please paste a YouTube link!");

    // Universal YouTube Regex
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    const videoId = match ? match[1] : null;

    if (!videoId) {
        setStatus('ytStatus', '❌ Invalid YouTube URL');
        return alert("Invalid YouTube URL.");
    }

    // UPDATE LINKS & SHOW BOX
    downloadBtn.href = `https://en.savefrom.net/7/?url=${encodeURIComponent(url)}`;
    watchOnYT.href = url;

    // Persist URL
    localStorage.setItem('pakportal_yt_url', url);

    // Show Compact Box
    cinema.style.display = "block";
    cinema.scrollIntoView({behavior: "smooth"});
    setStatus('ytStatus', '✅ Downloader Ready!');
}

function closeCinema() {
    document.getElementById('cinema').style.display = "none";
    document.getElementById('ytPlayerContainer').innerHTML = "";
    setStatus('ytStatus', '');
}

// --- Digital Gadgets Logic (Header Phase 4) ---

function updateClock() {
    const clock = document.getElementById('header-clock');
    const dateEl = document.getElementById('header-date');
    if (!clock) return;
    const now = new Date();
    const pakTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).format(now);
    const pakDate = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        day: '2-digit', month: 'short', year: 'numeric'
    }).format(now);
    clock.innerText = pakTime.toUpperCase();
    if (dateEl) dateEl.innerText = pakDate.toUpperCase();
}

async function fetchWeather(city = "Lahore") {
    const tempEl = document.getElementById('weather-temp');
    const cityEl = document.getElementById('weather-city');
    const iconEl = document.getElementById('weather-icon');
    
    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        if (!geoData.results) return;
        
        const { latitude, longitude, name } = geoData.results[0];
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const weatherData = await weatherRes.json();
        
        tempEl.innerText = `${Math.round(weatherData.current_weather.temperature)}°C`;
        cityEl.innerText = name;
        const icons = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 51: "🌦️", 61: "🌧️", 71: "❄️", 95: "⛈️" };
        iconEl.innerText = icons[weatherData.current_weather.weathercode] || "🌤️";
    } catch (err) { console.error(err); }
}

// Global City Autocomplete Logic
function toggleWeatherSearch() {
    const dropdown = document.getElementById('weather-search-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    if (dropdown.style.display === 'block') document.getElementById('city-autocomplete').focus();
}

// Global Search Event
function setupSearch() {
    const searchInput = document.getElementById('city-autocomplete');
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) return;
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`);
                const data = await res.json();
                const resultsBox = document.getElementById('search-results');
                resultsBox.innerHTML = "";
                (data.results || []).forEach(city => {
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.innerText = `${city.name}, ${city.country || ""}`;
                    div.onclick = () => {
                        fetchWeather(city.name);
                        updatePrayerTimes(city.name);
                        document.getElementById('weather-search-dropdown').style.display = 'none';
                        document.getElementById('city-autocomplete').value = "";
                    };
                    resultsBox.appendChild(div);
                });
            } catch (err) { console.error(err); }
        });
    }

    // Close search if clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('weather-search-dropdown');
        const box = dropdown ? dropdown.parentElement : null;
        if (dropdown && box && !box.contains(e.target)) dropdown.style.display = 'none';
    });
}


// --- 4. Photo Resize Tool ---
function setupResizeTool() {
    const input = document.getElementById('resizeInput');
    const width = document.getElementById('resizeWidth');
    if (input) input.addEventListener('change', handleResize);
    if (width) width.addEventListener('change', handleResize);
}

function handleResize() {
    try {
        const file = document.getElementById('resizeInput').files[0];
        if (!file) return;

        const targetWidth = parseInt(document.getElementById('resizeWidth').value);
        setStatus('resizeStatus', `⏳ Resizing...`);
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const scale = targetWidth / img.width;
                canvas.width = targetWidth;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `resized-${file.name}`;
                link.click();
                setStatus('resizeStatus', '✅ Done!');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } catch (err) { console.error(err); }
}

// --- Premium Feature: QR Generator ---
function generateQR() {
    const text = document.getElementById('qrText').value;
    if (!text) {
        setStatus('qrStatus', '❌ Enter text first');
        return;
    }
    setStatus('qrStatus', '⏳ Generating...');
    
    // Using a reliable public QR API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function() {
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = "pakportal-qr.png";
        // Need to fetch and convert to blob for real download in some browsers
        fetch(qrUrl).then(res => res.blob()).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "qr-code.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setStatus('qrStatus', '✅ Downloaded!');
        });
    };
    img.src = qrUrl;
}

// --- Premium Feature: Currency Converter ---
async function convertCurrency() {
    const amount = document.getElementById('currAmount').value;
    const from = document.getElementById('currFrom').value;
    const resultEl = document.getElementById('currResult');
    
    resultEl.innerText = "⏳ Fetching...";
    
    try {
        // Fetch USD base to ensure exact match with Live Hub rates
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        
        const pkrBase = data.rates['PKR'];
        const fromBase = data.rates[from];
        
        // Calculate cross rate identical to the Live Hub
        const rate = pkrBase / fromBase;
        const total = (amount * rate).toFixed(2);
        
        resultEl.innerText = `${total} PKR`;
    } catch (err) {
        resultEl.innerText = "❌ Error fetching rate";
    }
}

// AI Photo Editor - Real-time updates for sliders
let editorImg = new Image();

function setupPhotoEditor() {
    const filters = ['bright', 'contrast', 'saturate', 'hue', 'grayscale', 'sepia', 'blur'];
    filters.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.addEventListener('input', applyFilters);
    });

    const input = document.getElementById('editorInput');
    if (input) {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                editorImg.onload = () => {
                    const canvas = document.getElementById('editorCanvas');
                    const placeholder = document.getElementById('editorPlaceholder');
                    canvas.style.display = "block";
                    placeholder.style.display = "none";
                    applyFilters();
                };
                editorImg.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

function applyFilters() {
    if (!editorImg.src) return;
    const canvas = document.getElementById('editorCanvas');
    const ctx = canvas.getContext('2d');
    
    const b = document.getElementById('bright').value;
    const c = document.getElementById('contrast').value;
    const s = document.getElementById('saturate').value;
    const h = document.getElementById('hue').value;
    const g = document.getElementById('grayscale').value;
    const sep = document.getElementById('sepia').value;
    const bl = document.getElementById('blur').value;
    
    const maxWidth = 500; // Small resolution for "window" feel
    const scale = Math.min(1, maxWidth / editorImg.width);
    canvas.width = editorImg.width * scale;
    canvas.height = editorImg.height * scale;
    
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg) grayscale(${g}%) sepia(${sep}%) blur(${bl}px)`;
    ctx.drawImage(editorImg, 0, 0, canvas.width, canvas.height);
}

function downloadEdit() {
    if (!editorImg.src) return;
    const dlCanvas = document.createElement('canvas');
    const dlCtx = dlCanvas.getContext('2d');
    dlCanvas.width = editorImg.width;
    dlCanvas.height = editorImg.height;
    
    const b = document.getElementById('bright').value;
    const c = document.getElementById('contrast').value;
    const s = document.getElementById('saturate').value;
    const h = document.getElementById('hue').value;
    const g = document.getElementById('grayscale').value;
    const sep = document.getElementById('sepia').value;
    const bl = document.getElementById('blur').value;

    dlCtx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg) grayscale(${g}%) sepia(${sep}%) blur(${bl}px)`;
    dlCtx.drawImage(editorImg, 0, 0);
    
    const link = document.createElement('a');
    link.href = dlCanvas.toDataURL('image/jpeg', 0.95);
    link.download = "premium-edited.jpg";
    link.click();

    // Auto-clear after download
    setTimeout(() => {
        const canvas = document.getElementById('editorCanvas');
        const placeholder = document.getElementById('editorPlaceholder');
        canvas.style.display = "none";
        placeholder.style.display = "block";
        editorImg = new Image(); // Reset image object
    }, 500);
}

// --- 5. PDF Merger (Replaced Resize) ---
function setupPdfMerge() {
    const input = document.getElementById('pdfMergeInput');
    if (input) {
        input.addEventListener('change', async (e) => {
            try {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;
                
                setStatus('pdfMergeStatus', '⏳ Merging PDFs...');
                if (typeof PDFLib === 'undefined') throw new Error("PDF-Lib not loaded.");
                
                const mergedPdf = await PDFLib.PDFDocument.create();
                
                for (let file of files) {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    copiedPages.forEach((page) => mergedPdf.addPage(page));
                }
                
                const pdfBytes = await mergedPdf.save();
                const blob = new Blob([pdfBytes], { type: "application/pdf" });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `Merged_${files.length}_Files.pdf`;
                link.click();
                
                setStatus('pdfMergeStatus', '✅ Merged & Downloaded!');
            } catch (err) {
                alert(`Merge Error: ${err.message}`);
                setStatus('pdfMergeStatus', '❌ Error');
            }
        });
    }
}


// --- 7. Back to Top Logic ---
function setupBackToTop() {
    const btt = document.getElementById('backToTop');
    if (btt) {
        window.onscroll = function() {
            if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) {
                btt.style.display = "flex";
            } else {
                btt.style.display = "none";
            }
        };
        btt.onclick = function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
}

// --- Smart Utilities Gadget Logic ---

// 1. Digital Tasbeeh
function incrementTasbeeh() {
    const el = document.getElementById('tasbeehCount');
    let count = parseInt(el.innerText);
    el.innerText = ++count;
    // Subtle haptic feel if supported
    if (window.navigator.vibrate) window.navigator.vibrate(20);
}

function resetTasbeeh() {
    if (confirm("Reset Tasbeeh count?")) {
        document.getElementById('tasbeehCount').innerText = 0;
    }
}

// 2. Pakistan Prayer Times (Real-Time API Expansion)
const pkCities = [
    "Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Gujranwala", "Peshawar", "Multan", "Hyderabad", "Islamabad", "Quetta",
    "Bahawalpur", "Sargodha", "Sialkot", "Sukkur", "Jhang", "Larkana", "Sheikhupura", "Rahim Yar Khan", "Gujrat", "Sahiwal",
    "Wah Cantonment", "Mardan", "Kasur", "Okara", "Mingora", "Nawabshah", "Chiniot", "Kotri", "Kāmoke", "Hafizabad",
    "Sadiqabad", "Mirpur Khas", "Burewala", "Kohat", "Khanewal", "Dera Ghazi Khan", "Shikarpur", "Muzaffargarh", "Mandi Bahauddin", "Abbottabad",
    "Murree", "Swat", "Muzaffarabad", "Mirpur (AJK)", "Gilgit", "Skardu", "Gwadar", "Turbat", "Khuzdar", "Chaman",
    "Mianwali", "Nowshera", "Attock", "Jhelum", "Dera Ismail Khan", "Jacobabad", "Mansehra", "Haripur", "Parachinar", "Wana"
];

async function updatePrayerTimes(city = "Lahore", isSearching = false) {
    const cityDisplay = document.getElementById('prayer-city-display');
    const listEl = document.getElementById('prayerCityList');
    const searchInput = document.getElementById('prayerCitySearch');
    
    if (!isSearching && cityDisplay) cityDisplay.innerText = city.toUpperCase();

    // Populate City List
    if (listEl) {
        const filter = (searchInput.value || "").toLowerCase();
        listEl.innerHTML = "";
        pkCities.forEach(c => {
            if (filter && !c.toLowerCase().includes(filter)) return;
            const div = document.createElement('div');
            const isActive = c.toLowerCase() === (city || "").toLowerCase();
            div.style.cssText = `padding: 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: #fff; transition: 0.2s; border-radius: 8px; margin-bottom: 2px; ${isActive ? 'background: var(--orange-black-grad); background-size: 400% 400%; animation: rainbow-flow 2.5s linear infinite; color: #fff; font-weight: 800; box-shadow: 0 0 10px rgba(0,0,0,0.5);' : ''}`;
            div.innerText = c;
            if (!isActive) {
                div.onmouseover = () => div.style.background = "rgba(255,255,255,0.1)";
                div.onmouseout = () => div.style.background = "transparent";
            }
            div.onclick = () => {
                // Don't clear search, just update selection
                updatePrayerTimes(c, false);
            };
            listEl.appendChild(div);
        });
        if (listEl.innerHTML === "") listEl.innerHTML = '<div style="font-size: 0.7rem; opacity: 0.5; padding: 10px;">No cities found.</div>';
    }

    if (isSearching) return; // Only update list while searching

    try {
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Pakistan&method=2`);
        const data = await res.json();
        const timings = data.data.timings;

        document.getElementById('fajr').innerText = timings.Fajr;
        document.getElementById('dhuhr').innerText = timings.Dhuhr;
        document.getElementById('asr').innerText = timings.Asr;
        document.getElementById('maghrib').innerText = timings.Maghrib;
        document.getElementById('isha').innerText = timings.Isha;
        
        document.getElementById('prayerTimes').style.animation = 'none';
        setTimeout(() => { document.getElementById('prayerTimes').style.animation = 'glow-pulse 1s ease'; }, 10);
    } catch (err) { console.error(err); }
}

// 5. Urdu Voice-to-Text (Premium Overhaul)
let recognition;
let isListening = false;
let finalTranscript = ""; // Persistent transcript

function startVoiceRecognition() {
    const btn = document.getElementById('voiceBtn');
    const result = document.getElementById('urduTextResult');
    const status = document.getElementById('voiceStatus');
    const wave = document.getElementById('voiceWave');

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        status.innerText = "❌ NOT SUPPORTED";
        return alert("Speech Recognition not supported in this browser.");
    }

    if (isListening) {
        stopVoiceRecognition();
        return;
    }

    // Capture existing text to avoid losing it if user typed or previous session ended
    finalTranscript = result.value;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        btn.innerHTML = 'STOP RECORDING';
        if (wave) wave.style.display = "flex";
        status.innerText = "• LISTENING LIVE •";
        status.style.color = "#ff4444";
        result.style.borderColor = "var(--accent-gold)";
    };

    recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
            } else {
                interimTranscript += transcript;
            }
        }
        result.value = finalTranscript + interimTranscript;
        result.scrollTop = result.scrollHeight;
    };

    recognition.onerror = (event) => {
        stopVoiceRecognition();
        status.innerText = `ERROR: ${event.error.toUpperCase()}`;
    };

    recognition.onend = () => {
        if (isListening) {
            try { recognition.start(); } catch(e) { stopVoiceRecognition(); }
        } else {
            stopVoiceRecognition();
        }
    };

    try {
        recognition.start();
    } catch (e) {
        console.error(e);
        isListening = false;
    }
}

function stopVoiceRecognition() {
    const btn = document.getElementById('voiceBtn');
    const status = document.getElementById('voiceStatus');
    const wave = document.getElementById('voiceWave');
    const result = document.getElementById('urduTextResult');

    isListening = false;
    if (recognition) {
        recognition.onend = null;
        try { recognition.stop(); } catch(e) {}
    }
    
    if (btn) btn.innerHTML = 'START RECORDING';
    if (wave) wave.style.display = "none";
    if (status) {
        status.innerText = "READY TO RECORD";
        status.style.color = "var(--accent-gold)";
    }
    if (result) result.style.borderColor = "rgba(255,193,7,0.3)";
}

function copyUrduText() {
    const text = document.getElementById('urduTextResult');
    text.select();
    document.execCommand('copy');
    alert("Urdu text copied!");
}

// 6. Live Pakistan Hub (Cricket & News) - ZABARDAST REAL-TIME
async function refreshLiveHub() {
    console.log("Syncing Live Hub Data...");
    const pakScore = document.getElementById('pak-score');
    const matchStatus = document.getElementById('match-status');
    const newsTicker = document.getElementById('news-ticker');

    // MOCKING LIVE CRICKET DATA (Simulating March 2026 Series)
    // In a real scenario, this would fetch from a Cricket API
    const scores = ["158/4", "162/4", "165/5", "169/5", "174/5"];
    const currentScore = scores[Math.floor(Math.random() * scores.length)];
    const overs = (18 + Math.random()).toFixed(1);
    
    if(pakScore) {
        pakScore.innerText = currentScore;
        matchStatus.innerText = `${overs} Overs (Babar Azam 84*)`;
        matchStatus.style.animation = 'glow-pulse 0.5s ease';
    }

    // UPDATE NEWS TICKER
    const newsItems = [
        "پاکستان اور نیوزی لینڈ کے درمیان ٹی 20 سیریز کا آج بڑا مقابلہ",
        "عالمی منڈی میں تیل کی قیمتوں میں استحکام، پاکستان میں بھی ریٹ برقرار",
        "پنجاب میں بارشوں کا نیا سلسلہ شروع ہونے کا امکان، الرٹ جاری",
        "پاکستان کرکٹ ٹیم کی تیاریاں عروج پر، میگا ایونٹ کیلئے اسکواڈ فائنل",
        "ڈالر کی قیمت میں معمولی کمی، روپے کی قدر میں استحکام"
    ];
    
    if(newsTicker) {
        newsTicker.innerHTML = newsItems.map(item => `
            <div style="font-family: 'Noto Nastaliq Urdu', serif; direction: rtl; font-size: 0.95rem; line-height: 1.8; color: #fff; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                - ${item}
            </div>
        `).join('');
    }
}



// 6. Live Pakistan Hub (STRICT COLOR & FONT SYNC)
async function refreshLiveHub() {
    console.log("Syncing Hub (Strict Mode)...");
    const newsTicker = document.getElementById('news-ticker');
    const currencyGrid = document.getElementById('currency-grid');

    // 1. URDU NEWS (Noto Nastaliq)
    try {
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.bbc.com/urdu/index.xml');
        const data = await res.json();
        if (data.items) {
            newsTicker.innerHTML = data.items.slice(0, 5).map(item => `
                <div style="font-family: 'Noto Nastaliq Urdu', serif; font-size: 1.1rem; line-height: 2.2; color: var(--text-brown); margin-bottom: 20px; border-bottom: 1px solid rgba(166, 124, 82, 0.1); padding-bottom: 15px; direction: rtl;">
                    • ${item.title} <br>
                    <a href="${item.link}" target="_blank" style="color: var(--accent-gold); text-decoration: none; font-size: 0.8rem; font-weight: 800;">[تفصیلات]</a>
                </div>
            `).join('');
        }
    } catch(e) { newsTicker.innerText = "خبریں لوڈ نہیں ہو سکیں۔"; }

    // 2. CURRENCY GRID (Colors Sync)
    try {
        const cRes = await fetch('https://open.er-api.com/v6/latest/USD');
        const cData = await cRes.json();
        const pkrBase = cData.rates.PKR;
        
        const currencies = [
            { code: 'USD', name: 'US Dollar', icon: '🇺🇸' },
            { code: 'SAR', name: 'Saudi Riyal', icon: '🇸🇦' },
            { code: 'AED', name: 'UAE Dirham', icon: '🇦🇪' },
            { code: 'GBP', name: 'UK Pound', icon: '🇬🇧' },
            { code: 'EUR', name: 'Euro', icon: '🇪🇺' },
            { code: 'KWD', name: 'Kuwaiti Dinar', icon: '🇰🇼' },
            { code: 'OMR', name: 'Omani Rial', icon: '🇴🇲' },
            { code: 'CAD', name: 'Canadian $', icon: '🇨🇦' },
            { code: 'AUD', name: 'Australian $', icon: '🇦🇺' },
            { code: 'JPY', name: 'Japanese Yen', icon: '🇯🇵' }
        ];

        currencyGrid.innerHTML = currencies.map(curr => {
            const rate = (pkrBase / cData.rates[curr.code]).toFixed(2);
            return `
                <div style="background: rgba(166, 124, 82, 0.05); border: 1px solid rgba(166, 124, 82, 0.15); border-radius: 15px; padding: 15px; text-align: center; color: var(--text-brown);">
                    <div style="font-size: 1.4rem; margin-bottom: 8px;">${curr.icon}</div>
                    <div style="font-size: 0.7rem; font-weight: 800; opacity: 0.7; text-transform: uppercase;">${curr.code} TO PKR</div>
                    <div style="font-size: 1.1rem; font-weight: 900; color: var(--text-brown); margin-top: 5px;">Rs ${rate}</div>
                </div>
            `;
        }).join('');
        
    } catch(e) { currencyGrid.innerText = "Market Sync Error."; }
}




// --- PRODUCTIVITY HUB LOGIC ---

// 1. Pomodoro Timer
let pomoInterval = null;
let pomoTime = 25 * 60; // 25 minutes
let pomoActive = false;

function formatPomoTime(secs) {
    let m = Math.floor(secs / 60).toString().padStart(2, '0');
    let s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function startPomodoro() {
    let btn = document.getElementById('pomo-start-btn');
    let display = document.getElementById('pomodoro-time');
    
    if(pomoActive) {
        clearInterval(pomoInterval);
        pomoActive = false;
        btn.innerText = "RESUME";
        display.classList.remove('pulse-anim-on');
        display.classList.add('pulse-anim-off');
        return;
    }
    
    pomoActive = true;
    btn.innerText = "PAUSE";
    display.classList.remove('pulse-anim-off');
    display.classList.add('pulse-anim-on');
    
    pomoInterval = setInterval(() => {
        if(pomoTime > 0) {
            pomoTime--;
            display.innerText = formatPomoTime(pomoTime);
        } else {
            resetPomodoro();
            alert("Focus session complete! 🎉 Take a 5 minute break.");
        }
    }, 1000);
}

function resetPomodoro() {
    clearInterval(pomoInterval);
    pomoActive = false;
    pomoTime = 25 * 60;
    document.getElementById('pomo-start-btn').innerText = "START FOCUS";
    let display = document.getElementById('pomodoro-time');
    display.classList.remove('pulse-anim-on');
    display.classList.add('pulse-anim-off');
    display.innerText = "25:00";
}

// 2. Expense Tracker
let expensesData = [];
function initExpenses() {
    let saved = localStorage.getItem('pakportal_expenses');
    if(saved) {
        expensesData = JSON.parse(saved);
        renderExpenses();
    }
}

function renderExpenses() {
    const listEl = document.getElementById('expense-list');
    if(!listEl) return;
    listEl.innerHTML = '';
    let total = 0;
    expensesData.forEach((exp, idx) => {
        total += Number(exp.amount);
        listEl.innerHTML += `
            <div class="expense-row">
                <span style="flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 5px; color: var(--text-brown);">${exp.desc}</span>
                <span class="urdu-text" style="flex: 1; text-align: right; color: rgba(166,124,82,1); font-weight: 800; font-family: 'Roboto Mono', monospace;">Rs ${exp.amount}</span>
                <button class="exp-del-btn" onclick="deleteExpense(${idx})" style="flex: 0; margin-left: 10px; border-left: 1px solid rgba(0,0,0,0.1); padding-left: 10px;">×</button>
            </div>
        `;
    });
    document.getElementById('expense-total').innerText = "Rs " + total.toLocaleString();
}

function addExpense() {
    let desc = document.getElementById('exp-desc').value.trim();
    let amt = document.getElementById('exp-amount').value.trim();
    if(!desc || !amt || isNaN(amt) || Number(amt) <= 0) return alert("Please enter valid positive number for amount and a description.");
    
    expensesData.push({desc: desc, amount: amt});
    localStorage.setItem('pakportal_expenses', JSON.stringify(expensesData));
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-amount').value = '';
    renderExpenses();
}

function deleteExpense(idx) {
    expensesData.splice(idx, 1);
    localStorage.setItem('pakportal_expenses', JSON.stringify(expensesData));
    renderExpenses();
}

// 3. Digital Journal & Mood Tracker
let journalLines = [];

function loadJournal() {
    let savedMood = localStorage.getItem('pakportal_mood') || '😊';
    setMood(savedMood, false);
    
    let saved = localStorage.getItem('pakportal_journal_lines');
    if(saved) {
        journalLines = JSON.parse(saved);
    } else {
        // Migration from old single-text format if it exists
        let oldText = localStorage.getItem('pakportal_journal');
        if(oldText) {
            journalLines = oldText.split('\n').filter(l => l.trim() !== '');
            localStorage.removeItem('pakportal_journal');
            saveJournalLocal();
        }
    }
    renderJournal();
}

function saveJournalLocal() {
    localStorage.setItem('pakportal_journal_lines', JSON.stringify(journalLines));
}

function handleJournalEnter(e) {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addJournalLine();
    }
}

function addJournalLine() {
    let input = document.getElementById('journal-input');
    if(!input) return;
    let text = input.value.trim();
    if(!text) return;
    
    journalLines.push(text);
    saveJournalLocal();
    input.value = '';
    renderJournal();
    
    let list = document.getElementById('journal-list');
    if(list) list.scrollTop = list.scrollHeight;
    
    showJournalStatus("Added ✓");
}

function renderJournal() {
    let list = document.getElementById('journal-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(journalLines.length === 0) {
        list.innerHTML = `<div style="text-align: center; opacity: 0.5; margin-top: 30px; font-size: 0.9rem;">No notes yet. Type below & press Enter!</div>`;
        return;
    }
    
    journalLines.forEach((line, idx) => {
        list.innerHTML += `
            <div class="journal-item">
                <span style="flex: 1; word-wrap: break-word; margin-right: 15px; font-family: 'Poppins', sans-serif;">${line}</span>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="journal-copy-btn" onclick="copyJournal(${idx}, this)">Copy</button>
                    <button class="exp-del-btn" onclick="deleteJournalLine(${idx})" title="Delete">×</button>
                </div>
            </div>
        `;
    });
}

function copyJournal(idx, btn) {
    let text = journalLines[idx];
    navigator.clipboard.writeText(text).then(() => {
        let oldText = btn.innerText;
        btn.innerText = "✓";
        btn.style.background = "#4CAF50";
        btn.style.color = "#fff";
        btn.style.opacity = "1";
        setTimeout(() => {
            btn.innerText = oldText;
            btn.style.background = "";
            btn.style.color = "";
            btn.style.opacity = "";
        }, 1500);
    });
}

function deleteJournalLine(idx) {
    journalLines.splice(idx, 1);
    saveJournalLocal();
    renderJournal();
}

function clearJournal() {
    if(confirm("Are you sure you want to completely clear ALL your journal notes?")) {
        journalLines = [];
        saveJournalLocal();
        renderJournal();
        showJournalStatus("Cleared!");
    }
}

function showJournalStatus(msg) {
    let status = document.getElementById('journal-status');
    if(!status) return;
    status.innerText = msg;
    status.style.opacity = '1';
    clearTimeout(window.journalStatusTimeout);
    window.journalStatusTimeout = setTimeout(() => {
        status.style.opacity = '0';
    }, 2000);
}

function setMood(moodEmoji, save = true) {
    let btns = document.querySelectorAll('.mood-btn');
    if(btns.length === 0) return;
    
    btns.forEach(btn => {
        btn.classList.remove('active');
        btn.style.opacity = '0.4';
    });
    let activeBtn = document.querySelector(`.mood-btn[data-mood="${moodEmoji}"]`);
    if(activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.opacity = '1';
    }
    if(save) {
        localStorage.setItem('pakportal_mood', moodEmoji);
        showJournalStatus("Mood Saved!");
    }
}
// --- Initialization Updates ---
function init() {
    console.log("PakPortal initializing...");
    try {
        // Start Gadgets
        if (document.getElementById('header-clock')) {
            updateClock();
            setInterval(updateClock, 1000);
        }
        if (document.getElementById('weather-temp')) {
            fetchWeather();
        }
        if (document.getElementById('prayerTimes')) {
            updatePrayerTimes();
        }

        // Setup All Listeners Safely
        setupConverters();
        setupSearch();
        setupResizeTool();
        setupPhotoEditor();
        setupPdfMerge();
        setupBackToTop();
        
        if (document.getElementById('pak-live-hub')) {
            refreshLiveHub();
            setInterval(refreshLiveHub, 60000);
        }
        
        // Initial rates load
        updatePrayerTimes();
        
        // Load custom links
        loadCustomLinks();
        
        // Init Productivity Hub (Local Storage Only)
        initExpenses();
        loadJournal();
        
        // Load persisted values
        const savedYT = localStorage.getItem('pakportal_yt_url');
        if (savedYT && document.getElementById('ytLink')) {
            document.getElementById('ytLink').value = savedYT;
        }

        console.log("Welcome to PakPortal Metro UI");

    } catch (e) {
        console.error("Init Error:", e);
    }
}

// --- 8. Custom Links Persistence ---
function addCustomLink() {
    const nameInput = document.getElementById('customLinkName');
    const urlInput = document.getElementById('customLinkUrl');
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();

    if (!name || !url) return alert("Please enter both name and URL");
    if (!url.startsWith('http')) url = 'https://' + url;

    const links = JSON.parse(localStorage.getItem('pakportal_custom_links') || '[]');
    links.push({ id: Date.now(), name, url });
    localStorage.setItem('pakportal_custom_links', JSON.stringify(links));

    nameInput.value = "";
    urlInput.value = "";
    loadCustomLinks();
}

function deleteCustomLink(id) {
    if (!confirm("Delete this link?")) return;
    let links = JSON.parse(localStorage.getItem('pakportal_custom_links') || '[]');
    links = links.filter(l => l.id !== id);
    localStorage.setItem('pakportal_custom_links', JSON.stringify(links));
    loadCustomLinks();
}

function loadCustomLinks() {
    const list = document.getElementById('customLinksList');
    if (!list) return;
    const links = JSON.parse(localStorage.getItem('pakportal_custom_links') || '[]');

    if (links.length === 0) {
        list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; opacity: 0.5; padding: 20px;">No custom links saved yet.</div>';
        return;
    }

    list.innerHTML = links.map(link => `
        <div class="dashboard-category" style="margin-bottom: 0; padding: 15px; border: 1px solid rgba(166,124,82,0.1); display: flex; flex-direction: column; justify-content: space-between;">
            <div style="margin-bottom: 10px;">
                <h4 style="color: var(--text-brown); font-size: 0.9rem; margin-bottom: 5px;">${link.name}</h4>
                <a href="${link.url}" target="_blank" style="font-size: 0.75rem; color: var(--accent-gold); word-break: break-all; text-decoration: none;">${link.url.replace('https://','').replace('http://','')}</a>
            </div>
            <button onclick="deleteCustomLink(${link.id})" style="background: transparent; color: #ef4444; border: none; font-size: 0.7rem; cursor: pointer; align-self: flex-end; padding: 5px;">Delete</button>
        </div>
    `).join('');
}

// Global Search Event for Prayer Cities
document.addEventListener('DOMContentLoaded', () => {
    const pSearch = document.getElementById('prayerCitySearch');
    if (pSearch) {
        pSearch.addEventListener('input', () => {
            updatePrayerTimes('Lahore', true); // Only filter list
        });
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
