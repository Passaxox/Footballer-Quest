const { test } = require('node:test');
const assert = require('node:assert/strict');
const { versions, configure, checkSecrets } = require('./android-release.cjs');

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
