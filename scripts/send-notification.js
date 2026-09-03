/**
 * CLI para enviar push notification a todos os assinantes.
 *
 * Uso (2 modos):
 *
 *   1) Modo interativo — recomendado no Windows PowerShell:
 *      npm run notify
 *      (o script pergunta titulo, corpo e URL um por vez)
 *
 *   2) Modo direto — argumentos na linha (funciona bem em bash/zsh):
 *      npm run notify -- "Titulo" "Mensagem" [/url-opcional]
 *
 * Requisitos (rodar 1 vez):
 *   1. npm install
 *   2. npm run vapid:gen
 *      Adicionar VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT ao .env.local
 *   3. Baixar chave Firebase Admin como firebase-admin-key.json na raiz
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

// Carrega .env.local primeiro (override), depois .env como fallback
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ override: false });

const KEY_FILE = resolve(process.cwd(), 'firebase-admin-key.json');

// -------------------------------------------------------------------
// Parse dos argumentos (tolerante ao PowerShell que remove aspas)
// -------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
let title = '';
let body = '';
let url = '/';

if (rawArgs.length >= 2) {
  const last = rawArgs[rawArgs.length - 1];
  const looksLikeUrl = last.startsWith('/') || last.startsWith('http');

  if (rawArgs.length === 2) {
    [title, body] = rawArgs;
  } else if (rawArgs.length === 3 && looksLikeUrl) {
    [title, body, url] = rawArgs;
  } else {
    // 3+ argumentos — provavelmente PowerShell removeu as aspas
    // Assume: primeiro token = titulo, resto = corpo (menos URL se presente no final)
    title = rawArgs[0];
    if (looksLikeUrl) {
      body = rawArgs.slice(1, -1).join(' ');
      url = last;
    } else {
      body = rawArgs.slice(1).join(' ');
    }
  }
}

// -------------------------------------------------------------------
// Modo interativo se argumentos ausentes
// -------------------------------------------------------------------
if (!title || !body) {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n📝  Modo interativo — informe os dados da notificação\n');
  if (!title) title = (await rl.question('    Título:                    ')).trim();
  if (!body) body = (await rl.question('    Corpo:                     ')).trim();
  const inputUrl = (
    await rl.question('    URL (Enter para "/"):      ')
  ).trim();
  if (inputUrl) url = inputUrl;
  rl.close();
  console.log('');
}

if (!title || !body) {
  console.error('\n❌ Título e corpo são obrigatórios.\n');
  process.exit(1);
}

// -------------------------------------------------------------------
// Validação de configuração
// -------------------------------------------------------------------
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('\n❌ Chaves VAPID não encontradas em .env.local');
  console.error('   Gere com: npm run vapid:gen');
  console.error('   Adicione VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT\n');
  process.exit(1);
}

if (!existsSync(KEY_FILE)) {
  console.error(`\n❌ Chave do Firebase Admin não encontrada em ${KEY_FILE}`);
  console.error('   Baixe em:');
  console.error(
    '   https://console.firebase.google.com/project/advocacia-479705/settings/serviceaccounts/adminsdk'
  );
  console.error(
    '   → Generate new private key → salvar como firebase-admin-key.json na raiz\n'
  );
  process.exit(1);
}

// -------------------------------------------------------------------
// Load libs & init
// -------------------------------------------------------------------
let adminApp, adminFirestore, webPush;
try {
  adminApp = await import('firebase-admin/app');
  adminFirestore = await import('firebase-admin/firestore');
  webPush = (await import('web-push')).default;
} catch (err) {
  console.error('\n❌ Dependências faltando. Execute:');
  console.error('   npm install\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(KEY_FILE, 'utf8'));

// Le o database ID customizado do mesmo arquivo de config que o frontend usa,
// para bater com o banco onde os dados sao gravados.
let firestoreDbId = null;
const configFile = resolve(process.cwd(), 'firebase-applet-config.json');
if (existsSync(configFile)) {
  try {
    const config = JSON.parse(readFileSync(configFile, 'utf8'));
    if (config.firestoreDatabaseId) firestoreDbId = config.firestoreDatabaseId;
  } catch {}
}
// Override via env var se preferir
if (process.env.FIRESTORE_DATABASE_ID) firestoreDbId = process.env.FIRESTORE_DATABASE_ID;

const app =
  adminApp.getApps().length > 0
    ? adminApp.getApp()
    : adminApp.initializeApp({ credential: adminApp.cert(serviceAccount) });

const db = firestoreDbId
  ? adminFirestore.getFirestore(app, firestoreDbId)
  : adminFirestore.getFirestore(app);

if (firestoreDbId) {
  console.log(`🗄   Firestore: database "${firestoreDbId}"`);
}

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@interafarma.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// -------------------------------------------------------------------
// Fetch subscriptions
// -------------------------------------------------------------------
console.log('📡  Buscando subscriptions no Firestore...');
const snap = await db.collection('push_subscriptions').get();
if (snap.empty) {
  console.log('⚠   Nenhuma subscription cadastrada ainda.');
  console.log('    Peça pra alguém entrar no app e clicar no sino → Ativar notificações.\n');
  process.exit(0);
}
console.log(`✓   ${snap.size} subscription(s) encontrada(s)\n`);

const payload = JSON.stringify({
  title,
  body,
  url,
  tag: `interafarma-${Date.now()}`,
});

console.log(`📨  Enviando: "${title}"`);
console.log(`    Corpo:   "${body}"`);
console.log(`    URL:     ${url}\n`);

// -------------------------------------------------------------------
// Send in parallel
// -------------------------------------------------------------------
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
console.log(`✓   Enviadas com sucesso: ${sent}`);
console.log(`✗   Falharam:             ${failed}`);
if (removed > 0) console.log(`🗑   Subscriptions removidas (inválidas): ${removed}`);
console.log('');

process.exit(0);
