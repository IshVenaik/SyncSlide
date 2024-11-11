// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let isAdmin = false;
let ws = null;

// Connect to WebSocket server
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'pageUpdate' && !isAdmin) {
            pageNum = data.page;
            renderPage(pageNum);
        } else if (data.type === 'adminStatus') {
            isAdmin = data.isAdmin;
            document.getElementById('adminStatus').style.display = isAdmin ? 'block' : 'none';
            updateUIControls();
        }
    };

    ws.onclose = function() {
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
    };
}

// Initialize the connection
connectWebSocket();

// File input handling
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function(e) {
            loadPDF(new Uint8Array(e.target.result));
        };
        reader.readAsArrayBuffer(file);
    }
});

// Load and render PDF
async function loadPDF(data) {
    try {
        pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        renderPage(pageNum);
        updateUIControls();
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try again.');
    }
}

// Render specific page
async function renderPage(num) {
    if (!pdfDoc) return;

    try {
        const page = await pdfDoc.getPage(num);
        const canvas = document.getElementById('pdfViewer');
        const ctx = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        document.getElementById('pageInfo').textContent = `Page: ${num} of ${pdfDoc.numPages}`;
    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

// Navigation handlers
document.getElementById('prevPage').addEventListener('click', () => {
    if (pageNum <= 1 || !isAdmin) return;
    pageNum--;
    renderPage(pageNum);
    ws.send(JSON.stringify({ type: 'pageChange', page: pageNum }));
});

document.getElementById('nextPage').addEventListener('click', () => {
    if (!pdfDoc || pageNum >= pdfDoc.numPages || !isAdmin) return;
    pageNum++;
    renderPage(pageNum);
    ws.send(JSON.stringify({ type: 'pageChange', page: pageNum }));
});

// Update UI controls based on admin status
function updateUIControls() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (!isAdmin) {
        prevBtn.classList.add('disabled');
        nextBtn.classList.add('disabled');
    } else {
        prevBtn.classList.remove('disabled');
        nextBtn.classList.remove('disabled');
    }
}