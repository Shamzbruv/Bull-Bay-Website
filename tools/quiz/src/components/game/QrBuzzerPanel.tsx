import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, X } from 'lucide-react';
import { buzzerJoinPath, buzzerRelayAvailable } from '../../lib/realtime/buzzerChannel';

export function QrBuzzerPanel({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}${buzzerJoinPath(gameId)}` : '';

  useEffect(() => {
    if (!open || !joinUrl) return;
    QRCode.toDataURL(joinUrl, { width: 320, margin: 1, color: { dark: '#031B4E', light: '#FFFFFF' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [open, joinUrl]);

  return (
    <>
      <button
        onClick={() => buzzerRelayAvailable && setOpen(true)}
        disabled={!buzzerRelayAvailable}
        className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur disabled:opacity-30 disabled:cursor-not-allowed"
        title={buzzerRelayAvailable ? 'Phone Buzzers — show QR code' : 'Phone buzzers need Supabase set up first (see README)'}
      >
        <QrCode size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center text-bb-deep space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">Scan to Buzz In</h3>
              <button onClick={() => setOpen(false)} className="text-bb-navy/40 hover:text-bb-navy">
                <X size={20} />
              </button>
            </div>
            {dataUrl ? (
              <img src={dataUrl} alt="Buzzer join QR code" className="mx-auto rounded-2xl border border-bb-navy/10" />
            ) : (
              <div className="h-[320px] flex items-center justify-center text-bb-navy/40">Generating…</div>
            )}
            <p className="text-xs text-bb-navy/50 break-all">{joinUrl}</p>
            <p className="text-xs text-bb-navy/40">Each phone picks its team once, then taps BUZZ when the answer window opens.</p>
          </div>
        </div>
      )}
    </>
  );
}
