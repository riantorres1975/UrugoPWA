'use client';

import { useState, useRef, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowUp, ArrowUpRight, Check, ChevronDown, Clock, Compass, Copy, Flag, MapPin, Plus, Square, Wallet, X } from 'lucide-react';
import ChatBotIcon from '@/components/ChatBotIcon';
import { safeChatHref, type ChatAnswer } from '@/lib/chat-types';
import { isWithinUruapanServiceArea } from '@/lib/geo';
import './chatbot.css';

const ISSUE_URL = 'https://github.com/riantorres1975/rutasuruapanpwa/issues/new';
const REPORT_EMAIL = 'contacto@urugo.app';
const subscribeHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const getMobileSnapshot = () => window.matchMedia('(max-width: 767px)').matches;
const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia('(max-width: 767px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};

// Preguntas de arranque: enseñan qué puede responder el bot con un tap.
const SUGGESTED_QUESTIONS = [
  { question: '¿Qué puedo visitar en Uruapan?', title: 'Explorar Uruapan', description: 'Naturaleza, cultura y comida', Icon: Compass },
  { question: '¿Cómo llego al Parque Nacional?', title: 'Planear mi viaje', description: 'Ejemplo: al Parque Nacional', Icon: MapPin },
  { question: '¿Cuánto cuesta el pasaje?', title: 'Tarifas y pagos', description: 'Pasajes y tarjeta de movilidad', Icon: Wallet },
  { question: '¿Hasta qué hora pasa la Ruta 11?', title: 'Consultar horarios', description: 'Ejemplo: frecuencia de la Ruta 11', Icon: Clock },
] as const;

type Message = { role: 'user' | 'bot'; text: string; error?: boolean } & Omit<ChatAnswer, 'reply'>;
type UserLocation = { lat: number; lng: number } | null;
type View = 'chat' | 'report';

export default function ChatBot({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<UserLocation>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [locNotice, setLocNotice] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyNotice, setCopyNotice] = useState('');
  const locationTime = useRef(0);
  const locationRequest = useRef(0);
  const pendingRequest = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const sending = useRef(false);
  const [desktopStyle, setDesktopStyle] = useState<React.CSSProperties>({});
  const mounted = useSyncExternalStore(subscribeHydration, getClientSnapshot, getServerSnapshot);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerSnapshot);
  // Altura en px del sheet cuando el teclado reduce el viewport visual
  // (fallback para navegadores que panean en vez de redimensionar, ej. iOS).
  const [keyboardViewport, setKeyboardViewport] = useState<{ height: number; bottom: number } | null>(null);

  // Reporte
  const [reportRoute, setReportRoute] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportCorrect, setReportCorrect] = useState('');

  const reportSubject = reportRoute.trim()
    ? `Reporte asistente UruGo: ${reportRoute.trim()}`
    : 'Reporte asistente UruGo';

  const reportBodyText = [
    'Tipo de problema:',
    'Error en asistente de chat',
    '',
    'Ruta relacionada:',
    reportRoute.trim() || 'No especificada',
    '',
    'Qué dijo mal el bot:',
    reportError.trim() || 'No especificado',
    '',
    'Información correcta:',
    reportCorrect.trim() || 'No especificada',
  ].join('\n');

  const emailHref = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(reportSubject)}&body=${encodeURIComponent(reportBodyText)}`;

  const issueHref = useMemo(() => {
    const title = `[Asistente] ${reportRoute.trim() || 'Error en respuesta del bot'}`;
    const body = [
      '## Tipo de problema',
      'Error en asistente de chat',
      '',
      '## Ruta relacionada',
      reportRoute.trim() || 'No especificada',
      '',
      '## Qué dijo mal el bot',
      reportError.trim() || 'No especificado',
      '',
      '## Información correcta',
      reportCorrect.trim() || 'No especificada',
    ].join('\n');
    return `${ISSUE_URL}?${new URLSearchParams({ title, body, labels: 'bug,asistente' }).toString()}`;
  }, [reportRoute, reportError, reportCorrect]);

  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Bloquear scroll del body cuando el chat está abierto en mobile
  useEffect(() => {
    if (!mounted || !open || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open, isMobile, mounted]);

  // Teclado en mobile: si el navegador panea en vez de redimensionar (iOS),
  // ajustar la altura del sheet al viewport visual para que el header no
  // se salga de la pantalla mientras se escribe.
  useEffect(() => {
    if (!open || !isMobile) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // El teclado está abierto si el viewport visual es bastante más chico
      // que el de layout (si el layout ya se encogió, no hace falta ajustar).
      const keyboardOpen = vv.height < window.innerHeight - 80;
      setKeyboardViewport(keyboardOpen ? { height: Math.round(vv.height), bottom: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) } : null);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [open, isMobile]);

  // Click fuera para cerrar (solo desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open, isMobile]);

  const calcDesktopStyle = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const useAbove = rect.top > below;
    const width = Math.min(420, window.innerWidth - 24);
    setDesktopStyle({
      ...(useAbove ? { bottom: window.innerHeight - rect.top + 10 } : { top: rect.bottom + 10 }),
      left: Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12),
      width,
      height: Math.min(700, (useAbove ? rect.top : below) - 22),
      maxHeight: window.innerHeight - 24,
    });
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    calcDesktopStyle();
    window.addEventListener('resize', calcDesktopStyle);
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => { clearTimeout(timer); window.removeEventListener('resize', calcDesktopStyle); };
  }, [open, isMobile, calcDesktopStyle]);

  // Focus the dialog without opening the mobile keyboard.
  useEffect(() => {
    if (open && isMobile) panelRef.current?.focus({ preventScroll: true });
  }, [open, isMobile]);

  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 112)}px`;
  }, [input, open, view]);

  useEffect(() => {
    if (open && messages.length > 0) {
      const target = messages.at(-1)?.role === 'bot' ? lastMessageRef.current : bottomRef.current;
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const requestLocation = useCallback(() => {
    const id = ++locationRequest.current;
    setLocNotice('Consultando ubicación…');
    if (!navigator.geolocation) { setLocStatus('denied'); setLocNotice('Puedes escribir tu origen o elegirlo en el mapa.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (id !== locationRequest.current) return;
        if (pos.coords.accuracy > 250 || !isWithinUruapanServiceArea([pos.coords.longitude, pos.coords.latitude])) {
          setLocation(null); setLocStatus('denied'); setLocNotice('La ubicación no es suficientemente precisa o está fuera de la zona. Elige tu origen en el mapa.'); return;
        }
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
        locationTime.current = Date.now();
        setLocNotice('');
        setLocStatus('granted');
      },
      () => { if (id !== locationRequest.current) return; setLocation(null); setLocStatus('denied'); setLocNotice('No pude obtener tu ubicación. Puedes escribir desde dónde sales.'); },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => () => { requestId.current++; locationRequest.current++; pendingRequest.current?.abort(); }, []);
  useEffect(() => {
    if (!location) return;
    const timer = setTimeout(() => {
      setLocation(null); setLocStatus('idle'); setLocNotice('La ubicación caducó. Compártela otra vez o escribe tu origen.');
    }, Math.max(0, 5 * 60000 - (Date.now() - locationTime.current)));
    return () => clearTimeout(timer);
  }, [location]);

  function newConversation() {
    requestId.current++; locationRequest.current++; pendingRequest.current?.abort(); sending.current = false;
    setLoading(false); setMessages([]); setInput(''); setLocation(null); setLocStatus('idle'); setLocNotice('');
    setCopiedIndex(null); setCopyNotice('');
    if (!isMobile) inputRef.current?.focus();
  }

  const send = useCallback(async (forcedText?: string) => {
    const text = (forcedText ?? input).trim();
    if (!text || sending.current) return;
    sending.current = true;
    const id = ++requestId.current;
    const abort = new AbortController(); pendingRequest.current = abort;
    const timeout = setTimeout(() => abort.abort(), 20000);
    const userMsg: Message = { role: 'user', text };
    const next = [...messages, userMsg].slice(-10);
    setMessages(next);
    setInput('');
    setCopiedIndex(null); setCopyNotice('');
    setLoading(true);
    try {
      const history = next
        .slice(0, -1)
        .filter((message) => message.role === 'user')
        .map((message) => ({ role: 'user' as const, text: message.text }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, location: Date.now() - locationTime.current < 5 * 60000 ? location : null }),
        signal: abort.signal,
      });
      const data = await res.json();
      if (id !== requestId.current) return;
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'bot' as const, text: typeof data.error === 'string' ? data.error : 'No pude completar la consulta. Intenta de nuevo.', error: true }].slice(-10)); return;
      }
      setMessages((prev) => [...prev, { role: 'bot' as const, text: typeof data.reply === 'string' ? data.reply : 'Dime un lugar o una ruta para ayudarte.',
        actions: data.actions, places: data.places, suggestions: data.suggestions, evidence: data.evidence }].slice(-10));
    } catch {
      if (id === requestId.current) setMessages((prev) => [...prev, { role: 'bot' as const, text: 'No pude conectar a tiempo. Tu conversación sigue aquí; intenta de nuevo.', error: true }].slice(-10));
    } finally {
      clearTimeout(timeout);
      if (id === requestId.current) { sending.current = false; setLoading(false); }
    }
  }, [input, messages, location]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
  }

  function closeChat() { setOpen(false); btnRef.current?.focus(); }
  function stopRequest() {
    requestId.current++; pendingRequest.current?.abort(); sending.current = false; setLoading(false);
    setMessages((previous) => [...previous, { role: 'bot' as const, text: 'Consulta detenida. Puedes ajustar tu pregunta o continuar cuando quieras.' }].slice(-10));
  }
  async function copyReply(message: Message, index: number) {
    try { await navigator.clipboard.writeText(message.text); setCopiedIndex(index); setCopyNotice('Respuesta copiada.'); }
    catch { setCopyNotice('Tu navegador no permitió copiar. Puedes seleccionar el texto de la respuesta.'); }
  }

  function openReport() {
    setReportRoute('');
    setReportError(messages.findLast((message) => message.role === 'bot')?.text ?? '');
    setReportCorrect('');
    setView('report');
  }

  const lastQuestion = messages.findLast((message) => message.role === 'user')?.text;
  const reportReady = reportError.trim().length > 0;
  const panelContent = (
    <>
      <header className="chat-header">
        <div className="chat-brand">
          <span className="chat-brand-mark"><ChatBotIcon size={24} /></span>
          <div>
            <h2 id="urugo-chat-title">{view === 'report' ? 'Reportar respuesta' : 'Asistente UruGo'}</h2>
            <p>{view === 'report' ? 'Tu ayuda mejora la guía' : 'Tu guía para moverte y descubrir'}</p>
          </div>
        </div>
        <div className="chat-header-actions">
          {view === 'chat' ? <button type="button" className="chat-icon-button" onClick={newConversation} aria-label="Empezar nueva conversación" title="Nueva consulta"><Plus size={20} /></button>
            : <button type="button" className="chat-icon-button" onClick={() => setView('chat')} aria-label="Volver a la conversación" title="Volver"><ArrowLeft size={19} /></button>}
          <button type="button" className="chat-icon-button" onClick={closeChat} aria-label="Cerrar chat" title="Cerrar"><X size={20} /></button>
        </div>
      </header>

      {view === 'chat' ? <>
        <div className={`chat-location ${locStatus === 'granted' ? 'chat-location-active' : ''}`}>
          {locStatus === 'granted' ? <>
            <MapPin size={17} aria-hidden="true" />
            <span><strong>Mi ubicación está compartida</strong><small>Uso temporal · caduca a los 5 min</small></span>
            <button type="button" className="chat-icon-button" aria-label="Quitar ubicación" title="Quitar ubicación" onClick={() => { locationRequest.current++; setLocation(null); setLocStatus('idle'); setLocNotice(''); }}><X size={17} /></button>
          </> : <button type="button" className="chat-location-button" onClick={requestLocation} aria-label="Compartir ubicación">
            <MapPin size={17} aria-hidden="true" />
            <span><strong>Usar mi ubicación</strong><small>También puedes escribir tu origen</small></span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </button>}
        </div>
        {locNotice && <p role="status" className="chat-location-notice">{locNotice}</p>}

        <div role="log" aria-label="Conversación con UruGo" aria-live="polite" className="chat-messages">
          {messages.length === 0 && <div className="chat-welcome">
            <div className="chat-welcome-top"><span className="chat-eyebrow">TU GUÍA DE BOLSILLO</span><span className="chat-city-tag">URUAPAN</span></div>
            <h3 className="chat-welcome-title">¿A dónde <em>vamos hoy?</em></h3>
            <p className="chat-welcome-description">Rutas y rincones de Uruapan, en una conversación.</p>
            <div className="chat-starters" aria-label="Ideas para empezar">
              {SUGGESTED_QUESTIONS.map(({ question, title, description, Icon }, index) => <button key={question} type="button" aria-label={question} className={`chat-starter ${index === 0 ? 'chat-starter-featured' : ''}`} onClick={() => void send(question)}>
                <span className="chat-starter-icon"><Icon size={19} aria-hidden="true" /></span>
                <strong>{title}</strong><span className="chat-starter-description">{description}</span><ArrowUpRight className="chat-starter-arrow" size={15} aria-hidden="true" />
              </button>)}
            </div>
            <p className="chat-welcome-note"><MapPin size={13} aria-hidden="true" /> Para un viaje, dime de dónde sales y a dónde vas.</p>
          </div>}

          {messages.map((message, index) => <div key={index} ref={index === messages.length - 1 ? lastMessageRef : undefined} className={`chat-message chat-message-${message.role}${message.error ? ' chat-message-error' : ''}`}>
            {message.role === 'bot' && <div className="chat-message-author"><ChatBotIcon size={15} /><span>UruGo</span><span className="chat-author-divider" aria-hidden="true">/</span><span>{message.error ? 'Revisemos la consulta' : 'Guía local'}</span></div>}
            <p className="chat-bubble">{message.text}</p>
            {message.role === 'bot' && <>
              {message.evidence && <p className="chat-evidence"><Check size={12} aria-hidden="true" />{message.evidence}</p>}
              {message.places?.length ? <div className="chat-place-list" aria-label="Lugares de interés">{message.places.map((place) => <article className="chat-place" key={place.id}>
                <div className="chat-place-top"><div><span className="chat-place-category">{place.category}</span><h3>{place.title}</h3></div>
                  {safeChatHref(place.href) && <a className="chat-place-map" href={safeChatHref(place.href)} aria-label={`Ubicar y planear viaje a ${place.title}`}>Mapa <ArrowUpRight size={15} aria-hidden="true" /></a>}
                </div>
                <p className="chat-place-description">{place.description}</p>
                <details className="chat-place-details"><summary>Información de visita <ChevronDown size={14} aria-hidden="true" /></summary><div>
                  <p>{place.detail}</p>
                  {safeChatHref(place.source.href) && <a href={safeChatHref(place.source.href)} target="_blank" rel="noopener noreferrer">Fuente: {place.source.label} <ArrowUpRight size={12} aria-hidden="true" /></a>}
                </div></details>
              </article>)}</div> : null}
              {message.actions?.length ? <div className="chat-actions">{message.actions.map((action) => safeChatHref(action.href)
                ? <a key={action.label} href={safeChatHref(action.href)} className="chat-map-link"><MapPin size={16} aria-hidden="true" />{action.label}<ArrowUpRight size={16} aria-hidden="true" /></a>
                : action.prompt ? <button key={action.label} type="button" className="chat-prompt" disabled={loading} onClick={() => void send(action.prompt)}>{action.label}</button> : null)}</div> : null}
              {index === messages.length - 1 && !loading && <>
                {message.error && lastQuestion ? <button type="button" className="chat-retry" onClick={() => void send(lastQuestion)}>Volver a intentar <ArrowUpRight size={14} aria-hidden="true" /></button> : <div className="chat-response-tools">
                  <button type="button" onClick={() => void copyReply(message, index)} aria-label="Copiar respuesta">{copiedIndex === index ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copiedIndex === index ? 'Copiado' : 'Copiar'}</button>
                  <button type="button" onClick={openReport} aria-label="Reportar error"><Flag size={14} aria-hidden="true" />Reportar</button>
                </div>}
                {message.suggestions?.length ? <div className="chat-follow-ups" aria-label="Continuar la conversación">{message.suggestions.map((suggestion) => <button key={suggestion} type="button" className="chat-prompt" onClick={() => void send(suggestion)}>{suggestion}<ArrowUpRight size={12} aria-hidden="true" /></button>)}</div> : null}
              </>}
            </>}
          </div>)}
          {loading && <div role="status" className="chat-loading"><span className="chat-loading-dots" aria-hidden="true"><i /><i /><i /></span><span>Preparando tu respuesta</span></div>}
          <div ref={bottomRef} />
        </div>

        <div className="chat-composer-wrap">
          {copyNotice && <p role="status" className="chat-copy-notice">{copyNotice}</p>}
          <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <textarea ref={inputRef} rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKey} placeholder="Escribe tu pregunta…" maxLength={1000} aria-label="Escribe tu pregunta sobre rutas" aria-describedby="chat-input-hint" autoComplete="off" enterKeyHint="send" />
            {loading ? <button key="stop" type="button" className="chat-send chat-stop" onClick={(event) => { event.preventDefault(); stopRequest(); }} aria-label="Detener consulta" title="Detener consulta"><Square size={15} fill="currentColor" aria-hidden="true" /></button>
              : <button key="send" type="submit" className="chat-send" disabled={!input.trim()} aria-label="Enviar" title="Enviar pregunta"><ArrowUp size={20} aria-hidden="true" /></button>}
          </form>
          <div id="chat-input-hint" className="chat-composer-hint"><span>Rutas, lugares y planes en Uruapan</span>{input.length > 850 ? <span>{input.length}/1000</span> : <span className="chat-keyboard-hint">Mayús + Enter: nueva línea</span>}</div>
        </div>
      </> : <div className="chat-report-body">
        <span className="chat-eyebrow">UNA GUÍA QUE MEJORA CONTIGO</span>
        <h3>¿Algo no estuvo bien?</h3><p className="chat-report-intro">Cuéntanos qué debemos revisar. Ya incluimos la última respuesta para que sea más sencillo.</p>
        <label htmlFor="chat-report-route">Ruta o lugar <span>opcional</span></label>
        <input id="chat-report-route" type="text" value={reportRoute} onChange={(event) => setReportRoute(event.target.value)} placeholder="Ej. Ruta 26 o Parque Nacional" maxLength={120} />
        <label htmlFor="chat-report-error">¿Qué información debemos revisar?</label>
        <textarea id="chat-report-error" value={reportError} onChange={(event) => setReportError(event.target.value)} rows={4} maxLength={3000} required />
        <label htmlFor="chat-report-correct">¿Cuál sería la información correcta? <span>opcional</span></label>
        <textarea id="chat-report-correct" value={reportCorrect} onChange={(event) => setReportCorrect(event.target.value)} placeholder="Comparte la corrección o lo que observaste" rows={3} maxLength={3000} />
        <div className="chat-report-links"><a href={reportReady ? emailHref : undefined} aria-disabled={!reportReady} className="chat-map-link">Preparar correo <ArrowUpRight size={17} aria-hidden="true" /></a>
          <a href={reportReady ? issueHref : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!reportReady} className="chat-report-github">Abrir reporte en GitHub <ArrowUpRight size={14} aria-hidden="true" /></a></div>
        <p className="chat-report-note">Podrás revisar el mensaje antes de enviarlo desde tu correo o GitHub.</p>
      </div>}
    </>
  );

  const launcher = <button ref={btnRef} type="button" onClick={() => open ? closeChat() : setOpen(true)}
    className={`ov-panel chat-launcher pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-lima/25 bg-surface text-lima shadow-[0_8px_28px_rgba(0,0,0,0.25)] transition active:scale-[0.97] lg:h-10 lg:w-10 lg:rounded-lg ${open ? 'chat-launcher-open' : ''}`}
    aria-label={mounted && open ? 'Cerrar asistente de rutas' : 'Abrir asistente de rutas'} aria-expanded={mounted && open} aria-controls={mounted ? 'urugo-chat-panel' : undefined} title="Tu guía de Uruapan"><ChatBotIcon /></button>;
  if (!mounted) return launcher;

  const mobileSheet = isMobile ? createPortal(<>
    <div className="chat-backdrop" data-open={open} aria-hidden="true" onClick={closeChat} />
    <div className="urugo-chat chat-mobile" data-open={open} tabIndex={-1} ref={panelRef} id="urugo-chat-panel" role="dialog" aria-modal="true" aria-labelledby="urugo-chat-title" aria-hidden={!open} inert={!open ? true : undefined}
      style={keyboardViewport ? { height: keyboardViewport.height, bottom: keyboardViewport.bottom } : undefined}>{panelContent}</div>
  </>, document.body) : null;
  const desktopPanel = !isMobile && open ? createPortal(<div className="urugo-chat chat-desktop" tabIndex={-1} ref={panelRef} id="urugo-chat-panel" role="dialog" aria-modal="true" aria-labelledby="urugo-chat-title" style={desktopStyle}>{panelContent}</div>, document.body) : null;
  return <>{launcher}{mobileSheet}{desktopPanel}</>;
}
