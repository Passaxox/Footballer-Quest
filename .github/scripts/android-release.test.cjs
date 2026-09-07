const { test } = require('node:test');
const assert = require('node:assert/strict');
const { versions, configure, checkSecrets, certificateFingerprint, verifyCertificate } = require('./android-release.cjs');
const { X509Certificate, createHash } = require('node:crypto');
const { rootCertificates } = require('node:tls');

test('new workflow runs increase Android versions, independently of branch', () => {
  const a = versions({ GITHUB_RUN_NUMBER: '13', GITHUB_RUN_ATTEMPT: '1' });
  const b = versions({ GITHUB_RUN_NUMBER: '14', GITHUB_RUN_ATTEMPT: '1' });
  assert.deepEqual(a, { code: 10013, name: '0.2.13' });
  assert.ok(b.code > a.code);
  assert.throws(() => versions({ GITHUB_RUN_NUMBER: '13', GITHUB_RUN_ATTEMPT: '2' }), /NEW workflow/);
  assert.throws(() => versions({ GITHUB_RUN_NUMBER: '2100000000', GITHUB_RUN_ATTEMPT: '1' }), /Invalid/);
});
test('configuration changes versions only and refuses unexpected identity/template', () => {
  const source = 'namespace "com.footballerquest.game"\napplicationId "com.footballerquest.game"\nversionCode 1\nversionName "1.0"';
  assert.equal(configure(source, { code: 10013, name: '0.2.13' }), source.replace('versionCode 1', 'versionCode 10013').replace('"1.0"', '"0.2.13"'));
  assert.throws(() => configure(source.replaceAll('com.footballerquest.game', 'other.app'), {}), /applicationId/);
  assert.throws(() => configure(source + '\nversionCode 2', {}), /configuration/);
});
test('missing secrets fail by name, without displaying supplied values', () => {
  assert.throws(() => checkSecrets({ ANDROID_KEY_ALIAS: 'test-only-placeholder' }), error =>
    error.message.includes('ANDROID_KEYSTORE_BASE64') && !error.message.includes('test-only-placeholder'));
});

test('fingerprint supports apksigner SDK-range labels as well as numbered signers', () => {
  const digest = 'ab'.repeat(32);
  // ApkSignerTool prints SDK-range labels for v3.1, instead of "Signer #1".
  const output = `Verifies
Verified using v3.1 scheme (APK Signature Scheme v3.1): true
Number of signers: 1
Signer (minSdkVersion=33, maxSdkVersion=2147483647) certificate SHA-256 digest: ${digest}
Signer (minSdkVersion=24, maxSdkVersion=32) certificate SHA-256 digest: ${digest}
`;
  assert.equal(certificateFingerprint(output), digest);
  assert.equal(certificateFingerprint(`Signer #1 certificate SHA-256 digest: ${digest}\r\n`), digest);
  assert.equal(certificateFingerprint(output.toUpperCase()), digest);
});

test('fingerprint refuses absent, malformed or different signing certificates without leaking output', () => {
  const digest = 'ab'.repeat(32);
  for (const output of [
    'private-output-placeholder',
    `Signer #1 public key SHA-256 digest: ${digest}`,
    `Source Stamp Signer certificate SHA-256 digest: ${digest}`,
    `Signer #1 certificate SHA-1 digest: ${'ab'.repeat(20)}`,
    `Signer #1 certificate SHA-256 digest: ${digest}ff`,
    `Signer #1 certificate SHA-256 digest: short`,
    `Signer #1 certificate SHA-256 digest: ${digest}\nSigner #2 certificate SHA-256 digest: ${'cd'.repeat(32)}`,
  ]) {
    assert.throws(() => certificateFingerprint(output), error =>
      /Signing certificate fingerprint/.test(error.message) && !error.message.includes(output));
  }
});

