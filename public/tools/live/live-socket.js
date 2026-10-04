/*
 * The Live Countdown pages were written for Socket.IO. Since moving into the
 * church website they talk to it instead over a Server-Sent Events stream
 * (/tools/live/api/stream) and POSTs (/tools/live/api/emit). This file gives
 * them the same `io()` / `socket.on()` / `socket.emit()` they always used.
 *
 * Like Socket.IO: events emitted while disconnected wait and go out on
 * reconnect, and events go out in the order they were emitted (one request
 * at a time, sending whatever queued up meanwhile as one batch).
 */
(function () {
    'use strict';

    var API = '/tools/live/api';
    var SERVER_EVENTS = [
        'stateSync', 'templatesSync', 'songLibrarySync', 'sanctuaryOverride',
        'sanctuaryOverrideClear', 'sanctuaryCount', 'audioBlocked'
    ];

    function parse(text) {
        try { return JSON.parse(text); } catch (e) { return undefined; }
    }

    function io(options) {
        var role = (options && options.query && options.query.role) || 'sanctuary';
        var listeners = {};
        var source = null;
        var clientId = null;
        var queue = [];
        var sending = false;
        var stopped = false;
        var reopenTimer = null;

        var socket = {
            connected: false,
            on: function (name, handler) {
                (listeners[name] = listeners[name] || []).push(handler);
                return socket;
            },
            emit: function (name, data) {
                queue.push({ event: name, data: data === undefined ? null : data });
                flush();
                return socket;
            },
            disconnect: function () {
                stopped = true;
                if (source) source.close();
                setConnected(false);
                return socket;
            }
        };

        function fire(name, data) {
            var handlers = (listeners[name] || []).slice();
            for (var i = 0; i < handlers.length; i++) {
                try { handlers[i](data); } catch (e) { console.error(e); }
            }
        }

        function setConnected(value) {
            if (socket.connected === value) return;
            socket.connected = value;
            fire(value ? 'connect' : 'disconnect');
        }

        function reopen(delay) {
            if (stopped || reopenTimer) return;
            reopenTimer = setTimeout(function () { reopenTimer = null; open(); }, delay);
        }

        function open() {
            if (source) source.close();
            clientId = null;
            source = new EventSource(API + '/stream?role=' + encodeURIComponent(role));

            source.addEventListener('hello', function (e) {
                var hello = parse(e.data);
                clientId = hello && hello.id;
                setConnected(true);
                flush();
            });

            source.addEventListener('authError', function (e) {
                stopped = true;
                source.close();
                setConnected(false);
                fire('authError', parse(e.data));
            });

            SERVER_EVENTS.forEach(function (name) {
                source.addEventListener(name, function (e) { fire(name, parse(e.data)); });
            });

            source.onerror = function () {
                clientId = null;
                setConnected(false);
                // The browser retries a dropped stream by itself, but gives up
                // for good on an error page (e.g. while the site redeploys).
                if (source.readyState === 2 /* CLOSED */) reopen(3000);
            };
        }

        function flush() {
            if (sending || !clientId || !queue.length) return;
            var batch = queue.splice(0, queue.length);
            var sentAs = clientId;
            sending = true;
            fetch(API + '/emit', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: sentAs, events: batch })
            }).then(function (res) {
                if (res.status === 409) {
                    // The server no longer knows this connection (it restarted,
                    // or the stream dropped): nothing was applied. Send the same
                    // events again once connected afresh.
                    queue = batch.concat(queue);
                    if (clientId === sentAs) {
                        if (source) source.close();
                        clientId = null;
                        setConnected(false);
                        reopen(250);
                    }
                }
            }, function () {
                // Network failure mid-request: like a Socket.IO emit lost on a
                // dropped connection, it isn't resent (it may have arrived).
            }).then(function () {
                sending = false;
                flush();
            });
        }

        open();
        return socket;
    }

    window.io = io;
})();
