import React, { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function DeleteStorePanel({ sb, user, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (isAdmin) return null;

  function close() {
    if (busy) return;
    setOpen(false); setStep(1); setPassword(""); setError("");
  }

  async function verifyPassword(event) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true); setError("");
    try {
      const result = await sb.auth.signInWithPassword({ email: user.email, password });
      if (result.error || result.data?.user?.id !== user.id) {
        setError("Hesab şifrəsi yanlışdır. Yenidən yoxla.");
        return;
      }
      setStep(2);
    } catch (err) {
      setError(err?.message || "Şifrə yoxlanılmadı.");
    } finally { setBusy(false); }
  }

  async function deleteStore(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await sb.functions.invoke("delete-store-account", {
        body: { password, confirmed: true },
      });
      if (result.error || !result.data?.success) {
        let message = result.error?.message || "Mağazanı silmək mümkün olmadı.";
        try {
          const response = result.error?.context;
          if (response && typeof response.json === "function") {
            const details = await response.json();
            if (details?.error) message = details.error;
          }
        } catch {}
        setError(message);
        return;
      }
      await sb.auth.signOut({ scope: "local" });
      window.location.replace("/");
    } catch (err) {
      setError(err?.message || "Mağazanı silmək mümkün olmadı.");
    } finally { setBusy(false); }
  }

  return <>
    <section className="panel settings password-panel delete-store-panel">
      <div className="settings-heading">
        <span className="settings-icon"><Trash2 size={20} /></span>
        <div><h2>Mağazanı sil</h2><p>Mağaza hesabını və ona aid məlumatları birdəfəlik sil.</p></div>
      </div>
      <p className="settings-foot">Bu əməliyyat mağazanın məhsullarını, sifarişlərini, satışlarını, anbar və maliyyə qeydlərini, şəkillərini və hesab məlumatlarını silir. Silinmiş məlumatları geri qaytarmaq mümkün deyil.</p>
      <button type="button" className="outline danger-outline" onClick={() => { setOpen(true); setStep(1); setError(""); }}>
        <Trash2 size={16} /> Mağazanı sil
      </button>
    </section>
    {open && <div className="shade" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-store-title">
        <header><b id="delete-store-title">{step === 1 ? "Şifrə ilə təsdiqlə" : "Mağazanı birdəfəlik sil"}</b>
          <button type="button" onClick={close} disabled={busy} aria-label="Bağla"><X /></button>
        </header>
        <form className="formmodal cancel-form" onSubmit={step === 1 ? verifyPassword : deleteStore}>
          {step === 1 ? <>
            <p>Mağazanı silmək üçün hesabının cari şifrəsini daxil et.</p>
            <label>Hesab şifrəsi<input type="password" autoFocus autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Cari hesab şifrəsi" /></label>
            <div className="cancel-form-actions">
              <button type="button" className="outline" onClick={close} disabled={busy}>İmtina</button>
              <button className="primary" disabled={busy || !password}>{busy ? "Yoxlanılır..." : "Şifrəni yoxla"}</button>
            </div>
          </> : <>
            <div className="cancel-confirm-card">
              <b><AlertTriangle size={17} /> Bu əməliyyat geri qaytarılmır!</b>
              <span>{user.email}</span>
              <small>Mağazanın bütün məlumatları və şəkilləri birdəfəlik silinəcək. Hesabdan çıxış ediləcək və bu hesabla yenidən daxil olmaq mümkün olmayacaq.</small>
            </div>
            <div className="cancel-form-actions">
              <button type="button" className="outline" onClick={() => { setStep(1); setError(""); }} disabled={busy}>Geri qayıt</button>
              <button className="primary cancel-submit" style={{ background: "#c62828", borderColor: "#c62828" }} disabled={busy}>{busy ? "Silinir..." : "Mağazanı birdəfəlik sil"}</button>
            </div>
          </>}
          {error && <div className="error" role="alert">{error}</div>}
        </form>
      </section>
    </div>}
  </>;
}