/**
 * bbb-siscom-mvp
 * 
 * Entrypoint that initializes whatsapp-web.js and connects it to the cloud Database (Supabase).
 */
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// ==========================================
// 1. SUPABASE SETUP
// ==========================================
// The user provided the Anon Public Key and the URL.
// IMPORTANT: For a backend script, we usually want the Service Role Key to bypass RLS, 
// but since this is an MVP we will use the Anon Key. Ensure your Supabase `messages` table 
// has Row Level Security (RLS) disabled or has an insert policy for anon users!
const supabaseUrl = process.env.SUPABASE_URL || 'https://fndygyeuzrprvdwjfvrz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_1l9dZeqlehxG7S3NgofjBg_bho0TEh7';
const supabase = createClient(supabaseUrl, supabaseKey);


// ==========================================
// 2. EXPRESS HEALTHCHECK (For Render Port Binding)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('BBB SISCOM MVP is running 🚀. WhatsApp is ' + (client.info ? 'Connected' : 'Waiting for QR Code'));
});

app.listen(PORT, () => {
    console.log(`[SYS] Server running on port ${PORT}`);
});


// ==========================================
// 3. WHATSAPP CLIENT SETUP
// ==========================================
const puppeteer = require('puppeteer');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bbb-siscom-mvp" }),
    // Important for running on cloud environments (Render/Railway)
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process'
        ]
    }
});

// Generate QR Code via URL instead of terminal
client.on('qr', (qr) => {
    console.log('\n=========================================');
    console.log('🤖 ESCANEAR QR CODE PARA CONECTAR WHATSAPP');
    console.log('=========================================\n');
    console.log('Abra este link no seu navegador para ver o QR Code:');

    // Using quickchart.io to generate a clean, scannable QR Code image URL
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=300`;
    console.log(`👉 ${qrUrl}\n`);
    console.log('=========================================\n');
});

client.on('ready', () => {
    console.log('\n✅ BBeautyBrazil: Dispositivo WhatsApp Conectado com Sucesso!');
    console.log(`📱 Número: ${client.info.wid.user}\n`);
});

/**
 * Handle incoming messages
 */
client.on('message', async (msg) => {
    await processMessage(msg, 'incoming');
});

/**
 * Handle outgoing messages (sent by you or your team)
 */
client.on('message_create', async (msg) => {
    // message_create catches BOTH incoming and outgoing. 
    // We only process it here if it's from YOU (outgoing), to avoid duplicates with 'message' event.
    if (msg.fromMe) {
        await processMessage(msg, 'outgoing');
    }
});


/**
 * Helper to process and push to Supabase
 */
async function processMessage(msg, direction) {
    try {
        const chat = await msg.getChat();
        const contact = await msg.getContact();

        // 1. Extract Core Data
        const data = {
            whatsapp_id: msg.id.id,
            timestamp: new Date(msg.timestamp * 1000).toISOString(),
            direction: direction, // 'incoming' or 'outgoing'
            sender_name: contact.name || contact.pushname || 'Desconhecido',
            sender_number: contact.number || msg.from.split('@')[0],
            chat_name: chat.name || 'Desconhecido',
            chat_number: chat.id.user,
            is_group: chat.isGroup,
            message_type: msg.type, // 'chat', 'audio', 'image', 'video', 'document', 'ptt' (voice note)
            text_content: msg.body || null,
        };

        console.log(`[${direction.toUpperCase()}] ${data.sender_name} -> ${data.chat_name}: ${data.message_type === 'chat' ? data.text_content : '[' + data.message_type + ']'}`);

        // 2. Insert into Supabase
        const { error } = await supabase
            .from('messages')
            .insert([data]);

        if (error) {
            console.error('❌ Error saving to Supabase:', error.message);
        }

    } catch (err) {
        console.error('❌ Error processing message:', err.message);
    }
}

// Start the client
client.initialize();
