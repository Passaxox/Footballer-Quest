const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const APP_ID = 'com.footballerquest.game';
const SECRET_NAMES = ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'];

function versions(env) {
  const number = Number(env.GITHUB_RUN_NUMBER);
  if (!Number.isSafeInteger(number) || number < 1 || number + 10000 > 2100000000) throw new Error('Invalid Android versionCode');
  if (env.GITHUB_RUN_ATTEMPT !== '1') throw new Error('Start a NEW workflow run (Run workflow), not Re-run jobs, to allocate a new versionCode.');
  return { code: number + 10000, name: `0.2.${number}` };
}

function checkSecrets(env) {
  const missing = SECRET_NAMES.filter(name => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing GitHub Actions Secrets: ${missing.join(', ')}`);
}

function configure(source, version) {
  if (!source.includes(`applicationId "${APP_ID}"`)) throw new Error('Unexpected generated applicationId');
  if (!source.includes(`namespace "${APP_ID}"`)) throw new Error('Unexpected generated namespace');
  for (const [pattern, value] of [
    [/\bversionCode\s+\d+/g, `versionCode ${version.code}`],
    [/\bversionName\s+"[^"]*"/g, `versionName "${version.name}"`],
  ]) {
    if ((source.match(pattern) || []).length !== 1) throw new Error('Unexpected Android version configuration');
    source = source.replace(pattern, value);
  }
  return source;
}

function sign(env, version) {
  checkSecrets(env);
  const temp = fs.mkdtempSync(path.join(env.RUNNER_TEMP, 'android-signing-'));
  const key = path.join(temp, 'release.jks');
  const aligned = path.join(temp, 'aligned.apk');
  const output = path.resolve('../Footballer-Quest-v0.2-balance-release.apk');
  const run = (binary, args) => {
    try { return execFileSync(binary, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch { throw new Error(`${path.basename(binary)} failed; check signing configuration. Tool output suppressed to protect secrets.`); }
  };
  try {
    const base64 = env.ANDROID_KEYSTORE_BASE64.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4) throw new Error('Invalid keystore Base64');
    fs.writeFileSync(key, Buffer.from(base64, 'base64'), { mode: 0o600 });
    const root = path.join(env.ANDROID_HOME || env.ANDROID_SDK_ROOT, 'build-tools');
    const installed = fs.readdirSync(root).filter(v => /^\d+\.\d+\.\d+$/.test(v)).sort((a, b) => {
      const aa = a.split('.').map(Number), bb = b.split('.').map(Number);
      return aa[0] - bb[0] || aa[1] - bb[1] || aa[2] - bb[2];
    });
    if (!installed.length) throw new Error('Android build tools unavailable');
    const tool = name => path.join(root, installed.at(-1), name);
    run(tool('zipalign'), ['-f', '-p', '4', 'android/app/build/outputs/apk/release/app-release-unsigned.apk', aligned]);
    run(tool('apksigner'), ['sign', '--ks', key, '--ks-key-alias', env.ANDROID_KEY_ALIAS,
      '--ks-pass', 'env:ANDROID_KEYSTORE_PASSWORD', '--key-pass', 'env:ANDROID_KEY_PASSWORD', '--out', output, aligned]);
    const verification = run(tool('apksigner'), ['verify', '--verbose', '--print-certs', output]);
    const fingerprint = verification.match(/Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]+)/)?.[1];
    if (!fingerprint || fingerprint.length !== 64) throw new Error('Signing certificate fingerprint unavailable');
    const badging = run(tool('aapt'), ['dump', 'badging', output]);
    const info = badging.match(/package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/);
    if (!info || info[1] !== APP_ID || info[2] !== String(version.code) || info[3] !== version.name || badging.includes('application-debuggable')) {
      throw new Error('Release APK identity/version/debuggable verification failed');
    }
    const metadata = { applicationId: info[1], versionCode: version.code, versionName: version.name, certificateSHA256: fingerprint, commit: env.GITHUB_SHA };
    fs.writeFileSync(path.resolve('../android-release-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    console.log(JSON.stringify(metadata, null, 2));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    const version = versions(process.env);
    switch (process.argv[2]) {
      case 'check': checkSecrets(process.env); break;
      case 'configure': {
        const config = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
        if (config.appId !== APP_ID) throw new Error('Unexpected Capacitor appId');
        if (config.server?.androidScheme !== 'https' || (config.server?.hostname || 'localhost') !== 'localhost' || config.server?.url) {
          throw new Error('WebView origin must remain https://localhost to preserve localStorage');
        }
        const file = 'android/app/build.gradle';
        fs.writeFileSync(file, configure(fs.readFileSync(file, 'utf8'), version));
        break;
      }
      case 'sign': sign(process.env, version); break;
      default: throw new Error('Unknown release command');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { versions, configure, checkSecrets };
