/**
 * CLI para enviar push notification a todos os assinantes.
 *
 * Uso:
 *   npm run notify "Titulo curto" "Mensagem detalhada" [url opcional]
 *
 * Exemplos:
 *   npm run notify "Nova versao v1.1" "Adicionada aba de Ajuste Pediatrico"
 *   npm run notify "Alerta Anvisa" "Nova restricao para Metformina" "/interacoes/metformina"
 *
 * Requisitos (executar 1 vez):
 *   1. npm install --save web-push
 *      npm install --save-dev firebase-admin
 *   2. Gerar chaves VAPID:
 *      npx web-push generate-vapid-keys
 *      Salvar em .env.local:
 *        VAPID_PUBLIC_KEY=...
 *        VAPID_PRIVATE_KEY=...
 *        VAPID_SUBJECT=mailto:seu@email.com
 *        VITE_VAPID_PUBLIC_KEY=... (mesma chave publica; exposta ao frontend)
 *   3. Baixar chave do Firebase Admin:
 *      https://console.firebase.google.com/project/advocacia-479705/settings/serviceaccounts/adminsdk
 *      → Generate new private key → salvar como firebase-admin-key.json na raiz
 *      (ja esta no .gitignore, nao vai pro repo)
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const KEY_FILE = resolve(process.cwd(), 'firebase-admin-key.json');
const [, , title, body, url] = process.argv;

if (!title || !body) {
  console.error('\n❌ Uso: npm run notify "Titulo" "Mensagem" [url opcional]\n');
  process.exit(1);
}

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('\n❌ Chaves VAPID nao encontradas em .env.local');
  console.error('   Gere com: npx web-push generate-vapid-keys');
  console.error('   Adicione VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT ao .env.local\n');
  process.exit(1);
}

if (!existsSync(KEY_FILE)) {
  console.error(`\n❌ Chave do Firebase Admin nao encontrada em ${KEY_FILE}`);
  console.error('   Baixe em:');
  console.error('   https://console.firebase.google.com/project/advocacia-479705/settings/serviceaccounts/adminsdk');
  console.error('   → Generate new private key → salvar como firebase-admin-key.json na raiz\n');
  process.exit(1);
}

// Imports dinamicos para o script nao quebrar caso as libs ainda nao estejam instaladas
let admin, webPush;
try {
  admin = (await import('firebase-admin')).default;
  webPush = (await import('web-push')).default;
} catch (err) {
  console.error('\n❌ Dependencias faltando. Instale com:');
  console.error('   npm install --save web-push');
  console.error('   npm install --save-dev firebase-admin\n');
  process.exit(1);
}

// Init Firebase Admin
const serviceAccount = JSON.parse(readFileSync(KEY_FILE, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const dbId = process.env.FIRESTORE_DATABASE_ID;
const db = dbId ? admin.firestore().databaseId ? admin.firestore(dbId) : admin.firestore() : admin.firestore();

// Configure web-push
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@interafarma.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Fetch subscriptions
console.log('📡 Buscando subscriptions no Firestore…');
const snap = await db.collection('push_subscriptions').get();
if (snap.empty) {
  console.log('⚠  Nenhuma subscription cadastrada ainda.\n');
  process.exit(0);
}
console.log(`✓ ${snap.size} subscription(s) encontrada(s)\n`);

// Payload
const payload = JSON.stringify({
  title,
  body,
  url: url || '/',
  tag: `interafarma-${Date.now()}`,
});

console.log(`📨 Enviando: "${title}"`);
console.log(`   Corpo:   "${body}"`);
console.log(`   URL:     ${url || '/'}\n`);

// Send in parallel with reporting
let sent = 0;
let failed = 0;
let removed = 0;

await Promise.all(
  snap.docs.map(async (doc) => {
    const sub = doc.data();
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
      sent++;
      process.stdout.write('.');
    } catch (err) {
      failed++;
      const code = err.statusCode || 0;
      // 404 = endpoint inexistente | 410 = subscription expirada
      if (code === 404 || code === 410) {
        try {
          await doc.ref.delete();
          removed++;
        } catch {}
      }
      process.stdout.write('x');
    }
  })
);

console.log('\n');
console.log(`✓ Enviadas com sucesso: ${sent}`);
console.log(`✗ Falharam:             ${failed}`);
if (removed > 0) console.log(`🗑  Subscriptions removidas (invalidas): ${removed}`);
console.log('');

process.exit(0);
