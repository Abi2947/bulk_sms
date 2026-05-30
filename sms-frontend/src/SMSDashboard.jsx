import { useState, useEffect, useRef } from "react";

const API_URL = "http://localhost:3000/send-sms";

const PREFIX_MAP = {
  "984": "NTC",  "985": "NTC",  "986": "NTC",  "974": "NTC",
  "980": "Ncell","981": "Ncell","982": "Ncell",
  "961": "Smart Telecom","962": "Smart Telecom","988": "Smart Telecom",
  "972": "UTL",
  "963": "Sky/Hello Mobile",
};
const SORTED_PREFIXES = Object.keys(PREFIX_MAP).sort((a, b) => b.length - a.length);

const NET_STYLES = {
  NTC:               { bg: "#E6F1FB", bgDark: "#0C447C22", color: "#0C447C", colorDark: "#85B7EB", dot: "#378ADD" },
  Ncell:             { bg: "#EAF3DE", bgDark: "#27500A22", color: "#27500A", colorDark: "#97C459", dot: "#639922" },
  "Smart Telecom":   { bg: "#FAEEDA", bgDark: "#63380622", color: "#633806", colorDark: "#FAC775", dot: "#BA7517" },
  UTL:               { bg: "#EEEDFE", bgDark: "#3C348922", color: "#3C3489", colorDark: "#AFA9EC", dot: "#7F77DD" },
  "Sky/Hello Mobile":{ bg: "#FBEAF0", bgDark: "#72243E22", color: "#72243E", colorDark: "#ED93B1", dot: "#D4537E" },
};

// Theme tokens
const T = {
  light: {
    pageBg:      "#F7F6F3",
    cardBg:      "#ffffff",
    cardBorder:  "#ebebeb",
    statBg:      "#ffffff",
    inputBg:     "#ffffff",
    inputBorder: "#e0e0e0",
    inputFocus:  "#1a1a1a",
    itemBg:      "#FAFAF9",
    itemBorder:  "#f0eeeb",
    text:        "#1a1a1a",
    textMuted:   "#888888",
    textHint:    "#bbbbbb",
    btnActive:   "#1a1a1a",
    btnActiveTxt:"#ffffff",
    btnDis:      "#f0f0f0",
    btnDisTxt:   "#bbbbbb",
    toastBg:     "#ffffff",
    toastBorder: "#e0e0e0",
    toastText:   "#1a1a1a",
    scrollThumb: "#d0cec8",
    toggleBg:    "#e8e6e2",
    toggleKnob:  "#ffffff",
    toggleIcon:  "#666",
  },
  dark: {
    pageBg:      "#111111",
    cardBg:      "#1c1c1c",
    cardBorder:  "#2e2e2e",
    statBg:      "#1c1c1c",
    inputBg:     "#252525",
    inputBorder: "#333333",
    inputFocus:  "#ffffff",
    itemBg:      "#222222",
    itemBorder:  "#2e2e2e",
    text:        "#f0f0f0",
    textMuted:   "#888888",
    textHint:    "#444444",
    btnActive:   "#f0f0f0",
    btnActiveTxt:"#111111",
    btnDis:      "#252525",
    btnDisTxt:   "#444444",
    toastBg:     "#1c1c1c",
    toastBorder: "#333333",
    toastText:   "#f0f0f0",
    scrollThumb: "#333333",
    toggleBg:    "#333333",
    toggleKnob:  "#111111",
    toggleIcon:  "#aaaaaa",
  },
};

function normalise(n) {
  const d = n.replace(/[\s\-()+]/g, "");
  if (/^977(\d{10})$/.test(d)) return d.slice(3);
  return d;
}
function detectNetwork(raw) {
  const n = normalise(raw.trim());
  if (!/^\d+$/.test(n) || n.length !== 10) return null;
  for (const p of SORTED_PREFIXES) if (n.startsWith(p)) return PREFIX_MAP[p];
  return null;
}

function NetBadge({ network, dark }) {
  if (!network) return null;
  const s = NET_STYLES[network] || { bg: "#F1EFE8", bgDark: "#33332222", color: "#5F5E5A", colorDark: "#aaa", dot: "#888" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12,
      fontWeight: 600, padding: "3px 10px", borderRadius: 6,
      background: dark ? s.bgDark : s.bg,
      color: dark ? s.colorDark : s.color,
      letterSpacing: "0.01em", transition: "background 0.3s, color 0.3s" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {network}
    </span>
  );
}

function StatusDot({ status }) {
  const colors  = { pending: "#EF9F27", processing: "#378ADD", sent: "#639922", failed: "#E24B4A" };
  const labels  = { pending: "Pending", processing: "Sending…", sent: "Sent", failed: "Failed" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 500, color: colors[status] || "#888", whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors[status],
        display: "inline-block",
        animation: status === "processing" ? "pulseDot 1.4s ease-in-out infinite" : "none" }} />
      {labels[status]}
    </span>
  );
}

