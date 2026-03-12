
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const qrTerminal = require('qrcode-terminal');

const app = express();
app.use(express.json());

let client;
let qrCodeData = null;
let isReady = false;

function initializeClient() {
    console.log('🚀 Initializing WhatsApp Web client...');

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './session'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', async (qr) => {
        console.log('📱 QR Code received');
        qrTerminal.generate(qr, { small: true });

        try {
            qrCodeData = await QRCode.toDataURL(qr, { width: 400 });
            console.log('✅ QR Code generated');
        } catch (err) {
            console.error('❌ QR error:', err);
        }
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp ready!');
        isReady = true;
        qrCodeData = null;
    });

    client.on('disconnected', (reason) => {
        console.log('❌ Disconnected:', reason);
        isReady = false;
        setTimeout(() => client.initialize(), 5000);
    });

    client.initialize();
}

initializeClient();

app.get('/', (req, res) => {
    res.json({ status: isReady ? 'connected' : 'disconnected' });
});

app.get('/status', (req, res) => {
    res.json({ isReady, hasQrCode: !!qrCodeData });
});

app.get('/qr', (req, res) => {
    if (isReady) {
        res.send('<html><body style="text-align:center;padding:50px"><h1 style="color:#4CAF50">✅ WhatsApp Connected!</h1></body></html>');
    } else if (qrCodeData) {
        res.send(`<html><head><meta http-equiv="refresh" content="5"></head><body style="text-align:center;padding:50px"><h1>📱 Scansiona con WhatsApp</h1><img src="${qrCodeData}" style="max-width:400px"/><p><b>1.</b> Apri WhatsApp Business<br><b>2.</b> Dispositivi collegati<br><b>3.</b> Collega dispositivo<br><b>4.</b> Scansiona QR</p></body></html>`);
    } else {
        res.send('<html><head><meta http-equiv="refresh" content="3"></head><body style="text-align:center;padding:50px"><h2>⏳ Inizializzazione...</h2></body></html>');
    }
});

app.post('/send', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message required' });
    }

    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp not ready' });
    }

    try {
        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('39') && formattedPhone.length === 10) {
            formattedPhone = '39' + formattedPhone;
        }

        await client.sendMessage(formattedPhone + '@c.us', message);
        console.log('✅ Message sent to:', formattedPhone);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
