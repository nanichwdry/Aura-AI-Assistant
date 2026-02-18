#!/usr/bin/env node
import OpenAI from 'openai';
import { spawn } from 'child_process';
import { readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logFile = join(__dirname, 'host.log');

function log(msg) {
  appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`);
}

log('Host started');

let config;
try {
  config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'));
  log('Config loaded');
} catch (e) {
  log(`Config error: ${e.message}`);
  process.exit(1);
}

const openai = new OpenAI({ apiKey: config.openaiApiKey });

function readMessage() {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      process.stdin.on('readable', () => {
        let chunk;
        while ((chunk = process.stdin.read()) !== null) {
          chunks.push(chunk);
          if (chunks.length === 1 && chunks[0].length >= 4) {
            const length = chunks[0].readUInt32LE(0);
            const totalLength = 4 + length;
            const buffer = Buffer.concat(chunks);
            if (buffer.length >= totalLength) {
              const message = buffer.slice(4, totalLength).toString();
              resolve(JSON.parse(message));
            }
          }
        }
      });
    } catch (e) {
      log(`Read error: ${e.message}`);
      reject(e);
    }
  });
}

function sendMessage(msg) {
  try {
    const buffer = Buffer.from(JSON.stringify(msg));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(buffer.length, 0);
    process.stdout.write(header);
    process.stdout.write(buffer);
    log(`Sent: ${JSON.stringify(msg).substring(0, 100)}`);
  } catch (e) {
    log(`Send error: ${e.message}`);
  }
}

async function speak(text) {
  return new Promise((resolve) => {
    const ps = spawn('powershell', ['-Command', `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('${text.replace(/'/g, "''")}')`]);
    ps.on('close', resolve);
  });
}

async function handleMessage(msg) {
  try {
    log(`Received: ${JSON.stringify(msg).substring(0, 100)}`);
    if (msg.action === 'explain') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `${msg.question}\n\nContext:\n${msg.context}` }]
      });
      const answer = response.choices[0].message.content;
      log(`Answer: ${answer.substring(0, 50)}...`);
      
      await speak(answer);
      sendMessage({ success: true, answer, spoken: true });
    }
  } catch (error) {
    log(`Error: ${error.message}`);
    sendMessage({ success: false, error: error.message });
  }
}

(async () => {
  try {
    const msg = await readMessage();
    await handleMessage(msg);
  } catch (e) {
    log(`Fatal: ${e.message}`);
  }
})();
