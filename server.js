// BLEK.ROOM — Сигнальный сервер
// Использует WebSocket для обмена SDP и ICE-кандидатами

const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const server = new WebSocket.Server({ port: PORT });

// Хранилище подключённых клиентов
const clients = new Map(); // ws -> clientId
const clientsById = new Map(); // clientId -> ws

console.log(`🔌 Сигнальный сервер запущен на порту ${PORT}`);

server.on('connection', (ws) => {
    let clientId = null;

    ws.on('message', (rawMessage) => {
        try {
            const message = JSON.parse(rawMessage);

            if (message.type === 'init') {
                // Регистрация клиента
                clientId = message.clientId;
                clients.set(ws, clientId);
                clientsById.set(clientId, ws);
                console.log(`✅ Клиент зарегистрирован: ${clientId}`);
                
                // Отправляем подтверждение
                ws.send(JSON.stringify({ type: 'init', status: 'ok' }));
            } 
            else if (message.type === 'signal') {
                // Пересылка сигнала целевому клиенту
                const targetWs = clientsById.get(message.target);
                if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(JSON.stringify({
                        type: 'signal',
                        from: clientId,
                        data: message.data
                    }));
                    console.log(`📡 Сигнал от ${clientId} к ${message.target}`);
                } else {
                    console.log(`❌ Целевой клиент не найден: ${message.target}`);
                }
            }
        } catch (err) {
            console.error('Ошибка обработки сообщения:', err);
        }
    });

    ws.on('close', () => {
        if (clientId) {
            clients.delete(ws);
            clientsById.delete(clientId);
            console.log(`❌ Клиент отключился: ${clientId}`);
        }
    });

    ws.on('error', (err) => {
        console.error(`Ошибка WebSocket для клиента ${clientId}:`, err);
    });
});
