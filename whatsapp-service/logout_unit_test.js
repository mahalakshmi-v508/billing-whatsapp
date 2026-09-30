/**
 * Offline logic checks for the WhatsApp logout / reconnect-suppression fix.
 * No network, no real sessions — uses a throwaway session id.
 */
process.env.SESSION_PATH = './sessions_test';
process.env.LARAVEL_API_KEY = 'test-token';

const path = require('path');
const fs = require('fs');

const WhatsAppManager = require('./src/services/WhatsAppManager');

const SID = 'unit_test_session';
let failures = 0;

function check(label, condition, extra = '') {
    const ok = Boolean(condition);
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' -> ' + extra : ''}`);
}

(async () => {

    const m = new WhatsAppManager();

    // ── 1. logout of a session that was never connected is idempotent ──
    const r1 = await m.logout(SID);
    check('idempotent logout succeeds', r1.logged_out === true);
    check('idempotent logout flagged already', r1.already === true, JSON.stringify(r1));

    // ── 2. it is flagged as a manual logout ──
    check('manual logout flag set', m.isManualLogout(SID) === true);

    // ── 3. implicit client creation (reconnect / restore / watchdog path) is refused ──
    const implicit = await m.createClient(SID);
    check('implicit createClient refused after logout', implicit === null);

    // ── 4. an EXPLICIT connect (new QR scan) is still allowed ──
    //     we only assert the flag was cleared, we do not build a socket
    m.createClient = async () => ({ stub: true });
    await m.createClient(SID, { explicit: true });
    check('explicit connect clears manual-logout flag', m.isManualLogout(SID) === false);
    check('explicit connect allowed', true);

    // re-arm
    await m.logout(SID);
    check('re-logout re-arms the flag', m.isManualLogout(SID) === true);

    // ── 5. a scheduled reconnect backoff timer is cancelled by logout ──
    const SID2 = 'unit_test_session_2';
    m.reconnectTimers.set(SID2, setTimeout(() => {
        m.__fired = true;
    }, 50));
    await m.logout(SID2);
    check('reconnect timer cleared on logout', !m.reconnectTimers.has(SID2));
    await new Promise(r => setTimeout(r, 200));
    check('cancelled reconnect never fired', m.__fired !== true);

    // ── 6. stored creds for a registered device are detected ──
    const SID3 = 'unit_test_session_3';
    const dir = path.join(m.baileysSessionPath(SID3));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
        path.join(dir, 'creds.json'),
        JSON.stringify({ me: { id: '919999999999:1@s.whatsapp.net' }, registered: true }),
        'utf8'
    );
    const creds = m.readStoredCreds(SID3);
    check('registered device detected from creds.json',
        Boolean(creds && creds.me && creds.me.id));

    const r3 = await m.logout(SID3);
    check('logout of stored-but-unsocketed session is NOT a no-op',
        r3.already === false && r3.was_registered === true, JSON.stringify(r3));
    check('creds directory removed after logout',
        !fs.existsSync(m.baileysSessionPath(SID3)));
    check('supervisor does not auto-reconnect after logout',
        m.isManualLogout(SID3) === true);

    // ── 7. a repeated logout stays idempotent (no crash, still success) ──
    const r4 = await m.logout(SID3);
    check('second logout still succeeds', r4.logged_out === true);
    check('second logout flagged already', r4.already === true);

    // ── 8. creds present but NEVER registered -> nothing to unlink ──
    const SID4 = 'unit_test_session_4';
    const dir4 = path.join(m.baileysSessionPath(SID4));
    fs.mkdirSync(dir4, { recursive: true });
    fs.writeFileSync(
        path.join(dir4, 'creds.json'),
        JSON.stringify({ registered: false }),
        'utf8'
    );
    const r5 = await m.logout(SID4);
    check('unregistered creds treated as nothing to unlink',
        r5.already === true, JSON.stringify(r5));
    check('unregistered creds dir still cleaned up',
        !fs.existsSync(m.baileysSessionPath(SID4)));

    // cleanup
    for (const id of [SID, SID2, SID3, SID4]) {
        try { fs.rmSync(m.baileysSessionPath(id), { recursive: true, force: true }); } catch (e) {}
    }
    try { fs.rmSync(path.resolve('./sessions_test'), { recursive: true, force: true }); } catch (e) {}

    process.exit(failures === 0 ? 0 : 1);
})();