test('certificate digest fixtures ignore headings and normalize hex separators and case', () => {
  const digest = '0123456789abcdef'.repeat(4);
  const colonHex = digest.toUpperCase().match(/../g).join(':');
  const fixtures = [
    `Verifies\nCertificate SHA-256 digest: ${digest}\n`,
    `Verified using v3 scheme (APK Signature Scheme v3): true\nCertificate #1 SHA-256 certificate digest: ${colonHex}\r\n`,
    `Custom heading: SHA256 certificate digest: ${colonHex.replaceAll(':', ' : ')}\n`,
    `  CERTIFICATE   SHA-256   DIGEST: ${digest.match(/../g).join(' ')}\n`,
    `Signer certificate SHA-256 digest: ${digest}\nAnother certificate SHA-256 digest: ${colonHex}\n`,
  ];
  for (const fixture of fixtures) assert.equal(certificateFingerprint(fixture), digest);
  for (const malformed of [digest.slice(2), digest + '00', digest + 'ZZ', digest.replace('a', 'g')]) {
    assert.throws(() => certificateFingerprint(`SHA-256 certificate digest: ${malformed}`), /malformed/);
  }
  assert.throws(() => certificateFingerprint(`Certificate SHA-256 digest: ${digest}\nSHA-256 certificate digest: ${'ff'.repeat(32)}`), /multiple certificates/);
});

test('APK digest must match exported X509 certificate, independent of keytool text/locale', () => {
  // Public CA fixture bundled with Node, never a generated private key or keystore.
  const pem = rootCertificates[0];
  const der = new X509Certificate(pem).raw;
  const expected = createHash('sha256').update(der).digest('hex');
  // keytool -exportcert outputs binary DER; -rfc outputs PEM. Neither needs text parsing.
  for (const exported of [der, pem, pem.replaceAll('\n', '\r\n')]) {
    assert.equal(verifyCertificate(`SHA-256 certificate digest: ${expected}`, exported), expected);
  }
  assert.throws(() => verifyCertificate(`Certificate SHA-256 digest: ${expected}`, new X509Certificate(rootCertificates[1]).raw), /APK certificate mismatch/);
  for (const invalid of ['Certificato memorizzato nel file', 'Certificate stored in file', Buffer.from([0, 1, 2])]) {
    assert.throws(() => verifyCertificate(`Certificate SHA-256 digest: ${expected}`, invalid), /Invalid exported keystore certificate/);
  }
});

// Capacitor 8 android-template/app/build.gradle + editProjectSettingsAndroid:
// https://github.com/ionic-team/capacitor/blob/8.0.0/cli/src/android/common.ts
test('Capacitor 8 generated namespace assignment configures versions without changing identity', () => {
  const source = `apply plugin: 'com.android.application'
android {
    namespace = "com.footballerquest.game"
    compileSdk = rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.footballerquest.game"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
    }
}
`;
  const expected = source.replace('versionCode 1', 'versionCode 10014').replace('versionName "1.0"', 'versionName "0.2.14"');
  assert.equal(configure(source, versions({ GITHUB_RUN_NUMBER: '14', GITHUB_RUN_ATTEMPT: '1' })), expected);
  assert.equal(configure(source.replaceAll('\n', '\r\n'), { code: 10014, name: '0.2.14' }), expected.replaceAll('\n', '\r\n'));
  for (const declaration of ['namespace="com.footballerquest.game"', "namespace = 'com.footballerquest.game'", 'namespace\t "com.footballerquest.game"']) {
    const variant = source.replace('namespace = "com.footballerquest.game"', declaration);
    assert.ok(configure(variant, { code: 10014, name: '0.2.14' }).includes(declaration));
  }
  for (const declaration of ['', 'namespace = "other.app"', '// namespace = "com.footballerquest.game"', 'namespace = "com.footballerquest.game.extra"', 'namespace = "com.footballerquest.game"\nnamespace = "other.app"']) {
    assert.throws(() => configure(source.replace('namespace = "com.footballerquest.game"', declaration), { code: 10014, name: '0.2.14' }), /namespace/);
  }
});