function ThemeToggle({ dark, onToggle, t }) {
  return (
    <button onClick={onToggle} aria-label="Toggle dark mode"
      style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px",
        background: t.toggleBg, border: "none", borderRadius: 20,
        cursor: "pointer", transition: "background 0.3s", flexShrink: 0 }}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>{dark ? "☀️" : "🌙"}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, transition: "color 0.3s" }}>
        {dark ? "Light" : "Dark"}
      </span>
    </button>
  );
}

function Toast({ toast, t }) {
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: isErr ? (toast.dark ? "#2a1010" : "#FCEBEB") : t.toastBg,
      border: `1px solid ${isErr ? "#F09595" : t.toastBorder}`,
      borderRadius: 12, padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, fontWeight: 500,
      color: isErr ? "#E24B4A" : t.toastText,
      zIndex: 9999, whiteSpace: "nowrap",
      animation: "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      transition: "background 0.3s, color 0.3s, border-color 0.3s",
    }}>
      <span style={{ fontSize: 15 }}>{isErr ? "✗" : "✓"}</span>
      {toast.message}
    </div>
  );
}

export default function SMSDashboard() {
  const [dark, setDark]         = useState(false);
  const [phone, setPhone]       = useState("");
  const [message, setMessage]   = useState("");
  const [network, setNetwork]   = useState(null);
  const [phoneErr, setPhoneErr] = useState("");
  const [msgErr, setMsgErr]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [queue, setQueue]       = useState([]);
  const [toast, setToast]       = useState(null);
  const toastTimer = useRef(null);

  const t = dark ? T.dark : T.light;

  // Persist preference
  useEffect(() => {
    const saved = localStorage.getItem("sms-theme");
    if (saved === "dark") setDark(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("sms-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    setNetwork(phone.trim().length > 0 ? detectNetwork(phone) : null);
    if (phoneErr) setPhoneErr("");
  }, [phone]);
  useEffect(() => { if (msgErr) setMsgErr(""); }, [message]);

  function showToast(message, type = "success") {
    clearTimeout(toastTimer.current);
    setToast({ message, type, dark });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  async function handleSend() {
    let ok = true;
    if (!phone.trim() || !network) {
      setPhoneErr(!phone.trim() ? "Phone number is required" : "Unrecognised Nepali number prefix");
      ok = false;
    }
    if (!message.trim()) { setMsgErr("Message cannot be empty"); ok = false; }
    if (!ok) return;

    setLoading(true);
    const jobId = Date.now();
    setQueue(q => [{ id: jobId, number: normalise(phone), message: message.trim(), network, status: "processing" }, ...q]);

    try {
      const res  = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone.trim(), message: message.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setQueue(q => q.map(j => j.id === jobId ? { ...j, status: "failed" } : j));
        showToast(data.errors?.join(", ") || data.error || "Something went wrong", "error");
      } else {
        setQueue(q => q.map(j => j.id === jobId
          ? { ...j, status: "pending", jobId: data.job_id, position: data.queue_position } : j));
        showToast(`Queued · ${data.detected_network} · job #${data.job_id}`);
        setPhone(""); setMessage(""); setNetwork(null);
      }
    } catch {
      setQueue(q => q.map(j => j.id === jobId ? { ...j, status: "failed" } : j));
      showToast("Cannot reach server. Is it running?", "error");
    } finally {
      setLoading(false);
    }
  }

  const total   = queue.length;
  const pending = queue.filter(j => j.status === "pending" || j.status === "processing").length;
  const failed  = queue.filter(j => j.status === "failed").length;
  const charLen = message.length;
  const canSend = !loading && phone.trim().length > 0 && network && message.trim().length > 0;

  const card  = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: "1.5rem", transition: "background 0.3s, border-color 0.3s" };
  const input = { width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8,
    color: t.text, background: t.inputBg, transition: "background 0.3s, color 0.3s, border-color 0.15s",
    fontFamily: "'DM Mono', monospace" };

  return (
    <div style={{ minHeight: "100vh", background: t.pageBg, fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      padding: "2.5rem 1rem", transition: "background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input, textarea { outline: none; font-family: inherit; }
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes toastIn  { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes slideDown{ from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { border-radius: 99px; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: dark ? "#f0f0f0" : "#1a1a1a",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}>
              <svg width="16" height="16" fill="none" stroke={dark ? "#111" : "#fff"} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 600, color: t.text, margin: 0,
                letterSpacing: "-0.02em", transition: "color 0.3s" }}>SMS Queue</h1>
              <p style={{ fontSize: 12, color: t.textMuted, margin: 0, transition: "color 0.3s" }}>
                Nepal mobile networks · NestSMS powered
              </p>
            </div>
          </div>
          <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} t={t} />
        </div>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Total queued", value: total },
            { label: "Pending",      value: pending },
            { label: "Failed",       value: failed, warn: failed > 0 },
          ].map(s => (
            <div key={s.label} style={{ background: t.statBg, border: `1px solid ${t.cardBorder}`,
              borderRadius: 10, padding: "14px 16px", transition: "background 0.3s, border-color 0.3s" }}>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, transition: "color 0.3s" }}>
                {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em",
                color: s.warn ? "#E24B4A" : t.text, transition: "color 0.3s" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Compose ── */}
        <div style={{ ...card, marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: t.text, margin: "0 0 1.25rem",
            textTransform: "uppercase", letterSpacing: "0.07em", transition: "color 0.3s" }}>
            Compose
          </p>

          {/* Phone */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500,
              color: t.textMuted, marginBottom: 6, transition: "color 0.3s" }}>
              Phone number
            </label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && document.getElementById("sms-msg-area").focus()}
              placeholder="98XXXXXXXX or +977 98XXXXXXXX"
              style={{ ...input, border: `1px solid ${phoneErr ? "#E24B4A" : t.inputBorder}` }}
            />
            {network && <div style={{ marginTop: 8 }}><NetBadge network={network} dark={dark} /></div>}
            {phoneErr && <p style={{ fontSize: 12, color: "#E24B4A", margin: "6px 0 0" }}>{phoneErr}</p>}
          </div>

          {/* Message */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500,
              color: t.textMuted, marginBottom: 6, transition: "color 0.3s" }}>
              Message
            </label>
            <textarea id="sms-msg-area" value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Type your message…" rows={4}
              style={{ ...input, border: `1px solid ${msgErr ? "#E24B4A" : t.inputBorder}`,
                fontFamily: "'DM Sans',sans-serif", resize: "vertical", lineHeight: 1.6 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
              {msgErr
                ? <p style={{ fontSize: 12, color: "#E24B4A", margin: 0 }}>{msgErr}</p>
                : <span />}
              <span style={{ fontSize: 11, color: charLen > 160 ? "#E24B4A" : t.textHint,
                fontFamily: "'DM Mono',monospace", marginLeft: "auto", transition: "color 0.3s" }}>
                {charLen}/160
              </span>
            </div>
          </div>

          {/* Send button */}
          <button onClick={handleSend} disabled={!canSend}
            style={{ width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 600,
              background: canSend ? t.btnActive : t.btnDis,
              color: canSend ? t.btnActiveTxt : t.btnDisTxt,
              border: "none", borderRadius: 8, cursor: canSend ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.2s, color 0.2s, transform 0.1s",
              letterSpacing: "0.01em", fontFamily: "'DM Sans',sans-serif" }}
            onMouseDown={e => { if (canSend) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}>
            {loading ? (
              <>
                <span style={{ width: 13, height: 13, border: `2px solid ${t.btnActiveTxt}44`,
                  borderTopColor: t.btnActiveTxt, borderRadius: "50%",
                  animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                Queuing…
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send SMS
              </>
            )}
          </button>
        </div>

        {/* ── Queue ── */}
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: t.text, margin: "0 0 1rem",
            textTransform: "uppercase", letterSpacing: "0.07em", transition: "color 0.3s" }}>
            Queue{" "}
            {queue.length > 0 && (
              <span style={{ fontWeight: 400, color: t.textMuted, textTransform: "none",
                letterSpacing: 0, fontSize: 12, marginLeft: 4 }}>
                {queue.length} {queue.length === 1 ? "item" : "items"}
              </span>
            )}
          </p>

          {queue.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: t.textHint, transition: "color 0.3s" }}>
              <svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5"
                viewBox="0 0 24 24" style={{ display: "block", margin: "0 auto 10px", opacity: 0.4 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p style={{ fontSize: 13, margin: 0 }}>No messages queued yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {queue.map((job, i) => (
                <div key={job.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center", gap: 12, padding: "10px 14px",
                  background: t.itemBg, border: `1px solid ${t.itemBorder}`, borderRadius: 9,
                  animation: i === 0 ? "slideDown 0.25s ease" : "none",
                  transition: "background 0.3s, border-color 0.3s" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: t.text,
                      fontFamily: "'DM Mono',monospace", marginBottom: 4, transition: "color 0.3s" }}>
                      {job.number}
                    </div>
                    <NetBadge network={job.network} dark={dark} />
                  </div>
                  <div style={{ fontSize: 13, color: t.textMuted, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.3s" }}>
                    {job.message}
                  </div>
                  <StatusDot status={job.status} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <Toast toast={toast} t={t} />
    </div>
  );
}
