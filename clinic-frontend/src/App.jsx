import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { playSound } from "./utils/sound";

const API = import.meta.env.VITE_API_URL || "/api";
const SESSION_KEY = "clinicos_session";
const PATIENT_FORM = { first_name: "", last_name: "", date_of_birth: "", gender: "M", email: "", phone: "", address: "", blood_group: "", password: "" };
const DOCTOR_FORM = { first_name: "", last_name: "", specialization: "", dept_id: "", email: "", phone: "", available_days: "", fees: 0 };
const TEST_FORM = { test_id: "", booking_date: "", notes: "" };
const BILL_FORM = { patient_id: "", appointment_id: "", booking_id: "", description: "", total_amount: "", due_date: "" };

const STATUS_COLORS = {
  Pending: ["#fff4df", "#a35b00"],
  Approved: ["#e8f4fd", "#1565c0"],
  Scheduled: ["#e8f4fd", "#1565c0"],
  Completed: ["#e8f5e9", "#2e7d32"],
  Paid: ["#e8f5e9", "#2e7d32"],
  Rejected: ["#feebee", "#c62828"],
  Cancelled: ["#feebee", "#c62828"],
  "No-Show": ["#fff8e1", "#f57f17"],
};

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const session = readSession();
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  try {
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The request could not be completed.");
    return result;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Cannot connect to the clinic server. Please start the API and try again.", { cause: error });
    }
    throw error;
  }
}

const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};

// const playSound = (type) => {
//   try {
//     const AudioContextClass = window.AudioContext || window.webkitAudioContext;
//     if (!AudioContextClass) return;
//     const ctx = new AudioContextClass();
//     if (ctx.state === 'suspended') {
//       ctx.resume();
//     }
//     const now = ctx.currentTime;
//     if (type === 'appointment' || type === 'confirm') {
//       const osc1 = ctx.createOscillator();
//       const gain1 = ctx.createGain();
//       osc1.type = 'sine';
//       osc1.frequency.setValueAtTime(659.25, now);
//       gain1.gain.setValueAtTime(0.08, now);
//       gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
//       osc1.connect(gain1);
//       gain1.connect(ctx.destination);
//       osc1.start(now);
//       osc1.stop(now + 0.15);

//       const osc2 = ctx.createOscillator();
//       const gain2 = ctx.createGain();
//       osc2.type = 'sine';
//       osc2.frequency.setValueAtTime(880.00, now + 0.1);
//       gain2.gain.setValueAtTime(0.08, now + 0.1);
//       gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
//       osc2.connect(gain2);
//       gain2.connect(ctx.destination);
//       osc2.start(now + 0.1);
//       osc2.stop(now + 0.3);
//     } else if (type === 'payment' || type === 'pay') {
//       const osc1 = ctx.createOscillator();
//       const gain1 = ctx.createGain();
//       osc1.type = 'sine';
//       osc1.frequency.setValueAtTime(987.77, now);
//       gain1.gain.setValueAtTime(0.08, now);
//       gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
//       osc1.connect(gain1);
//       gain1.connect(ctx.destination);
//       osc1.start(now);
//       osc1.stop(now + 0.08);

//       const osc2 = ctx.createOscillator();
//       const gain2 = ctx.createGain();
//       osc2.type = 'sine';
//       osc2.frequency.setValueAtTime(1318.51, now + 0.06);
//       gain2.gain.setValueAtTime(0.08, now + 0.06);
//       gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
//       osc2.connect(gain2);
//       gain2.connect(ctx.destination);
//       osc2.start(now + 0.06);
//       osc2.stop(now + 0.25);
//     } else if (type === 'completion' || type === 'complete') {
//       const notes = [523.25, 659.25, 783.99, 1046.50];
//       notes.forEach((freq, idx) => {
//         const osc = ctx.createOscillator();
//         const gain = ctx.createGain();
//         const noteStart = now + idx * 0.06;
//         osc.type = 'sine';
//         osc.frequency.setValueAtTime(freq, noteStart);
//         gain.gain.setValueAtTime(0.06, noteStart);
//         gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.2);
//         osc.connect(gain);
//         gain.connect(ctx.destination);
//         osc.start(noteStart);
//         osc.stop(noteStart + 0.2);
//       });
//     }
//   } catch (err) {
//     console.warn("Failed to play sound: ", err);
//   }
// };


const todayString = () => {
  const local = new Date();
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().split("T")[0];
};
const money = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount || 0));

function Card({ children, className = "", style }) {
  return <section className={`card ${className}`} style={style}>{children}</section>;
}

function Btn({ children, variant = "primary", className = "", ...props }) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}

function Input({ label, icon, suffix, ...props }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <div className="input-with-icon-wrapper">
        {icon && <span className="input-field-icon">{icon}</span>}
        <input className={`${icon ? "has-icon" : ""} ${suffix ? "has-suffix" : ""}`} {...props} />
        {suffix && <span className="input-field-suffix">{suffix}</span>}
      </div>
    </label>
  );
}

function Select({ label, children, ...props }) {
  return <label className="field">{label && <span>{label}</span>}<select {...props}>{children}</select></label>;
}

function Textarea({ label, ...props }) {
  return <label className="field span-all">{label && <span>{label}</span>}<textarea {...props} /></label>;
}

function Badge({ status }) {
  const [background, color] = STATUS_COLORS[status] || ["#eef0f5", "#556070"];
  return <span className="badge" style={{ background, color }}><i style={{ background: color }} />{status}</span>;
}

function Stat({ label, value, accent }) {
  const isCurrency = typeof value === 'string' && value.includes('₹');
  const getNumeric = useCallback((val) => {
    if (isCurrency) {
      return Number(val.replace(/[^0-9.-]+/g, ""));
    }
    return Number(val);
  }, [isCurrency]);

  const [displayVal, setDisplayVal] = useState(() => {
    const num = getNumeric(value);
    return isNaN(num) ? value : 0;
  });
  
  useEffect(() => {
    const numericVal = getNumeric(value);
    if (isNaN(numericVal)) {
      return;
    }
    
    let start = 0;
    const duration = 750;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.floor(start + easeProgress * (numericVal - start));
      setDisplayVal(currentVal);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayVal(numericVal);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, isCurrency, getNumeric]);

  const renderedValue = isCurrency ? money(displayVal) : displayVal;
  return (
    <Card className="stat">
      <span style={{ background: `${accent}16`, color: accent }}>{label.slice(0, 1)}</span>
      <div>
        <strong>{renderedValue}</strong>
        <small>{label}</small>
      </div>
    </Card>
  );
}

function PageHeader({ title, subtitle, action }) {
  return <header className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</header>;
}

function Empty({ title, detail }) {
  return <div className="empty"><strong>{title}</strong><p>{detail}</p></div>;
}

function Toast({ toast, close }) {
  useEffect(() => {
    if (!toast.msg) return undefined;
    const timer = setTimeout(close, 3200);
    return () => clearTimeout(timer);
  }, [toast.msg, close]);
  if (!toast.msg) return null;
  return <div className={`toast ${toast.type}`}>{toast.msg}</div>;
}

const SuccessCheckmark = ({ message, onClose }) => (
  <div className="success-checkmark-overlay stack" style={{ textAlign: 'center', padding: '30px 10px', alignItems: 'center', justifyContent: 'center' }}>
    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{ width: '56px', height: '56px', display: 'block', margin: '0 auto 20px' }}>
      <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
      <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
    <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Success!</h3>
    <p className="muted" style={{ fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>{message}</p>
    <Btn onClick={onClose} style={{ maxWidth: '180px' }}>Continue</Btn>
  </div>
);

const KEYWORDS = ["scheduling", "services", "diagnostics", "billing"];

function AuthLanding({ onSession, toast, theme, toggleTheme, themeRotating }) {
  const [tab, setTab] = useState("patient-register");
  const [register, setRegister] = useState(PATIENT_FORM);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [keywordIndex, setKeywordIndex] = useState(0);

  const [doctorSearch, setDoctorSearch] = useState("");
  const [activeDeptFilter, setActiveDeptFilter] = useState("all");

  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [recommendedDept, setRecommendedDept] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const symptomsData = [
    { text: "Chest discomfort / Palpitations", dept: "Cardiology", emoji: "❤️", reason: "Chest discomfort or heart palpitations can be indicators of cardiovascular conditions. A cardiologist can evaluate your heart health via ECG and physical assessment." },
    { text: "Fever / Cough / Weakness", dept: "Medicine", emoji: "🩺", reason: "General symptoms like fever, fatigue, and cold are best evaluated by general medicine physicians for initial diagnosis and systemic treatment." },
    { text: "Bone pain / Fracture / Joint strain", dept: "Orthopedics", emoji: "🦴", reason: "Bones, joints, and muscular strains fall under Orthopedics. Specialist doctors can order X-rays and recommend physical therapy or interventions." },
    { text: "Toothache / Bleeding gums", dept: "Dental", emoji: "🦷", reason: "A toothache, structural tooth issues, or gum irritation require a Dentistry evaluation for diagnostic cleanings, fillings, or procedures." },
    { text: "Skin rash / Acne / Hair loss", dept: "Dermatology", emoji: "✨", reason: "Skin eruptions, chronic acne, and hair issues are specialized under dermatology. Dermatologists diagnose skin lesions and prescribe targeted topical therapies." },
    { text: "Numbness / Headache / Dizziness", dept: "Neurology", emoji: "🧠", reason: "Chronic headaches, sensory changes, or severe dizziness can stem from the nervous system, which is the domain of neurology." },
    { text: "Ear pain / Throat irritation / Sinuses", dept: "ENT", emoji: "👂", reason: "Otolaryngology (ENT) specializes in ear canals, nasal passages, and throat conditions including acute earaches or persistent sinusitis." },
    { text: "Anxiety / Low mood / Sleep problems", dept: "Psychiatry", emoji: "💭", reason: "Emotional health, chronic anxiety, sleep disorders, and mood changes are evaluated and treated by medical psychiatrists." }
  ];

  const faqs = [
    { q: "How do I request an appointment with a doctor?", a: "To schedule an appointment, create a patient account (or log in if you already have one) from the portal above. Navigate to the 'Request Appointment' section, select your department and preferred specialist, and pick a date/time. The hospital administration will review and confirm your slot." },
    { q: "Can I book diagnostic lab tests online?", a: "Yes. Once logged in as a patient, you can access the diagnostic catalogue under 'Test Requests', select the test you need, enter your preferred date, and submit. Your lab reports will be visible directly in your portal once processed by hospital authority." },
    { q: "Where can I view and pay my hospital bills?", a: "Log into your patient portal and click on 'Bills' or view the dashboard stat. You will see a complete breakdown of consultation fees, diagnostic test fees, and administrative charges. Payments are managed securely via the hospital authority." },
    { q: "How is the Live Patient Queue calculated?", a: "When you have a scheduled appointment today, our system provides real-time queue numbers indicating your place. This updates dynamically as doctors complete consultations." },
    { q: "What should I do if I need to cancel my appointment?", a: "You can cancel any pending or scheduled appointment from the 'My Appointments' tab in the patient portal up to 2 hours before the session." }
  ];

  const testimonials = [
    { text: "ClinicOS transformed my healthcare experience. Booking appointments with specialists takes literally 10 seconds. Highly recommended!", author: "Aarav Sharma", desc: "Cardiology Patient" },
    { text: "I can request blood tests and see the reports in my patient portal without having to go back to the hospital. Extremely convenient.", author: "Priya Patel", desc: "Diagnostic Patient" },
    { text: "As a hospital administrator, managing doctors, approving appointments, and generating bills has never been this organized and secure.", author: "Dr. K. S. Murthy", desc: "Hospital Authority" }
  ];

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/departments").catch(() => []),
      api.get("/doctors").catch(() => [])
    ]).then(([depts, docs]) => {
      if (active) {
        setDepartments(depts);
        setDoctors(docs);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setKeywordIndex((prev) => (prev + 1) % KEYWORDS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("revealed");
            }
          });
        },
        { threshold: 0.1 }
      );
      
      const elements = document.querySelectorAll(".reveal-on-scroll");
      elements.forEach((el) => observer.observe(el));
      
      return () => {
        elements.forEach((el) => observer.unobserve(el));
      };
    }
  }, [doctors]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--glow-x", `${x}px`);
    e.currentTarget.style.setProperty("--glow-y", `${y}px`);
  };

  const handleSymptomSelect = (symptom) => {
    setSelectedSymptom(symptom);
    setSymptomLoading(true);
    setRecommendedDept(null);
    
    setTimeout(() => {
      const matched = departments.find(d => {
        const dName = d.DEPT_NAME.toLowerCase();
        const sDept = symptom.dept.toLowerCase();
        return dName === sDept ||
               new RegExp(`\\b${sDept}\\b`).test(dName) ||
               new RegExp(`\\b${dName}\\b`).test(sDept);
      });
      
      if (matched) {
        const matchedDocs = doctors.filter(doc => doc.DEPT_ID === matched.DEPT_ID);
        setRecommendedDept({
          ...symptom,
          deptName: matched.DEPT_NAME,
          deptId: matched.DEPT_ID,
          doctorsList: matchedDocs
        });
      } else {
        setRecommendedDept({
          ...symptom,
          deptName: symptom.dept,
          doctorsList: doctors.filter(doc => doc.SPECIALIZATION.toLowerCase().includes(symptom.dept.toLowerCase()))
        });
      }
      setSymptomLoading(false);
    }, 800);
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    try {
      const result = await api.post("/auth/register", register);
      onSession(result);
      toast("Welcome to ClinicOS. Your patient account is ready.");
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    try {
      const result = await api.post("/auth/login", login);
      const expectsAdmin = tab === "authority-login";
      if (expectsAdmin && !["ADMIN", "DOCTOR"].includes(result.user.ROLE)) {
        toast("This login is reserved for hospital authority and staff accounts.", "error");
        return;
      }
      if (!expectsAdmin && result.user.ROLE !== "PATIENT") {
        toast("Use the authority login for this account.", "error");
        return;
      }
      onSession(result);
      playSound("success");
      toast("Welcome Back! Stay Healthy 😇");
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = 
      doc.FIRST_NAME.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.LAST_NAME.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.SPECIALIZATION.toLowerCase().includes(doctorSearch.toLowerCase());
      
    if (activeDeptFilter === "all") return matchesSearch;
    return matchesSearch && doc.DEPT_ID === activeDeptFilter;
  });

  return (
    <>
      <header className="landing-header">
        <div className="landing-brand">
          <div className="landing-brand-logo">C</div>
          <strong>ClinicOS</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <nav className={`landing-nav ${mobileNavOpen ? "open" : ""}`}>
            <a href="#features" onClick={() => setMobileNavOpen(false)}>Features</a>
            <a href="#specialists" onClick={() => setMobileNavOpen(false)}>Specialists</a>
            <a href="#assistant" onClick={() => setMobileNavOpen(false)}>AI Assistant</a>
            <a href="#testimonials" onClick={() => setMobileNavOpen(false)}>Testimonials</a>
            <a href="#faq" onClick={() => setMobileNavOpen(false)}>FAQ</a>
          </nav>
          
          <button className={`theme-toggle ${themeRotating ? "rotating" : ""}`} onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            <span className="theme-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>

          <Btn className="landing-nav-btn" onClick={() => {
            const el = document.getElementById("portal");
            if (el) el.scrollIntoView({ behavior: "smooth" });
            setMobileNavOpen(false);
          }}>Access Portal</Btn>

          <button 
            className="landing-mobile-menu-btn" 
            onClick={() => setMobileNavOpen(!mobileNavOpen)} 
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      <div className="landing">
        {/* HERO SECTION */}
        <div id="portal" className="landing-hero-container" onMouseMove={handleMouseMove}>
          <div className="landing-hero-grid">
            <section className="hero">
              <p className="eyebrow">
                <span style={{ display: "inline-block", width: "6px", height: "6px", background: "var(--primary)", borderRadius: "50%", marginRight: "6px", boxShadow: "0 0 8px var(--primary)" }}></span>
                Smart Clinical Portal
              </p>
              <h1>
                Healthcare services &amp; <br />
                <span className="animated-keyword">{KEYWORDS[keywordIndex]}</span> <br />
                in one workspace.
              </h1>
              <p>Patients can request appointments and diagnostics online. Hospital authority can review requests, coordinate care, and issue bills securely.</p>
              
              <div className="hero-buttons" style={{ marginTop: "24px" }}>
                <Btn onClick={() => {
                  const el = document.getElementById("features");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }} variant="secondary" style={{ padding: "12px 24px" }}>Explore Features</Btn>
                <Btn onClick={() => {
                  const el = document.getElementById("assistant");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }} variant="ghost" style={{ padding: "12px 24px", background: "rgba(255,255,255,0.05)", color: "#fff" }}>Symptom Checker</Btn>
              </div>
            </section>

            <Card className="auth-card futuristic-card">
              <div className="auth-tabs futuristic-tabs">
                <div className={`tab-indicator-pill active-${tab}`}></div>
                <button className={tab === "patient-register" ? "active" : ""} onClick={() => setTab("patient-register")}>New Patient</button>
                <button className={tab === "patient-login" ? "active" : ""} onClick={() => setTab("patient-login")}>Patient Login</button>
                <button className={tab === "authority-login" ? "active" : ""} onClick={() => setTab("authority-login")}>Authority</button>
              </div>

              {tab === "patient-register" ? (
                <form onSubmit={submitRegister}>
                  <h2>Create patient account</h2>
                  <div className="form-grid">
                    <Input 
                      label="First name *" 
                      value={register.first_name} 
                      onChange={event => setRegister({ ...register, first_name: event.target.value })} 
                      required 
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      }
                    />
                    <Input 
                      label="Last name *" 
                      value={register.last_name} 
                      onChange={event => setRegister({ ...register, last_name: event.target.value })} 
                      required 
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      }
                    />
                    <Input 
                      label="Date of birth *" 
                      type="date" 
                      value={register.date_of_birth} 
                      onChange={event => setRegister({ ...register, date_of_birth: event.target.value })} 
                      required 
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      }
                    />
                    <Select label="Gender *" value={register.gender} onChange={event => setRegister({ ...register, gender: event.target.value })}>
                      <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                    </Select>
                    <Input 
                      label="Email *" 
                      type="email" 
                      value={register.email} 
                      onChange={event => setRegister({ ...register, email: event.target.value })} 
                      required 
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      }
                    />
                    <Input 
                      label="Phone *" 
                      value={register.phone} 
                      onChange={event => setRegister({ ...register, phone: event.target.value })} 
                      required 
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      }
                    />
                    <Input 
                      label="Password *" 
                      type={showPassword ? "text" : "password"} 
                      minLength="6" 
                      value={register.password} 
                      onChange={event => setRegister({ ...register, password: event.target.value })} 
                      required 
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      }
                      suffix={
                        <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} tabIndex="-1">
                          {showPassword ? "👁️" : "🙈"}
                        </button>
                      }
                    />
                    <Input 
                      label="Blood group" 
                      value={register.blood_group} 
                      onChange={event => setRegister({ ...register, blood_group: event.target.value })} 
                      icon={<span style={{fontSize: "10px", fontWeight: "800", color: "var(--primary)"}}>A/B</span>}
                    />
                    <Input 
                      label="Address" 
                      className="span-all" 
                      value={register.address} 
                      onChange={event => setRegister({ ...register, address: event.target.value })} 
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a10 10 0 0 0-10 10c0 5.52 4.48 10 10 10s10-4.48 10-10a10 10 0 0 0-10-10z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      }
                    />
                  </div>

                  <Btn className="wide" type="submit">Register and enter portal</Btn>
                </form>
              ) : (
                <form className="login-form" onSubmit={submitLogin}>
                  <h2>{tab === "authority-login" ? "Hospital authority login" : "Patient login"}</h2>
                  <p>{tab === "authority-login" ? "Access approvals, records and billing." : "Access your visits, tests and bills."}</p>
                  <Input 
                    label="Email" 
                    type="email" 
                    value={login.email} 
                    onChange={event => setLogin({ ...login, email: event.target.value })} 
                    required 
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    }
                  />
                  <Input 
                    label="Password" 
                    type={showPassword ? "text" : "password"} 
                    value={login.password} 
                    onChange={event => setLogin({ ...login, password: event.target.value })} 
                    required 
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    }
                    suffix={
                      <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} tabIndex="-1">
                        {showPassword ? "👁️" : "🙈"}
                      </button>
                    }
                  />
                  

                  
                  <Btn className="wide" type="submit">Sign in</Btn>
                </form>
              )}
            </Card>
          </div>
        </div>

        {/* STATS ribbon */}
        <div className="stats-ribbon reveal-on-scroll">
          <div className="stat-item">
            <div className="stat-num">15,000+</div>
            <div className="stat-label">Patients Served</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{doctors.length > 0 ? `${doctors.length}+` : "25+"}</div>
            <div className="stat-label">Specialist Doctors</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">99.8%</div>
            <div className="stat-label">Success Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">10 min</div>
            <div className="stat-label">Avg. Queue Wait</div>
          </div>
        </div>

        {/* FEATURES BENTO SECTION */}
        <section id="features" className="reveal-on-scroll">
          <div className="bento-section-title">
            <h2>Everything you need for seamless care</h2>
            <p>We provide a fully integrated digital platform connecting patients with diagnostic departments and hospital authority teams.</p>
          </div>
          
          <div className="bento-grid">
            <div className="bento-card bento-card-large">
              <div className="bento-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <h3>Flexible Digital Appointment Scheduling</h3>
                <p>Request slots with any specialist across Cardiology, Dermatology, Gynecology, and more. Select custom timeframes and receive automatic confirmation alerts in your private patient dashboard.</p>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                  <line x1="12" y1="4" x2="12" y2="20"></line>
                </svg>
              </div>
              <div>
                <h3>Transparent Billing &amp; Invoices</h3>
                <p>View detailed cost breakdowns for consultation charges and diagnostic test fees instantly. Settle dues cleanly through administrative portals.</p>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.25-2.5 3-2.5 5h20c0-2-1-3.75-2.5-5"></path>
                  <circle cx="12" cy="7" r="5"></circle>
                </svg>
              </div>
              <div>
                <h3>Integrated Lab Diagnostics</h3>
                <p>Order pathological workups and radiology scans directly. Hospital laboratories upload certified reports that load straight into your profile.</p>
              </div>
            </div>

            <div className="bento-card bento-card-large">
              <div className="bento-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <path d="M9 17h6M9 13h6M9 9h6"></path>
                </svg>
              </div>
              <div>
                <h3>Hospital Authority Administration</h3>
                <p>Equip clinic teams with interactive control tools. Approve appointments, manage doctor rosters, update diagnostic test templates, and oversee clinic operations in real time from a secure, dedicated dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE DOCTOR FINDER */}
        <section id="specialists" className="reveal-on-scroll">
          <div className="finder-section-title">
            <h2>Find Clinical Specialists</h2>
            <p>Search or filter our directory of available healthcare professionals to review consultation fees, available schedules, and qualifications.</p>
          </div>

          <div className="finder-controls">
            <input
              type="text"
              placeholder="Search by specialist name or specialization..."
              className="search finder-search"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
            />
          </div>

          <div className="dept-filter-row">
            <button
              className={`dept-filter-chip ${activeDeptFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveDeptFilter("all")}
            >
              All Departments
            </button>
            {departments.map((d) => (
              <button
                key={d.DEPT_ID}
                className={`dept-filter-chip ${activeDeptFilter === d.DEPT_ID ? "active" : ""}`}
                onClick={() => setActiveDeptFilter(d.DEPT_ID)}
              >
                {d.DEPT_NAME}
              </button>
            ))}
          </div>

          {filteredDoctors.length === 0 ? (
            <Empty title="No specialists matched" detail="Try adjusting your search terms or selecting another department filter." />
          ) : (
            <div className="directory-grid">
              {filteredDoctors.map((doc) => (
                <div key={doc.DOCTOR_ID} className="doctor-card-glow">
                  <div className="doctor-card-header">
                    <div className="doctor-card-avatar">
                      {doc.FIRST_NAME[0]}{doc.LAST_NAME[0]}
                    </div>
                    <div className="doctor-card-info">
                      <h3>Dr. {doc.FIRST_NAME} {doc.LAST_NAME}</h3>
                      <p>{doc.SPECIALIZATION}</p>
                    </div>
                  </div>
                  <div className="doctor-card-details">
                    <div className="doctor-card-detail-item">
                      <span>Department:</span>
                      <strong>{departments.find(d => d.DEPT_ID === doc.DEPT_ID)?.DEPT_NAME || "General"}</strong>
                    </div>
                    <div className="doctor-card-detail-item">
                      <span>Available:</span>
                      <strong>{doc.AVAILABLE_DAYS || "Daily"}</strong>
                    </div>
                    <div className="doctor-card-detail-item">
                      <span>Consultation Fee:</span>
                      <strong>{money(doc.FEES)}</strong>
                    </div>
                  </div>
                  <Btn 
                    className="wide" 
                    onClick={() => {
                      const el = document.getElementById("portal");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      setTab("patient-login");
                      toast("Please sign in or register to book an appointment with Dr. " + doc.FIRST_NAME);
                    }}
                  >
                    Request Appointment
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SYMPTOM ASSISTANT */}
        <section id="assistant" className="reveal-on-scroll">
          <div className="symptom-section-title">
            <h2>Symptom &amp; Department Guide</h2>
            <p>Not sure which medical specialist you need? Select your symptoms below and we will automatically map you to the correct department and list available doctors.</p>
          </div>

          <div className="symptom-assistant-container">
            <div className="symptom-assistant-card">
              <div className="symptom-assistant-intro">Select your primary symptom:</div>
              <div className="symptom-chips">
                {symptomsData.map((sym, idx) => (
                  <button
                    key={idx}
                    className={`symptom-chip ${selectedSymptom?.text === sym.text ? "selected" : ""}`}
                    onClick={() => handleSymptomSelect(sym)}
                  >
                    <span>{sym.emoji}</span> {sym.text}
                  </button>
                ))}
              </div>

              {symptomLoading && (
                <div className="symptom-loader">
                  <div className="symptom-spinner"></div>
                  <div className="muted" style={{ fontSize: "13px" }}>Analyzing clinical indicators...</div>
                </div>
              )}

              {recommendedDept && !symptomLoading && (
                <div className="symptom-result-card">
                  <div className="symptom-result-header">
                    <span className="symptom-result-emoji">{recommendedDept.emoji}</span>
                    <div className="symptom-result-title">
                      <span>Recommended Clinic Department</span>
                      {recommendedDept.deptName}
                    </div>
                  </div>
                  <p className="symptom-result-reason">{recommendedDept.reason}</p>
                  
                  <div className="symptom-result-doctors">
                    <strong style={{ fontSize: "13px", color: "#fff", display: "block", marginBottom: "4px" }}>
                      Available {recommendedDept.deptName} Specialists:
                    </strong>
                    {recommendedDept.doctorsList.length === 0 ? (
                      <p className="muted" style={{ fontSize: "13px", margin: 0 }}>No active specialists loaded in this department currently.</p>
                    ) : (
                      recommendedDept.doctorsList.map(doc => (
                        <div key={doc.DOCTOR_ID} className="symptom-result-doc-row">
                          <div>
                            <strong>Dr. {doc.FIRST_NAME} {doc.LAST_NAME}</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>{doc.SPECIALIZATION}</span>
                          </div>
                          <Btn 
                            style={{ minHeight: "auto", padding: "6px 12px", fontSize: "11px" }}
                            onClick={() => {
                              const el = document.getElementById("portal");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                              setTab("patient-login");
                              toast("Please sign in or register to book an appointment with Dr. " + doc.FIRST_NAME);
                            }}
                          >
                            Book now ({money(doc.FEES)})
                          </Btn>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="reveal-on-scroll">
          <div className="testimonials-section-title">
            <h2>Patient Testimonials</h2>
            <p>Read review responses from patients and doctors who coordinate care daily through ClinicOS.</p>
          </div>

          <div className="testimonials-container">
            <div className="testimonial-card">
              <div className="testimonial-stars">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
              <p className="testimonial-quote">"{testimonials[testimonialIndex].text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">
                  {testimonials[testimonialIndex].author[0]}
                </div>
                <div className="testimonial-name">
                  <strong>{testimonials[testimonialIndex].author}</strong>
                  <span>{testimonials[testimonialIndex].desc}</span>
                </div>
              </div>
            </div>
            
            <div className="carousel-indicators">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  className={`carousel-indicator ${testimonialIndex === idx ? "active" : ""}`}
                  onClick={() => setTestimonialIndex(idx)}
                ></button>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section id="faq" className="reveal-on-scroll">
          <div className="faq-section-title">
            <h2>Frequently Asked Questions</h2>
            <p>Got questions about booking rules, diagnostic results, or billing cycles? Find answers quickly below.</p>
          </div>

          <div className="faq-container">
            {faqs.map((faq, idx) => (
              <div key={idx} className={`faq-item ${activeFaq === idx ? "active" : ""}`}>
                <button className="faq-question" onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}>
                  <span>{faq.q}</span>
                  <span className="faq-icon">+</span>
                </button>
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="landing-footer">
          <div className="footer-top">
            <div className="footer-brand-col">
              <div className="landing-brand">
                <div className="landing-brand-logo">C</div>
                <strong>ClinicOS</strong>
              </div>
              <p className="footer-brand-desc">
                An integrated, modern clinical administration workspace coordinating secure appointments, diagnostic lab requests, and invoices.
              </p>
            </div>
            
            <div>
              <div className="footer-col-title">Portal Links</div>
              <div className="footer-links">
                <a href="#portal" onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("portal");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}>Patient Registration</a>
                <a href="#portal" onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("portal");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  setTab("patient-login");
                }}>Patient Login</a>
                <a href="#portal" onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("portal");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  setTab("authority-login");
                }}>Authority Login</a>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Quick Links</div>
              <div className="footer-links">
                <a href="#features">Features</a>
                <a href="#specialists">Specialists Finder</a>
                <a href="#assistant">AI Guide</a>
                <a href="#faq">FAQs</a>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Contact &amp; Support</div>
              <div className="footer-contact-info">
                <span>📍 Hospital Lane, Sector-5</span>
                <span>📞 +91 8250204087</span>
                <span>✉️ support@clinicos.org</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copyright">
              &copy; {new Date().getFullYear()} ClinicOS Administration. All rights reserved.
            </div>
            <div className="status-badge">
              <div className="status-indicator"></div>
              <span>API Gateway Connected</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function PatientOverview({ user, setPage, toast }) {
  const [data, setData] = useState({ appointments: [], tests: [], bills: [] });
  const [reminders, setReminders] = useState([]);
  
  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/appointments/mine"),
      api.get("/tests/mine"),
      api.get("/bills/mine"),
      api.get("/notifications")
    ])
      .then(([appointments, tests, bills, notifications]) => {
        if (active) {
          setData({ appointments, tests, bills });
          setReminders(notifications.filter(item => item.type === "reminder"));
        }
      })
      .catch(error => { if (active) toast(error.message, "error"); });
    return () => { active = false; };
  }, [toast]);

  const openVisits = data.appointments.filter(item => ["Pending", "Approved", "Scheduled"].includes(item.STATUS)).length;
  const openTests = data.tests.filter(item => ["Pending", "Approved"].includes(item.STATUS)).length;
  const unpaid = data.bills.filter(item => item.PAYMENT_STATUS === "Pending").reduce((sum, item) => sum + Number(item.TOTAL_AMOUNT), 0);
  return (
    <>
      <PageHeader title={`Hello, ${user.FULL_NAME}`} subtitle="Manage your care requests and keep track of upcoming services." />
      
      {reminders.map(reminder => (
        <div className="dashboard-banner" key={reminder.id}>
          <span>📅</span>
          <div>
            <strong>Upcoming Care Reminder:</strong> {reminder.message}
          </div>
        </div>
      ))}

      {/* Live Queue for today's appointment */}
      <LiveQueueCard appointments={data.appointments} toast={toast} />

      <div className="stats-grid">
        <Stat label="Open visits" value={openVisits} accent="#3669ef" />
        <Stat label="Test requests" value={openTests} accent="#7d4cdb" />
        <Stat label="Outstanding bills" value={money(unpaid)} accent="#ef7f36" />
      </div>
      <div className="two-columns">
        <Card>
          <h2>Quick actions</h2>
          <div className="action-stack">
            <Btn onClick={() => setPage("book")}>Request an appointment</Btn>
            <Btn variant="secondary" onClick={() => setPage("tests")}>Book a diagnostic test</Btn>
            <Btn variant="ghost" onClick={() => setPage("profile")}>Update my information</Btn>
          </div>
        </Card>
        <Card>
          <h2>Recent appointment requests</h2>
          {data.appointments.length === 0 ? <Empty title="No requests yet" detail="Choose a doctor to begin." /> :
            data.appointments.slice(0, 3).map(item => (
              <div className="list-row" key={item.APPT_ID}>
                <div><strong>{item.DOCTOR_NAME}</strong><small>{item.APPT_DATE} · {item.APPT_TIME}</small></div>
                <Badge status={item.STATUS} />
              </div>
            ))}
        </Card>
      </div>
    </>
  );
}

function PatientProfile({ toast }) {
  const [form, setForm] = useState(null);
  useEffect(() => {
    let active = true;
    api.get("/patients/me").then(profile => { if (active) setForm(profile); }).catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.put("/patients/me", {
        first_name: form.FIRST_NAME, last_name: form.LAST_NAME, date_of_birth: form.DATE_OF_BIRTH,
        gender: form.GENDER, email: form.EMAIL, phone: form.PHONE, address: form.ADDRESS, blood_group: form.BLOOD_GROUP,
      });
      toast("Your profile has been updated.");
    } catch (error) {
      toast(error.message, "error");
    }
  };
  if (!form) return <Empty title="Loading profile" detail="" />;
  const change = (key, value) => setForm({ ...form, [key]: value });
  return (
    <>
      <PageHeader title="My Profile" subtitle="Keep your contact and medical information up to date." />
      <Card className="narrow">
        <form onSubmit={save} className="form-grid">
          <Input label="First name *" value={form.FIRST_NAME} onChange={event => change("FIRST_NAME", event.target.value)} required />
          <Input label="Last name *" value={form.LAST_NAME} onChange={event => change("LAST_NAME", event.target.value)} required />
          <Input label="Date of birth *" type="date" value={form.DATE_OF_BIRTH} onChange={event => change("DATE_OF_BIRTH", event.target.value)} required />
          <Select label="Gender *" value={form.GENDER} onChange={event => change("GENDER", event.target.value)}>
            <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
          </Select>
          <Input label="Email *" type="email" value={form.EMAIL || ""} onChange={event => change("EMAIL", event.target.value)} required />
          <Input label="Phone *" value={form.PHONE} onChange={event => change("PHONE", event.target.value)} required />
          <Input label="Blood group" value={form.BLOOD_GROUP || ""} onChange={event => change("BLOOD_GROUP", event.target.value)} />
          <Input label="Address" value={form.ADDRESS || ""} onChange={event => change("ADDRESS", event.target.value)} />
          <Btn type="submit">Save changes</Btn>
        </form>
      </Card>
    </>
  );
}

function PatientBooking({ toast, setPage }) {
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [form, setForm] = useState({ dept_id: "", doctor_id: "", appt_date: "", appt_time: "", reason: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [deptSearch, setDeptSearch] = useState("");

  const DEPT_EMOJIS = {
    "Cardiology": "❤️",
    "Medicine": "🩺",
    "General Medicine": "🩺",
    "Pediatrics": "👶",
    "Orthopedics": "🦴",
    "Dentistry": "🦷",
    "Dental": "🦷",
    "Dermatology": "✨",
    "Neurology": "🧠",
    "Gynecology": "🤱",
    "ENT": "👂",
    "Psychiatry": "💭",
    "Ophthalmology": "👁️"
  };

  const getEmoji = (name) => {
    for (const [key, value] of Object.entries(DEPT_EMOJIS)) {
      if (name.toLowerCase().includes(key.toLowerCase())) return value;
    }
    return "🏥";
  };

  useEffect(() => {
    let active = true;
    api.get("/departments")
      .then(rows => { if (active) setDepartments(rows); })
      .catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);

  const selectDepartment = (deptId) => {
    setForm(prev => ({ ...prev, dept_id: deptId, doctor_id: "", appt_date: "", appt_time: "" }));
    setSelectedDoctor(null);
    api.get(`/doctors/department/${deptId}`)
      .then(setDoctors)
      .catch(error => toast(error.message, "error"));
  };

  const selectDoctor = (doc) => {
    setSelectedDoctor(doc);
    setForm(prev => ({ ...prev, doctor_id: doc.DOCTOR_ID, appt_date: "", appt_time: "" }));
  };

  const isDoctorAvailableOnDate = (doctor, dateStr) => {
    if (!doctor || !doctor.AVAILABLE_DAYS) return true;
    const raw = doctor.AVAILABLE_DAYS.toLowerCase().trim();
    if (raw === "" || raw.includes("daily") || raw.includes("all")) return true;

    // Normalize each token to a canonical 3-letter short name
    const DAY_MAP = {
      sun: "sun", sunday: "sun",
      mon: "mon", monday: "mon",
      tue: "tue", tues: "tue", tuesday: "tue",
      wed: "wed", weds: "wed", wednesday: "wed",
      thu: "thu", thur: "thu", thurs: "thu", thursday: "thu",
      fri: "fri", friday: "fri",
      sat: "sat", saturday: "sat",
    };
    const tokens = raw.split(/[\s,;/|]+/).filter(Boolean);
    const availSet = new Set();
    for (const tok of tokens) {
      const mapped = DAY_MAP[tok];
      if (mapped) availSet.add(mapped);
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const shortDayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayShort = shortDayNames[dateObj.getDay()];

    return availSet.has(dayShort);
  };

  const getNext7Days = () => {
    const days = [];
    const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      days.push({
        dateStr,
        dayName: dayOfWeekNames[d.getDay()],
        dayNum: d.getDate()
      });
    }
    return days;
  };

  const submit = async (event) => {
    if (event) event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/appointments", form);
      setSuccessMsg(`Your appointment request with Dr. ${selectedDoctor.FIRST_NAME} ${selectedDoctor.LAST_NAME} has been submitted successfully.`);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const slots = ["09:00 AM", "09:30 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];

  const filteredDepts = departments.filter(d => d.DEPT_NAME.toLowerCase().includes(deptSearch.toLowerCase()));

  if (successMsg) {
    return (
      <>
        <PageHeader title="Request Appointment" subtitle="Confirming reservation with the clinic specialists." />
        <Card className="narrow">
          <SuccessCheckmark message={successMsg} onClose={() => { setSuccessMsg(""); setPage("appointments"); }} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Request Appointment" subtitle="Choose a specialist and your preferred time. The hospital will confirm availability." />
      <Card className="narrow">
        <div className="stepper-header">
          <div className={`step-node ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>1</div>
          <div className={`step-node ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>2</div>
          <div className={`step-node ${step >= 3 ? "active" : ""} ${step > 3 ? "completed" : ""}`}>3</div>
        </div>

        <div className="stepper-content">
          {step === 1 && (
            <div className="stack" style={{ gap: "20px" }}>
              <div>
                <h3 style={{ marginBottom: "12px", fontSize: "15px" }}>1. Select Department</h3>
                <input 
                  className="search" 
                  placeholder="Search departments..." 
                  value={deptSearch} 
                  onChange={e => setDeptSearch(e.target.value)} 
                  style={{ marginBottom: "14px" }}
                />
                <div className="dept-grid">
                  {filteredDepts.map(item => (
                    <div 
                      key={item.DEPT_ID} 
                      className={`dept-card ${form.dept_id === item.DEPT_ID ? "active" : ""}`}
                      onClick={() => selectDepartment(item.DEPT_ID)}
                    >
                      <span className="dept-emoji">{getEmoji(item.DEPT_NAME)}</span>
                      <strong>{item.DEPT_NAME}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {form.dept_id && (
                <div style={{ animation: "pageFadeIn 0.3s ease" }}>
                  <h3 style={{ marginBottom: "12px", fontSize: "15px" }}>2. Select Doctor Specialist</h3>
                  {doctors.length === 0 ? (
                    <Empty title="No specialists available" detail="No doctors registered in this department." />
                  ) : (
                    <div className="directory-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                      {doctors.map(doc => (
                        <div 
                          key={doc.DOCTOR_ID} 
                          className={`doctor-picker-card ${form.doctor_id === doc.DOCTOR_ID ? "active" : ""}`}
                          onClick={() => selectDoctor(doc)}
                        >
                          <div className="doctor-avatar-circle">
                            {doc.FIRST_NAME[0]}{doc.LAST_NAME[0]}
                          </div>
                          <div>
                            <strong>Dr. {doc.FIRST_NAME} {doc.LAST_NAME}</strong>
                            <small style={{ display: "block", color: "var(--muted)", margin: "4px 0" }}>{doc.SPECIALIZATION}</small>
                            <span style={{ fontSize: "11px", display: "block", fontWeight: "bold", color: "var(--primary)" }}>Fees: {money(doc.FEES)}</span>
                            <span style={{ fontSize: "10px", display: "block", color: "var(--muted)", marginTop: "2px" }}>Days: {doc.AVAILABLE_DAYS || "All"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <Btn onClick={() => setStep(2)} disabled={!form.doctor_id}>Next: Select Date & Time</Btn>
              </div>
            </div>
          )}

          {step === 2 && selectedDoctor && (
            <div className="stack" style={{ gap: "20px" }}>
              <div>
                <h3 style={{ marginBottom: "12px", fontSize: "15px" }}>Select Appointment Date</h3>
                <p className="muted" style={{ fontSize: "13px", marginBottom: "10px" }}>
                  Dr. {selectedDoctor.FIRST_NAME} {selectedDoctor.LAST_NAME} is available on: <strong style={{ color: "var(--primary)" }}>{selectedDoctor.AVAILABLE_DAYS || "Daily"}</strong>
                </p>
                <div className="date-pills-row">
                  {getNext7Days().map(day => {
                    const isAvailable = isDoctorAvailableOnDate(selectedDoctor, day.dateStr);
                    return (
                      <div 
                        key={day.dateStr} 
                        className={`date-pill ${form.appt_date === day.dateStr ? "active" : ""} ${!isAvailable ? "disabled" : ""}`}
                        onClick={() => isAvailable && setForm({ ...form, appt_date: day.dateStr, appt_time: "" })}
                      >
                        <span className="date-pill-day">{day.dayName}</span>
                        <span className="date-pill-num">{day.dayNum}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {form.appt_date && (
                <div style={{ animation: "pageFadeIn 0.3s ease" }}>
                  <h3 style={{ marginBottom: "12px", fontSize: "15px" }}>Select Time Slot</h3>
                  <div className="slot-grid">
                    {slots.map(slot => (
                      <div 
                        key={slot} 
                        className={`slot-chip ${form.appt_time === slot ? "active" : ""}`}
                        onClick={() => setForm({ ...form, appt_time: slot })}
                      >
                        {slot}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
                <Btn onClick={() => setStep(3)} disabled={!form.appt_date || !form.appt_time}>Next: Confirm details</Btn>
              </div>
            </div>
          )}

          {step === 3 && selectedDoctor && (
            <div className="stack" style={{ gap: "20px" }}>
              <h3 style={{ fontSize: "15px" }}>Confirm Appointment Details</h3>
              <div className="invoice-sheet">
                <div className="invoice-row">
                  <span className="muted">Specialist:</span>
                  <strong>Dr. {selectedDoctor.FIRST_NAME} {selectedDoctor.LAST_NAME}</strong>
                </div>
                <div className="invoice-row">
                  <span className="muted">Specialization / Department:</span>
                  <span>{selectedDoctor.SPECIALIZATION}</span>
                </div>
                <div className="invoice-row">
                  <span className="muted">Appointment Date:</span>
                  <strong>{form.appt_date}</strong>
                </div>
                <div className="invoice-row">
                  <span className="muted">Appointment Time:</span>
                  <strong>{form.appt_time}</strong>
                </div>
                <div className="invoice-row total">
                  <span>Consultation Fees:</span>
                  <span>{money(selectedDoctor.FEES)}</span>
                </div>
              </div>

              <Textarea 
                label="Reason for Visit" 
                rows="3" 
                placeholder="Briefly describe your symptoms or reason for visit..." 
                value={form.reason} 
                onChange={e => setForm({ ...form, reason: e.target.value })} 
              />

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                <Btn variant="secondary" onClick={() => setStep(2)}>Back</Btn>
                <Btn onClick={submit} disabled={submitting}>
                  {submitting && <span className="spinner"></span>}
                  {submitting ? "Booking..." : "Confirm & Book"}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function MyAppointments({ toast }) {
  const [items, setItems] = useState([]);
  const [activePrescription, setActivePrescription] = useState(null);

  const load = useCallback(() => api.get("/appointments/mine").then(setItems).catch(error => toast(error.message, "error")), [toast]);
  useEffect(() => {
    let active = true;
    api.get("/appointments/mine").then(rows => { if (active) setItems(rows); }).catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);
  const cancel = async (id) => {
    try {
      await api.put(`/appointments/${id}/cancel`, {});
      toast("Appointment request cancelled.");
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const viewPrescription = async (apptId) => {
    try {
      const data = await api.get(`/prescriptions/appointment/${apptId}`);
      setActivePrescription(data);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <>
      <PageHeader title="My Appointments" subtitle="View approval status and cancel an open request when plans change." />
      <Card>
        {items.length === 0 ? <Empty title="No appointments" detail="Request an appointment to see it here." /> :
          items.map(item => (
            <div className="request-row" key={item.APPT_ID}>
              <div><h3>{item.DOCTOR_NAME}</h3><p>{item.SPECIALIZATION} · {item.DEPT_NAME}</p><small>{item.APPT_DATE} · {item.APPT_TIME}{item.REASON && ` · ${item.REASON}`}</small></div>
              <div className="row-actions">
                <Badge status={item.STATUS} />
                {item.PRESCRIPTION_ID && (
                  <Btn variant="success" onClick={() => viewPrescription(item.APPT_ID)}>View Prescription</Btn>
                )}
                {["Pending", "Approved", "Scheduled"].includes(item.STATUS) && <Btn variant="danger" onClick={() => cancel(item.APPT_ID)}>Cancel</Btn>}
              </div>
            </div>
          ))}
      </Card>

      {activePrescription && (
        <Modal title="Prescription Details" onClose={() => setActivePrescription(null)}>
          <div className="prescription-card">
            <div className="prescription-meta">
              <div className="prescription-meta-item">
                <span>Patient Name</span>
                <strong>{activePrescription.PATIENT_NAME}</strong>
              </div>
              <div className="prescription-meta-item">
                <span>Date & Time</span>
                <strong>{activePrescription.APPT_DATE} · {activePrescription.APPT_TIME}</strong>
              </div>
              <div className="prescription-meta-item">
                <span>Doctor Name</span>
                <strong>{activePrescription.DOCTOR_NAME}</strong>
              </div>
              <div className="prescription-meta-item">
                <span>Specialization</span>
                <strong>{activePrescription.SPECIALIZATION}</strong>
              </div>
            </div>
            <div className="prescription-section">
              <h4>Rx Medicines</h4>
              <p>{activePrescription.MEDICINES}</p>
            </div>
            {activePrescription.INSTRUCTIONS && (
              <div className="prescription-section">
                <h4>Instructions / Notes</h4>
                <p>{activePrescription.INSTRUCTIONS}</p>
              </div>
            )}
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Btn type="button" onClick={() => setActivePrescription(null)}>Close</Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function PatientTests({ toast, user }) {
  const [catalog, setCatalog] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(TEST_FORM);
  const [viewingReport, setViewingReport] = useState(null);
  const [sharingReport, setSharingReport] = useState(null);
  const [shareDetails, setShareDetails] = useState({ name: "", email: "", doctorId: "" });
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [clinicDoctors, setClinicDoctors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadBookings = useCallback(() => api.get("/tests/mine").then(setBookings).catch(error => toast(error.message, "error")), [toast]);
  
  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/tests/catalog"), 
      api.get("/tests/mine"),
      api.get("/doctors").catch(() => [])
    ])
      .then(([tests, requests, docs]) => { 
        if (active) { 
          setCatalog(tests); 
          setBookings(requests); 
          setClinicDoctors(docs);
        } 
      })
      .catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/tests/requests", form);
      setSuccessMsg("Lab test booked successfully and pending approval.");
      setForm(TEST_FORM);
      loadBookings();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id) => {
    try {
      await api.put(`/tests/requests/${id}/cancel`, {});
      toast("Test request cancelled.");
      loadBookings();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!shareDetails.email?.trim()) return;
    setIsSendingShare(true);
    
    setTimeout(async () => {
      try {
        await api.post(`/tests/requests/${sharingReport.BOOKING_ID}/share`, {
          recipient_name: shareDetails.name,
          recipient_email: shareDetails.email
        });
        setShareSuccess(true);
        loadBookings();
      } catch (error) {
        toast(error.message, "error");
        setIsSendingShare(false);
      }
    }, 1800);
  };

  const selectShareDoctor = (docId) => {
    if (!docId) {
      setShareDetails({ doctorId: "", name: "", email: "" });
      return;
    }
    const doc = clinicDoctors.find(d => String(d.DOCTOR_ID) === String(docId));
    if (doc) {
      setShareDetails({
        doctorId: docId,
        name: `Dr. ${doc.FIRST_NAME} ${doc.LAST_NAME}`,
        email: doc.EMAIL || ""
      });
    }
  };

  return (
    <>
      <PageHeader title="Diagnostic Tests" subtitle="Request a test and receive confirmation from the hospital." />
      <div className="two-columns">
        <Card>
          <h2>Book a test</h2>
          {successMsg ? (
            <SuccessCheckmark message={successMsg} onClose={() => setSuccessMsg("")} />
          ) : (
            <form className="stack" onSubmit={submit}>
              <Select label="Test *" value={form.test_id} onChange={event => setForm({ ...form, test_id: event.target.value })} required>
                <option value="">Select diagnostic test</option>
                {catalog.map(test => <option value={test.TEST_ID} key={test.TEST_ID}>{test.TEST_NAME} · {money(test.PRICE)}</option>)}
              </Select>
              <Input label="Preferred date *" type="date" min={todayString()} value={form.booking_date} onChange={event => setForm({ ...form, booking_date: event.target.value })} required />
              <Textarea label="Notes" rows="3" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
              <Btn type="submit" disabled={submitting}>
                {submitting && <span className="spinner"></span>}
                {submitting ? "Booking..." : "Request test booking"}
              </Btn>
            </form>
          )}
        </Card>
        <Card>
          <h2>My test requests</h2>
          {bookings.length === 0 ? <Empty title="No test requests" detail="Select a diagnostic test to begin." /> :
            bookings.map(item => (
              <div className="list-row expanded" key={item.BOOKING_ID}>
                <div>
                  <strong>{item.TEST_NAME}</strong>
                  <small>{item.BOOKING_DATE} · {money(item.PRICE)}</small>
                  {item.SHARED_WITH && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      📤 Shared: <strong style={{ color: 'var(--primary)' }}>{item.SHARED_WITH}</strong>
                    </div>
                  )}
                </div>
                <div className="row-actions">
                  <Badge status={item.STATUS} />
                  {["Pending", "Approved"].includes(item.STATUS) && <button className="link-danger" onClick={() => cancel(item.BOOKING_ID)}>Cancel</button>}
                  {item.STATUS === "Completed" && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Btn variant="secondary" onClick={() => setViewingReport(item)}>View Report</Btn>
                      <Btn variant="ghost" onClick={() => { setSharingReport(item); setShareSuccess(false); setIsSendingShare(false); setShareDetails({ name: "", email: "", doctorId: "" }); }} style={{ color: "var(--primary)", border: "1px solid rgba(255,122,24,0.15)" }}>Share</Btn>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </Card>
      </div>

      {viewingReport && (
        <Modal title="Laboratory Report" onClose={() => setViewingReport(null)}>
          <div className="clinic-report-card">
            <div className="clinic-report-header">
              <div className="clinic-report-logo">+ CLINICOS DIAGNOSTIC LABS</div>
              <div className="clinic-report-subtitle">Accredited Clinical Pathology & Diagnostics</div>
            </div>
            <div className="clinic-report-title">LABORATORY INVESTIGATION REPORT</div>
            <div className="clinic-report-meta">
              <div className="clinic-report-meta-item">
                <span>Patient Name:</span>
                <strong>{user?.FULL_NAME || "Patient"}</strong>
              </div>
              <div className="clinic-report-meta-item">
                <span>Reference ID:</span>
                <strong>TX-BOOK-{viewingReport.BOOKING_ID}</strong>
              </div>
              <div className="clinic-report-meta-item">
                <span>Test Name:</span>
                <strong>{viewingReport.TEST_NAME}</strong>
              </div>
              <div className="clinic-report-meta-item">
                <span>Report Date:</span>
                <strong>{viewingReport.BOOKING_DATE}</strong>
              </div>
              <div className="clinic-report-meta-item">
                <span>Status:</span>
                <strong>{viewingReport.STATUS}</strong>
              </div>
              <div className="clinic-report-meta-item">
                <span>Price Paid:</span>
                <strong>{money(viewingReport.PRICE)}</strong>
              </div>
            </div>
            
            <div className="clinic-report-section">
              <h4>Findings & Observations</h4>
              <p>{viewingReport.RESULTS || "No observations recorded."}</p>
            </div>
            
            <div className="clinic-report-section">
              <h4>Pathologist Sign-off</h4>
              <div className="clinic-report-sign-off">
                <div className="signature-block">
                  <div className="signature-handwritten">Dr. Souvik Sinhababu</div>
                  <strong>Dr. Souvik Sinhababu</strong>
                  <div>Chief Pathologist, ClinicOS</div>
                </div>
              </div>
            </div>
          </div>
          <div className="print-report-container">
            <Btn onClick={() => window.print()}>Print / Download PDF</Btn>
            <Btn variant="ghost" onClick={() => setViewingReport(null)}>Close</Btn>
          </div>
        </Modal>
      )}

      {sharingReport && (
        <Modal title={`Share Report: ${sharingReport.TEST_NAME}`} onClose={() => setSharingReport(null)}>
          {shareSuccess ? (
            <SuccessCheckmark 
              message={`Test report for "${sharingReport.TEST_NAME}" has been shared successfully with ${shareDetails.name || shareDetails.email}.`}
              onClose={() => setSharingReport(null)}
            />
          ) : isSendingShare ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <h3 style={{ marginBottom: "14px", color: "#fff" }}>Sharing Report...</h3>
              <div className="plane-wrapper">
                <div className="paper-plane">✈️</div>
              </div>
              <p className="muted">Encrypting data and sending secure copy...</p>
            </div>
          ) : (
            <form onSubmit={handleShare} className="stack">
              <div>
                <p className="muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
                  Choose a registered clinic specialist to share this report directly, or enter an external doctor's email.
                </p>
                <Select 
                  label="Select Clinic Doctor Specialist"
                  value={shareDetails.doctorId}
                  onChange={e => selectShareDoctor(e.target.value)}
                >
                  <option value="">Choose clinic doctor...</option>
                  {clinicDoctors.map(doc => (
                    <option key={doc.DOCTOR_ID} value={doc.DOCTOR_ID}>
                      Dr. {doc.FIRST_NAME} {doc.LAST_NAME} ({doc.SPECIALIZATION})
                    </option>
                  ))}
                </Select>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px" }}>
                <Input 
                  label="Or Recipient Name" 
                  placeholder="e.g. Dr. Jane Smith" 
                  value={shareDetails.name} 
                  onChange={e => setShareDetails({ ...shareDetails, name: e.target.value, doctorId: "" })}
                />
                <Input 
                  label="Recipient Email Address *" 
                  type="email"
                  placeholder="doctor@example.com" 
                  value={shareDetails.email} 
                  onChange={e => setShareDetails({ ...shareDetails, email: e.target.value, doctorId: "" })}
                  required
                />
              </div>
              <div className="form-actions" style={{ marginTop: '10px' }}>
                <Btn type="submit">Share Report</Btn>
                <Btn type="button" variant="ghost" onClick={() => setSharingReport(null)}>Cancel</Btn>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

function MyBills({ toast }) {
  const [bills, setBills] = useState([]);
  const [payingBill, setPayingBill] = useState(null);
  const [method, setMethod] = useState("Card");
  const [processing, setProcessing] = useState(false);
  const [paymentSuccessRef, setPaymentSuccessRef] = useState(null);
  const [formDetails, setFormDetails] = useState({ cardNumber: "", expiry: "", cvv: "", name: "", upiId: "", bank: "SBI" });
  const [isFlipped, setIsFlipped] = useState(false);

  const loadBills = useCallback(() => {
    api.get("/bills/mine").then(setBills).catch(error => toast(error.message, "error"));
  }, [toast]);

  useEffect(() => {
    let active = true;
    api.get("/bills/mine").then(rows => { if (active) setBills(rows); }).catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);

  const handlePay = async (event) => {
    event.preventDefault();
    if (!payingBill) return;
    setProcessing(true);
    try {
      const ref = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await api.put(`/bills/${payingBill.BILL_ID}/pay`, {
        payment_method: method,
        transaction_ref: ref
      });
      setPaymentSuccessRef({ ref, amount: payingBill.TOTAL_AMOUNT });
      playSound("transaction");
      setFormDetails({ cardNumber: "", expiry: "", cvv: "", name: "", upiId: "", bank: "SBI" });
      loadBills();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <PageHeader title="My Bills" subtitle="Bills issued by the hospital appear here for your records." />
      <Card>
        {bills.length === 0 ? <Empty title="No bills issued" detail="There are currently no charges on your account." /> :
          bills.map(bill => (
            <div className="request-row" key={bill.BILL_ID}>
              <div>
                <h3>{bill.DESCRIPTION}</h3>
                <p>Issued {bill.CREATED_AT}{bill.DUE_DATE && ` · Due ${bill.DUE_DATE}`}</p>
                {bill.TRANSACTION_REF && (
                  <small style={{ color: "var(--success)", display: "block", marginTop: "4px" }}>
                    ✓ Transaction Ref: {bill.TRANSACTION_REF} ({bill.PAYMENT_METHOD})
                  </small>
                )}
              </div>
              <div className="bill-total">
                <strong>{money(bill.TOTAL_AMOUNT)}</strong>
                <Badge status={bill.PAYMENT_STATUS} />
                {bill.PAYMENT_STATUS === "Pending" && (
                  <Btn variant="primary" onClick={() => setPayingBill(bill)}>Pay Now</Btn>
                )}
              </div>
            </div>
          ))}
      </Card>

      {payingBill && (
        <Modal title="Secure Checkout" onClose={() => { setPayingBill(null); setPaymentSuccessRef(null); setIsFlipped(false); }}>
          {paymentSuccessRef ? (
            <SuccessCheckmark
              message={`Payment of ${money(paymentSuccessRef.amount)} successful. Transaction reference ID: ${paymentSuccessRef.ref}`}
              onClose={() => { setPayingBill(null); setPaymentSuccessRef(null); setIsFlipped(false); }}
            />
          ) : (
            <div className="stack" style={{ gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "12px" }}>
                <span className="muted">Total Payable:</span>
                <strong style={{ color: "var(--primary)", fontSize: "18px" }}>{money(payingBill.TOTAL_AMOUNT)}</strong>
              </div>

              <div>
                <label className="label" style={{ marginBottom: "8px", display: "block", fontSize: "13px", fontWeight: "bold" }}>Payment Method</label>
                <div className="payment-method-select">
                  {["Card", "UPI", "Net Banking"].map(m => (
                    <div
                      key={m}
                      className={`payment-method-card ${method === m ? "active" : ""}`}
                      onClick={() => setMethod(m)}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {method === "Card" && (
                <div className={`credit-card-container ${isFlipped ? "flipped" : ""}`} style={{ animation: "pageFadeIn 0.3s ease" }}>
                  <div className="credit-card-3d">
                    <div className="credit-card-front">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="card-chip"></div>
                        <span className="card-logo">ClinicOS Pay</span>
                      </div>
                      <div className="card-number-display">
                        {formDetails.cardNumber || "•••• •••• •••• ••••"}
                      </div>
                      <div className="card-lower">
                        <div>
                          <small style={{ fontSize: "8px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", display: "block" }}>Card Holder</small>
                          <span className="card-holder-name">{formDetails.name || "YOUR NAME"}</span>
                        </div>
                        <div>
                          <small style={{ fontSize: "8px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", display: "block" }}>Expires</small>
                          <span className="card-expiry-display">{formDetails.expiry || "MM/YY"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="credit-card-back">
                      <div className="card-magnetic-strip"></div>
                      <div>
                        <small style={{ fontSize: "8px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", display: "block", paddingLeft: "20px" }}>CVV</small>
                        <div className="card-signature-area">
                          {formDetails.cvv || "•••"}
                        </div>
                      </div>
                      <div style={{ padding: "0 20px 4px", display: "flex", justifyContent: "flex-end" }}>
                        <span className="card-logo" style={{ fontSize: "13px" }}>ClinicOS Pay</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handlePay} className="payment-grid">
                {method === "Card" && (
                  <>
                    <Input
                      label="Cardholder Name"
                      placeholder="Souvik Sinhababu"
                      value={formDetails.name}
                      onChange={e => setFormDetails({ ...formDetails, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Card Number"
                      placeholder="1234 5678 1234 5678"
                      maxLength="19"
                      value={formDetails.cardNumber}
                      onChange={e => {
                        let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                        let matches = val.match(/\d{4,16}/g);
                        let match = matches && matches[0] || '';
                        let parts = [];
                        for (let i=0, len=match.length; i<len; i+=4) {
                          parts.push(match.substring(i, i+4));
                        }
                        if (parts.length > 0) {
                          setFormDetails({ ...formDetails, cardNumber: parts.join(' ') });
                        } else {
                          setFormDetails({ ...formDetails, cardNumber: val });
                        }
                      }}
                      required
                    />
                    <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <Input
                        label="Expiry Date"
                        placeholder="MM/YY"
                        maxLength="5"
                        value={formDetails.expiry}
                        onChange={e => {
                          let val = e.target.value.replace(/[^0-9]/g, '');
                          if (val.length >= 2) {
                            setFormDetails({ ...formDetails, expiry: val.substring(0,2) + '/' + val.substring(2,4) });
                          } else {
                            setFormDetails({ ...formDetails, expiry: val });
                          }
                        }}
                        required
                      />
                      <Input
                        label="CVV"
                        type="password"
                        placeholder="•••"
                        maxLength="3"
                        value={formDetails.cvv}
                        onChange={e => setFormDetails({ ...formDetails, cvv: e.target.value.replace(/[^0-9]/g, '') })}
                        onFocus={() => setIsFlipped(true)}
                        onBlur={() => setIsFlipped(false)}
                        required
                      />
                    </div>
                  </>
                )}

                {method === "UPI" && (
                  <Input
                    label="UPI ID (VPA)"
                    placeholder="username@bank"
                    value={formDetails.upiId}
                    onChange={e => setFormDetails({ ...formDetails, upiId: e.target.value })}
                    required
                  />
                )}

                {method === "Net Banking" && (
                  <Select
                    label="Select Bank"
                    value={formDetails.bank}
                    onChange={e => setFormDetails({ ...formDetails, bank: e.target.value })}
                    required
                  >
                    <option value="SBI">State Bank of India</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="AXIS">Axis Bank</option>
                  </Select>
                )}

                <Btn type="submit" disabled={processing} style={{ marginTop: "12px" }}>
                  {processing && <span className="spinner"></span>}
                  {processing ? "Processing Payment..." : `Pay ${money(payingBill.TOTAL_AMOUNT)}`}
                </Btn>
              </form>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

function AuthorityDashboard({ setPage, toast }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([api.get("/patients"), api.get("/doctors"), api.get("/appointments"), api.get("/tests/requests"), api.get("/bills")])
      .then(([patients, doctors, appointments, tests, bills]) => {
        if (active) setStats({ patients, doctors, appointments, tests, bills });
      }).catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);
  if (!stats) return <Empty title="Loading authority dashboard" detail="" />;
  const pendingVisits = stats.appointments.filter(row => row.STATUS === "Pending").length;
  const pendingTests = stats.tests.filter(row => row.STATUS === "Pending").length;
  return (
    <>
      <PageHeader title="Authority Dashboard" subtitle="Review care requests and manage daily hospital operations." />
      <div className="stats-grid">
        <Stat label="Patients" value={stats.patients.length} accent="#3669ef" />
        <Stat label="Doctors" value={stats.doctors.length} accent="#7d4cdb" />
        <Stat label="Pending visits" value={pendingVisits} accent="#ef7f36" />
        <Stat label="Pending tests" value={pendingTests} accent="#16a273" />
      </div>
      <div className="two-columns">
        <Card>
          <h2>Approval queue</h2>
          <p className="muted">{pendingVisits} appointment requests and {pendingTests} diagnostic requests await action.</p>
          <div className="action-stack"><Btn onClick={() => setPage("appointments")}>Review appointments</Btn><Btn variant="secondary" onClick={() => setPage("test-requests")}>Review diagnostic tests</Btn></div>
        </Card>
        <Card>
          <h2>Billing</h2>
          <p className="muted">{stats.bills.length} bills have been issued in the system.</p>
          <Btn variant="ghost" onClick={() => setPage("billing")}>Issue or manage bills</Btn>
        </Card>
      </div>
    </>
  );
}

function AuthorityPatients({ toast }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [activeTimeline, setActiveTimeline] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const load = useCallback(() => api.get("/patients").then(setPatients).catch(error => toast(error.message, "error")), [toast]);
  useEffect(() => {
    let active = true;
    api.get("/patients").then(rows => { if (active) setPatients(rows); }).catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/patients/${editing.PATIENT_ID}`, {
        first_name: editing.FIRST_NAME, last_name: editing.LAST_NAME, date_of_birth: editing.DATE_OF_BIRTH,
        gender: editing.GENDER, email: editing.EMAIL, phone: editing.PHONE, address: editing.ADDRESS, blood_group: editing.BLOOD_GROUP,
      });
      toast("Patient record updated.");
      setEditing(null);
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  const remove = async (id) => {
    if (!confirm("Delete this patient and linked care records?")) return;
    try {
      await api.del(`/patients/${id}`);
      toast("Patient record deleted.");
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const fetchTimeline = async (patient) => {
    setViewingPatient(patient);
    setLoadingTimeline(true);
    try {
      const data = await api.get(`/patients/${patient.PATIENT_ID}/activity`);
      setActiveTimeline(data);
    } catch (error) {
      toast(error.message, "error");
      setViewingPatient(null);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const getTimelineEvents = (data) => {
    if (!data) return [];
    const events = [];
    if (data.appointments) {
      data.appointments.forEach(appt => {
        events.push({
          date: appt.APPT_DATE,
          sortDate: appt.APPT_DATE,
          type: "appointment",
          title: "Appointment Scheduled",
          desc: `${appt.DOCTOR_NAME} (${appt.SPECIALIZATION})`,
          detail: `Time: ${appt.APPT_TIME} | Reason: ${appt.REASON || "N/A"} | Status: ${appt.STATUS}`
        });
      });
    }
    if (data.tests) {
      data.tests.forEach(test => {
        events.push({
          date: test.BOOKING_DATE,
          sortDate: test.BOOKING_DATE,
          type: "test",
          title: `Lab Test: ${test.TEST_NAME}`,
          desc: `Status: ${test.STATUS} | Reference price: ${money(test.PRICE)}`,
          detail: `Notes: ${test.NOTES || "N/A"}` + (test.RESULTS ? ` | Findings: ${test.RESULTS}` : "")
        });
      });
    }
    if (data.bills) {
      data.bills.forEach(bill => {
        const dateStr = bill.CREATED_AT ? bill.CREATED_AT.substring(0, 10) : "";
        events.push({
          date: dateStr,
          sortDate: bill.CREATED_AT,
          type: "billing",
          title: `Bill Issued: ${bill.DESCRIPTION}`,
          desc: `Amount: ${money(bill.TOTAL_AMOUNT)} | Status: ${bill.PAYMENT_STATUS}`,
          detail: bill.DUE_DATE ? `Due Date: ${bill.DUE_DATE}` : ""
        });
      });
    }
    if (data.payments) {
      data.payments.forEach(pay => {
        const dateStr = pay.PAYMENT_DATE ? pay.PAYMENT_DATE.substring(0, 10) : "";
        events.push({
          date: dateStr,
          sortDate: pay.PAYMENT_DATE,
          type: "payment",
          title: "Payment Received",
          desc: `Amount: ${money(pay.AMOUNT)} via ${pay.PAYMENT_METHOD}`,
          detail: `Ref: ${pay.TRANSACTION_REF} | For: ${pay.BILL_DESCRIPTION}`
        });
      });
    }
    events.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
    return events;
  };

  const filtered = patients.filter(patient => `${patient.FIRST_NAME} ${patient.LAST_NAME} ${patient.EMAIL} ${patient.PHONE}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeader title="Patient Records" subtitle="Maintain registered patient contact and clinical information." />
      {editing && <Card className="edit-panel"><form className="form-grid" onSubmit={save}>
        <Input label="First name" value={editing.FIRST_NAME} onChange={event => setEditing({ ...editing, FIRST_NAME: event.target.value })} required />
        <Input label="Last name" value={editing.LAST_NAME} onChange={event => setEditing({ ...editing, LAST_NAME: event.target.value })} required />
        <Input label="DOB" type="date" value={editing.DATE_OF_BIRTH} onChange={event => setEditing({ ...editing, DATE_OF_BIRTH: event.target.value })} required />
        <Input label="Phone" value={editing.PHONE} onChange={event => setEditing({ ...editing, PHONE: event.target.value })} required />
        <Input label="Email" value={editing.EMAIL || ""} onChange={event => setEditing({ ...editing, EMAIL: event.target.value })} required />
        <Input label="Address" value={editing.ADDRESS || ""} onChange={event => setEditing({ ...editing, ADDRESS: event.target.value })} />
        <div className="form-actions"><Btn type="submit">Save record</Btn><Btn type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn></div>
      </form></Card>}
      <Card>
        <input className="search" placeholder="Search patients..." value={search} onChange={event => setSearch(event.target.value)} />
        <div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Blood group</th><th /></tr></thead>
          <tbody>{filtered.map(patient => (
            <tr key={patient.PATIENT_ID}>
              <td>{patient.FIRST_NAME} {patient.LAST_NAME}</td>
              <td>{patient.PHONE}</td>
              <td>{patient.EMAIL}</td>
              <td>{patient.BLOOD_GROUP || "-"}</td>
              <td>
                <div className="inline-buttons">
                  <Btn variant="secondary" onClick={() => fetchTimeline(patient)} disabled={loadingTimeline}>History</Btn>
                  <Btn variant="ghost" onClick={() => setEditing(patient)}>Edit</Btn>
                  <Btn variant="danger" onClick={() => remove(patient.PATIENT_ID)}>Delete</Btn>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>

      {viewingPatient && (
        <Modal title={`Patient History Timeline — ${viewingPatient.FIRST_NAME} ${viewingPatient.LAST_NAME}`} onClose={() => { setViewingPatient(null); setActiveTimeline(null); }}>
          {loadingTimeline ? (
            <div className="timeline" style={{ padding: '20px' }}>
              {[1, 2, 3].map(i => (
                <div className="timeline-item" key={i} style={{ marginBottom: '20px' }}>
                  <div className="timeline-dot" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  <div className="timeline-content">
                    <h4>
                      <span className="skeleton" style={{ width: '120px', height: '14px', marginBottom: '8px' }}></span>
                      <span className="skeleton" style={{ width: '60px', height: '11px' }}></span>
                    </h4>
                    <p style={{ margin: "6px 0 4px" }}><span className="skeleton" style={{ width: '80%', height: '16px' }}></span></p>
                    <p><span className="skeleton" style={{ width: '50%', height: '12px' }}></span></p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeTimeline && (
                <>
                  <div className="patient-info-summary">
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>Contact Info</span>
                      <strong>{activeTimeline.patient.PHONE}</strong>
                      <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>{activeTimeline.patient.EMAIL}</small>
                    </div>
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>Blood Group</span>
                      <strong>{activeTimeline.patient.BLOOD_GROUP || "Unknown"}</strong>
                    </div>
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>Gender / DOB</span>
                      <strong>{activeTimeline.patient.GENDER} ({activeTimeline.patient.DATE_OF_BIRTH})</strong>
                    </div>
                  </div>
                  <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '6px' }}>
                    {getTimelineEvents(activeTimeline).length === 0 ? (
                      <Empty title="No activity recorded" detail="This patient has no appointment or medical billing records." />
                    ) : (
                      <div className="timeline">
                        {getTimelineEvents(activeTimeline).map((event, idx) => (
                          <div className="timeline-item" key={idx}>
                            <div className={`timeline-dot ${event.type}`} />
                            <div className="timeline-content">
                              <h4>
                                <span>{event.title}</span>
                                <span>{event.date}</span>
                              </h4>
                              <p style={{ margin: "4px 0", color: "#fff", fontWeight: "600" }}>{event.desc}</p>
                              {event.detail && <p style={{ fontSize: "12px", opacity: 0.85 }}>{event.detail}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function AuthorityDoctors({ toast }) {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(DOCTOR_FORM);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = useCallback(
    () =>
      Promise.all([api.get("/doctors"), api.get("/departments")])
        .then(([d, p]) => {
          setDoctors(d);
          setDepartments(p);
        })
        .catch((error) => toast(error.message, "error")),
    [toast]
  );
  useEffect(() => {
    let active = true;
    Promise.all([api.get("/doctors"), api.get("/departments")])
      .then(([d, p]) => {
        if (active) {
          setDoctors(d);
          setDepartments(p);
        }
      })
      .catch((error) => toast(error.message, "error"));
    return () => {
      active = false;
    };
  }, [toast]);

  const submit = async (event) => {
    event.preventDefault();

    try {
      if (editing) {
        await api.put(`/doctors/${editing.DOCTOR_ID}`, {
          first_name: form.first_name,
          last_name: form.last_name,
          specialization: form.specialization,
          dept_id: form.dept_id,
          email: form.email,
          phone: form.phone,
          available_days: form.available_days,
          fees: form.fees,
        });

        toast("Doctor details updated.");
      } else {
        await api.post("/doctors", form);
        toast("Doctor added to the directory.");
      }

      setOpen(false);
      setEditing(null);
      setForm(DOCTOR_FORM);
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this doctor and linked appointments?")) return;
    try {
      await api.del(`/doctors/${id}`);
      toast("Doctor deleted.");
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const editDoctor = (doctor) => {
    setEditing(doctor);
    setForm({
      first_name: doctor.FIRST_NAME || "",
      last_name: doctor.LAST_NAME || "",
      specialization: doctor.SPECIALIZATION || "",
      dept_id: doctor.DEPT_ID || "",
      email: doctor.EMAIL || "",
      phone: doctor.PHONE || "",
      available_days: doctor.AVAILABLE_DAYS || "",
      fees: doctor.FEES || 0,
    });
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Doctors"
        subtitle="Manage specialists available to patients."
        action={
          <Btn
            onClick={() => {
              setOpen(!open);
              if (open) {
                setEditing(null);
                setForm(DOCTOR_FORM);
              }
            }}
          >
            {open ? "Close" : "Add doctor"}
          </Btn>
        }
      />
      {open && (
        <Modal 
          title={editing ? "Edit Doctor Specialist" : "Add Doctor Specialist"} 
          onClose={() => {
            setOpen(false);
            setEditing(null);
            setForm(DOCTOR_FORM);
          }}
        >
          <form className="form-grid" onSubmit={submit}>
            <Input
              label="First name *"
              value={form.first_name}
              onChange={(event) =>
                setForm({ ...form, first_name: event.target.value })
              }
              required
            />
            <Input
              label="Last name *"
              value={form.last_name}
              onChange={(event) =>
                setForm({ ...form, last_name: event.target.value })
              }
              required
            />
            <Select
              label="Department *"
              value={form.dept_id}
              onChange={(event) =>
                setForm({ ...form, dept_id: event.target.value })
              }
              required
            >
              <option value="">Select</option>
              {departments.map((dept) => (
                <option key={dept.DEPT_ID} value={dept.DEPT_ID}>
                  {dept.DEPT_NAME}
                </option>
              ))}
            </Select>
            <Input
              label="Specialization"
              value={form.specialization}
              onChange={(event) =>
                setForm({ ...form, specialization: event.target.value })
              }
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
            <Input
              label="Available days"
              value={form.available_days}
              onChange={(event) =>
                setForm({ ...form, available_days: event.target.value })
              }
            />
            <Input
              label="Consultation Fees (INR) *"
              type="number"
              min="0"
              value={form.fees}
              onChange={(event) =>
                setForm({ ...form, fees: event.target.value })
              }
              required
            />
            <div className="form-actions" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "10px" }}>
              <Btn type="submit">
                {editing ? "Update doctor" : "Save doctor"}
              </Btn>
              <Btn
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setForm(DOCTOR_FORM);
                  setOpen(false);
                }}
              >
                Cancel
              </Btn>
            </div>
          </form>
        </Modal>
      )}
      {!doctors.length ? (
        <Empty title="No doctors registered" detail="Click 'Add doctor' to register a specialist." />
      ) : (
        <div className="departments-doctors-groups">
          {departments.map((dept) => {
            const deptDocs = doctors.filter((doc) => doc.DEPT_ID === dept.DEPT_ID);
            if (deptDocs.length === 0) return null;
            return (
              <div key={dept.DEPT_ID} className="dept-group-section" style={{ marginBottom: "32px" }}>
                <h2 style={{
                  fontSize: "17px",
                  fontWeight: "800",
                  color: "var(--primary)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  paddingBottom: "8px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span>{dept.DEPT_NAME}</span>
                  <span style={{ fontSize: "12px", background: "rgba(255, 122, 24, 0.08)", color: "var(--primary)", padding: "2px 8px", borderRadius: "12px", fontWeight: "700" }}>
                    {deptDocs.length} {deptDocs.length === 1 ? "Doctor" : "Doctors"}
                  </span>
                </h2>
                <div className="directory-grid">
                  {deptDocs.map((doctor) => (
                    <Card key={doctor.DOCTOR_ID} className="doctor">
                      <strong>
                        Dr. {doctor.FIRST_NAME} {doctor.LAST_NAME}
                      </strong>

                      <p>{doctor.SPECIALIZATION}</p>

                      <small>
                        {doctor.DEPT_NAME} ·{" "}
                        {doctor.AVAILABLE_DAYS || "Availability pending"}
                        {" · "}Fees: {money(doctor.FEES)}
                      </small>

                      <div className="inline-buttons">
                        <Btn variant="ghost" onClick={() => editDoctor(doctor)}>
                          Edit
                        </Btn>

                        <Btn
                          variant="danger"
                          onClick={() => remove(doctor.DOCTOR_ID)}
                        >
                          Delete
                        </Btn>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {doctors.filter((doc) => !departments.some((dept) => dept.DEPT_ID === doc.DEPT_ID)).length > 0 && (
            <div className="dept-group-section" style={{ marginBottom: "32px" }}>
              {(() => {
                const unassignedDocs = doctors.filter((doc) => !departments.some((dept) => dept.DEPT_ID === doc.DEPT_ID));
                return (
                  <>
                    <h2 style={{
                      fontSize: "17px",
                      fontWeight: "800",
                      color: "var(--primary)",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      paddingBottom: "8px",
                      marginBottom: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <span>Other / Unassigned Specialists</span>
                      <span style={{ fontSize: "12px", background: "rgba(255, 122, 24, 0.08)", color: "var(--primary)", padding: "2px 8px", borderRadius: "12px", fontWeight: "700" }}>
                        {unassignedDocs.length} {unassignedDocs.length === 1 ? "Doctor" : "Doctors"}
                      </span>
                    </h2>
                    <div className="directory-grid">
                      {unassignedDocs.map((doctor) => (
                        <Card key={doctor.DOCTOR_ID} className="doctor">
                          <strong>
                            Dr. {doctor.FIRST_NAME} {doctor.LAST_NAME}
                          </strong>

                          <p>{doctor.SPECIALIZATION}</p>

                          <small>
                            General ·{" "}
                            {doctor.AVAILABLE_DAYS || "Availability pending"}
                            {" · "}Fees: {money(doctor.FEES)}
                          </small>

                          <div className="inline-buttons">
                            <Btn variant="ghost" onClick={() => editDoctor(doctor)}>
                              Edit
                            </Btn>

                            <Btn
                              variant="danger"
                              onClick={() => remove(doctor.DOCTOR_ID)}
                            >
                              Delete
                            </Btn>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------
// Staff Accounts Manager & Doctor Console Components
// ----------------------------------------------------

function AuthorityStaff({ toast }) {
  const [staff, setStaff] = useState([]);
  const [unregisteredDoctors, setUnregisteredDoctors] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "ADMIN",
    doctor_id: ""
  });

  const load = useCallback(() => {
    Promise.all([
      api.get("/auth/staff"),
      api.get("/auth/unregistered-doctors")
    ])
      .then(([s, ud]) => {
        setStaff(s);
        setUnregisteredDoctors(ud);
      })
      .catch(error => toast(error.message, "error"));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/create-staff", form);
      toast("Staff account created successfully!");
      setOpen(false);
      setForm({
        full_name: "",
        email: "",
        password: "",
        role: "ADMIN",
        doctor_id: ""
      });
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const remove = async (id) => {
    if (!confirm("Are you sure you want to delete this staff member? This will delete their login credentials, but keep their registered doctor profile intact.")) return;
    try {
      await api.del(`/auth/staff/${id}`);
      toast("Staff account deleted.");
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Staff Accounts"
        subtitle="Manage hospital authority (Admin) and specialist (Doctor) login accounts."
        action={<Btn onClick={() => setOpen(true)}>Create Staff Account</Btn>}
      />

      <Card>
        <h2>Current Staff</h2>
        {staff.length === 0 ? (
          <Empty title="No staff members found" detail="" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "12px", color: "var(--muted)", fontWeight: 700 }}>Name</th>
                  <th style={{ padding: "12px", color: "var(--muted)", fontWeight: 700 }}>Email</th>
                  <th style={{ padding: "12px", color: "var(--muted)", fontWeight: 700 }}>Role</th>
                  <th style={{ padding: "12px", color: "var(--muted)", fontWeight: 700 }}>Created Date</th>
                  <th style={{ padding: "12px", color: "var(--muted)", fontWeight: 700, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(u => (
                  <tr key={u.USER_ID} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{u.FULL_NAME}</td>
                    <td style={{ padding: "12px" }}>{u.EMAIL}</td>
                    <td style={{ padding: "12px" }}>
                      <span className={`status-pill ${u.ROLE === "ADMIN" ? "high" : "tracked"}`}>
                        {u.ROLE}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>{u.CREATED_AT}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button
                        onClick={() => remove(u.USER_ID)}
                        style={{
                          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                          color: "#ef4444", borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                          fontSize: 12, fontWeight: 600
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && (
        <Modal title="Create Staff Account" onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={submit}>
            <Select
              label="Role *"
              value={form.role}
              onChange={e => setForm({
                ...form,
                role: e.target.value,
                full_name: "",
                email: "",
                doctor_id: ""
              })}
              required
            >
              <option value="ADMIN">ADMIN</option>
              <option value="DOCTOR">DOCTOR</option>
            </Select>

            {form.role === "ADMIN" ? (
              <>
                <Input
                  label="Full Name *"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  required
                />
                <Input
                  label="Email Address *"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </>
            ) : (
              <>
                <Select
                  label="Select Doctor *"
                  value={form.doctor_id}
                  onChange={e => {
                    const docId = e.target.value;
                    const selectedDoc = unregisteredDoctors.find(d => String(d.DOCTOR_ID) === String(docId));
                    setForm({
                      ...form,
                      doctor_id: docId,
                      email: selectedDoc ? (selectedDoc.EMAIL || "") : ""
                    });
                  }}
                  required
                >
                  <option value="">Select a registered doctor</option>
                  {unregisteredDoctors.map(d => (
                    <option key={d.DOCTOR_ID} value={d.DOCTOR_ID}>
                      Dr. {d.FIRST_NAME} {d.LAST_NAME}
                    </option>
                  ))}
                </Select>

                {form.doctor_id && (
                  <Input
                    label="Email Address *"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                )}

                {unregisteredDoctors.length === 0 && (
                  <div className="span-all" style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                    ⚠️ No unregistered doctor profiles available in the directory. Please add a doctor in the Department Manager first.
                  </div>
                )}
              </>
            )}

            <Input
              label="Password *"
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />

            <div className="span-all" style={{ marginTop: 16 }}>
              <Btn type="submit" disabled={form.role === "DOCTOR" && !form.doctor_id}>Create Account</Btn>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function DoctorDashboard({ user, setPage, toast }) {
  const [stats, setStats] = useState({ appointments: 0, patients: 0, reports: 0 });
  const [upcoming, setUpcoming] = useState([]);
  
  useEffect(() => {
    Promise.all([
      api.get("/doctors/me/appointments"),
      api.get("/doctors/me/patients"),
      api.get("/doctors/me/shared-reports")
    ])
      .then(([appts, pts, rpts]) => {
        setStats({
          appointments: appts.filter(a => a.STATUS === "Scheduled" || a.STATUS === "Approved" || a.STATUS === "Pending").length,
          patients: pts.length,
          reports: rpts.length
        });
        
        const today = todayString();
        const upcomingAppts = appts.filter(a => a.APPT_DATE >= today && ["Pending", "Approved", "Scheduled"].includes(a.STATUS));
        setUpcoming(upcomingAppts.slice(0, 5));
      })
      .catch(err => toast(err.message, "error"));
  }, [toast]);

  return (
    <>
      <PageHeader title="Doctor Console" subtitle={`Welcome back, ${user.FULL_NAME}`} />
      
      <div className="vitals-summary-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="vital-summary-card weight" style={{ cursor: "pointer" }} onClick={() => setPage("appointments")}>
          <div className="vital-icon">📅</div>
          <div className="vital-value">{stats.appointments}</div>
          <div className="vital-label">Active Appointments</div>
        </div>
        <div className="vital-summary-card blood-pressure" style={{ cursor: "pointer" }} onClick={() => setPage("patients")}>
          <div className="vital-icon">👥</div>
          <div className="vital-value">{stats.patients}</div>
          <div className="vital-label">My Patients</div>
        </div>
        <div className="vital-summary-card blood-sugar" style={{ cursor: "pointer" }} onClick={() => setPage("shared-reports")}>
          <div className="vital-icon">🧪</div>
          <div className="vital-value">{stats.reports}</div>
          <div className="vital-label">Shared Test Reports</div>
        </div>
      </div>

      <Card>
        <h2>📅 Upcoming Schedule</h2>
        {upcoming.length === 0 ? (
          <Empty title="No upcoming appointments" detail="Your schedule is clear." />
        ) : (
          upcoming.map(appt => (
            <div className="list-row expanded" key={appt.APPT_ID}>
              <div>
                <strong>{appt.PATIENT_NAME}</strong>
                <small>{appt.APPT_DATE} · {appt.APPT_TIME}</small>
                {appt.REASON && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Reason: {appt.REASON}</p>}
              </div>
              <div className="row-actions">
                <Badge status={appt.STATUS} />
                <Btn variant="primary" onClick={() => setPage("appointments")}>Go to Appointments</Btn>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function DoctorAppointments({ user, toast }) {
  const [appointments, setAppointments] = useState([]);
  const [prescribeAppt, setPrescribeAppt] = useState(null);
  const [viewPrescAppt, setViewPrescAppt] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [form, setForm] = useState({ medicines: "", instructions: "" });

  const load = useCallback(() => {
    api.get("/doctors/me/appointments")
      .then(setAppointments)
      .catch(err => toast(err.message, "error"));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrescribe = async (e) => {
    e.preventDefault();
    try {
      await api.post("/prescriptions", {
        appointment_id: prescribeAppt.APPT_ID,
        medicines: form.medicines,
        instructions: form.instructions
      });
      toast("Prescription generated successfully!");
      setPrescribeAppt(null);
      setForm({ medicines: "", instructions: "" });
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const viewPrescription = async (appt) => {
    setViewPrescAppt(appt);
    try {
      const data = await api.get(`/prescriptions/appointment/${appt.APPT_ID}`);
      setPrescription(data);
    } catch (err) {
      toast(err.message, "error");
      setViewPrescAppt(null);
    }
  };

  return (
    <>
      <PageHeader title="My Appointments" subtitle="Manage patient consults and prescriptions." />
      
      <Card>
        {appointments.length === 0 ? (
          <Empty title="No appointments scheduled" detail="" />
        ) : (
          appointments.map(appt => (
            <div className="list-row expanded" key={appt.APPT_ID}>
              <div>
                <strong>{appt.PATIENT_NAME}</strong>
                <small>{appt.APPT_DATE} · {appt.APPT_TIME}</small>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  <span>Gender: {appt.GENDER}</span> · <span>DOB: {appt.DOB}</span> · <span>Phone: {appt.PHONE}</span>
                </div>
                {appt.REASON && <p style={{ margin: "6px 0 0", fontSize: 13 }}>Reason: {appt.REASON}</p>}
                {appt.NOTES && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Admin Notes: {appt.NOTES}</p>}
              </div>
              <div className="row-actions">
                <Badge status={appt.STATUS} />
                {(appt.STATUS === "Approved" || appt.STATUS === "Scheduled") && (
                  <Btn onClick={() => setPrescribeAppt(appt)}>✍️ Prescribe</Btn>
                )}
                {appt.STATUS === "Completed" && (
                  <Btn variant="ghost" onClick={() => viewPrescription(appt)}>📄 View Rx</Btn>
                )}
              </div>
            </div>
          ))
        )}
      </Card>

      {prescribeAppt && (
        <Modal title={`Write Prescription - ${prescribeAppt.PATIENT_NAME}`} onClose={() => setPrescribeAppt(null)}>
          <form className="stack" onSubmit={handlePrescribe}>
            <Textarea
              label="Medicines (e.g. Paracetamol 500mg 1-0-1, Amoxicillin 250mg 1-1-1) *"
              placeholder="List medicines with dosing pattern..."
              value={form.medicines}
              onChange={e => setForm({ ...form, medicines: e.target.value })}
              required
            />
            <Textarea
              label="Instructions"
              placeholder="e.g. Take after meals, complete 5 days course"
              value={form.instructions}
              onChange={e => setForm({ ...form, instructions: e.target.value })}
            />
            <div style={{ marginTop: 12 }}>
              <Btn type="submit">Submit Prescription & Complete Appointment</Btn>
            </div>
          </form>
        </Modal>
      )}

      {viewPrescAppt && (
        <Modal title={`Prescription - ${viewPrescAppt.PATIENT_NAME}`} onClose={() => { setViewPrescAppt(null); setPrescription(null); }}>
          {prescription ? (
            <div className="stack" style={{ gap: 16 }}>
              <div>
                <small style={{ color: "var(--muted)" }}>DATE & TIME</small>
                <div>{prescription.appt_date} · {prescription.appt_time}</div>
              </div>
              <div>
                <small style={{ color: "var(--muted)" }}>DOCTOR</small>
                <div>{prescription.doctor_name} ({prescription.specialization})</div>
              </div>
              <div>
                <small style={{ color: "var(--muted)" }}>MEDICINES</small>
                <div style={{ fontWeight: 600, whiteSpace: "pre-wrap" }}>{prescription.medicines}</div>
              </div>
              {prescription.instructions && (
                <div>
                  <small style={{ color: "var(--muted)" }}>INSTRUCTIONS</small>
                  <div style={{ whiteSpace: "pre-wrap" }}>{prescription.instructions}</div>
                </div>
              )}
            </div>
          ) : (
            <div>Loading prescription...</div>
          )}
        </Modal>
      )}
    </>
  );
}

function DoctorPatients({ user, toast }) {
  const [patients, setPatients] = useState([]);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [patientVitals, setPatientVitals] = useState([]);
  const [loadingVitals, setLoadingVitals] = useState(false);

  useEffect(() => {
    api.get("/doctors/me/patients")
      .then(setPatients)
      .catch(err => toast(err.message, "error"));
  }, [toast]);

  const viewPatientDetails = async (patient) => {
    setViewingPatient(patient);
    setLoadingVitals(true);
    try {
      const data = await api.get(`/patients/${patient.PATIENT_ID}/vitals`);
      setPatientVitals(data);
    } catch (err) {
      toast(err.message, "error");
      setPatientVitals([]);
    } finally {
      setLoadingVitals(false);
    }
  };

  return (
    <>
      <PageHeader title="My Patients" subtitle="View patient records and recorded vitals history." />
      
      <div className="two-columns">
        <Card>
          <h2>Patients List</h2>
          {patients.length === 0 ? (
            <Empty title="No patients found" detail="Patients who book appointments with you will appear here." />
          ) : (
            patients.map(p => (
              <div
                className={`list-row clickable ${viewingPatient?.PATIENT_ID === p.PATIENT_ID ? "active" : ""}`}
                key={p.PATIENT_ID}
                onClick={() => viewPatientDetails(p)}
                style={{ cursor: "pointer", background: viewingPatient?.PATIENT_ID === p.PATIENT_ID ? "var(--surface)" : "transparent" }}
              >
                <div>
                  <strong>{p.FIRST_NAME} {p.LAST_NAME}</strong>
                  <small>{p.EMAIL} · {p.PHONE}</small>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card>
          <h2>Patient Health Details</h2>
          {viewingPatient ? (
            <div className="stack" style={{ gap: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>{viewingPatient.FIRST_NAME} {viewingPatient.LAST_NAME}</h3>
                <small style={{ color: "var(--muted)" }}>Blood Group: {viewingPatient.BLOOD_GROUP || "N/A"} · Gender: {viewingPatient.GENDER}</small>
              </div>
              
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <h4>Vitals History</h4>
                {loadingVitals ? (
                  <div>Loading vitals...</div>
                ) : patientVitals.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>No vitals logged yet by this patient.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {patientVitals.map(v => (
                      <div key={v.VITAL_ID} style={{ padding: 10, background: "var(--surface)", borderRadius: 10, fontSize: 12 }}>
                        <strong>{v.CHECK_DATE}</strong>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginTop: 6 }}>
                          <div>Blood Pressure: <span style={{ fontWeight: 600 }}>{v.BLOOD_PRESSURE || "—"}</span></div>
                          <div>Blood Sugar: <span style={{ fontWeight: 600 }}>{v.BLOOD_SUGAR ? `${v.BLOOD_SUGAR} mg/dL` : "—"}</span></div>
                          <div>Weight: <span style={{ fontWeight: 600 }}>{v.WEIGHT ? `${v.WEIGHT} kg` : "—"}</span></div>
                          <div>Heart Rate: <span style={{ fontWeight: 600 }}>{v.HEART_RATE ? `${v.HEART_RATE} bpm` : "—"}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Empty title="No patient selected" detail="Click on a patient from the list to view their profile and vitals." />
          )}
        </Card>
      </div>
    </>
  );
}

function DoctorSharedReports({ user, toast }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api.get("/doctors/me/shared-reports")
      .then(setReports)
      .catch(err => toast(err.message, "error"));
  }, [toast]);

  return (
    <>
      <PageHeader title="Shared Diagnostic Reports" subtitle="View laboratory test results shared by patients." />
      
      <Card>
        {reports.length === 0 ? (
          <Empty title="No shared reports" detail="Diagnostic reports shared with your email will appear here." />
        ) : (
          reports.map(rep => (
            <div className="list-row expanded" key={rep.SHARE_ID}>
              <div>
                <strong>{rep.TEST_NAME}</strong>
                <small>Shared by {rep.PATIENT_NAME} on {rep.SHARED_AT}</small>
                <div style={{ margin: "8px 0 0", fontSize: 13, padding: 10, background: "var(--surface)", borderRadius: 10 }}>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>Results:</div>
                  <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{rep.RESULTS || "No findings recorded."}</p>
                  {rep.TEST_NOTES && (
                    <>
                      <div style={{ fontWeight: 600, color: "var(--muted)", marginTop: 6 }}>Notes:</div>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>{rep.TEST_NOTES}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function AuthorityDepartments({ toast }) {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ dept_name: "", location: "", phone: "" });
  const [addingDocDept, setAddingDocDept] = useState(null);
  const [docForm, setDocForm] = useState(DOCTOR_FORM);

  const load = useCallback(() => {
    Promise.all([api.get("/departments"), api.get("/doctors")])
      .then(([depts, docs]) => {
        setDepartments(depts);
        setDoctors(docs);
      })
      .catch(error => toast(error.message, "error"));
  }, [toast]);

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/departments"), api.get("/doctors")])
      .then(([depts, docs]) => {
        if (active) {
          setDepartments(depts);
          setDoctors(docs);
        }
      })
      .catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.post("/departments", form);
      toast("Department added.");
      setForm({ dept_name: "", location: "", phone: "" });
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this department and its linked doctors?")) return;
    try {
      await api.del(`/departments/${id}`);
      toast("Department deleted.");
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const submitDoctor = async (event) => {
    event.preventDefault();
    try {
      await api.post("/doctors", {
        ...docForm,
        dept_id: addingDocDept.DEPT_ID
      });
      toast(`Doctor added to ${addingDocDept.DEPT_NAME}.`);
      setAddingDocDept(null);
      setDocForm(DOCTOR_FORM);
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  return (
    <>
      <PageHeader title="Departments" subtitle="Maintain hospital services patients can browse." />
      <div className="two-columns">
        <Card>
          <h2>Add department</h2>
          <form className="stack" onSubmit={submit}>
            <Input label="Name *" value={form.dept_name} onChange={event => setForm({ ...form, dept_name: event.target.value })} required />
            <Input label="Location" value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} />
            <Input label="Phone" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} />
            <Btn type="submit">Save department</Btn>
          </form>
        </Card>
        <Card>
          <h2>Existing departments</h2>
          {departments.length === 0 ? (
            <Empty title="No departments" detail="Create a department to get started." />
          ) : (
            departments.map(dept => {
              const deptDocs = doctors.filter(doc => doc.DEPT_ID === dept.DEPT_ID);
              return (
                <div key={dept.DEPT_ID} style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "16px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <strong style={{ fontSize: "16px", color: "#fff" }}>{dept.DEPT_NAME}</strong>
                      <small style={{ display: "block", color: "var(--muted)", marginTop: "4px" }}>
                        📍 {dept.LOCATION || "No location"} · 📞 {dept.PHONE || "No phone"}
                      </small>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Btn variant="primary" style={{ padding: "4px 10px", fontSize: "11px", minHeight: "30px" }} onClick={() => {
                        setAddingDocDept(dept);
                        setDocForm({ ...DOCTOR_FORM, dept_id: dept.DEPT_ID });
                      }}>+ Add Doctor</Btn>
                      <Btn variant="danger" style={{ padding: "4px 10px", fontSize: "11px", minHeight: "30px" }} onClick={() => remove(dept.DEPT_ID)}>Delete</Btn>
                    </div>
                  </div>

                  <div className="department-doctors-list">
                    <h4 style={{ fontSize: "12px", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                      Doctors ({deptDocs.length})
                    </h4>
                    {deptDocs.length === 0 ? (
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic" }}>No doctors registered in this department.</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {deptDocs.map(doc => (
                          <div key={doc.DOCTOR_ID} style={{
                            background: "rgba(255, 122, 24, 0.06)",
                            border: "1px solid rgba(255, 122, 24, 0.15)",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            color: "#eee",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}>
                            <span style={{ fontWeight: "700", color: "var(--primary)" }}>Dr. {doc.FIRST_NAME} {doc.LAST_NAME}</span>
                            <span style={{ color: "var(--muted)" }}>({doc.SPECIALIZATION || "General"})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {addingDocDept && (
        <Modal 
          title={`Add Doctor Specialist to ${addingDocDept.DEPT_NAME}`} 
          onClose={() => {
            setAddingDocDept(null);
            setDocForm(DOCTOR_FORM);
          }}
        >
          <form className="form-grid" onSubmit={submitDoctor}>
            <Input
              label="First name *"
              value={docForm.first_name}
              onChange={(event) =>
                setDocForm({ ...docForm, first_name: event.target.value })
              }
              required
            />
            <Input
              label="Last name *"
              value={docForm.last_name}
              onChange={(event) =>
                setDocForm({ ...docForm, last_name: event.target.value })
              }
              required
            />
            <Input
              label="Department"
              value={addingDocDept.DEPT_NAME}
              disabled
              required
            />
            <Input
              label="Specialization"
              value={docForm.specialization}
              onChange={(event) =>
                setDocForm({ ...docForm, specialization: event.target.value })
              }
            />
            <Input
              label="Phone"
              value={docForm.phone}
              onChange={(event) =>
                setDocForm({ ...docForm, phone: event.target.value })
              }
            />
            <Input
              label="Email"
              type="email"
              value={docForm.email}
              onChange={(event) =>
                setDocForm({ ...docForm, email: event.target.value })
              }
            />
            <Input
              label="Available days"
              value={docForm.available_days}
              onChange={(event) =>
                setDocForm({ ...docForm, available_days: event.target.value })
              }
            />
            <Input
              label="Consultation Fees (INR) *"
              type="number"
              min="0"
              value={docForm.fees}
              onChange={(event) =>
                setDocForm({ ...docForm, fees: event.target.value })
              }
              required
            />
            <div className="form-actions" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "10px" }}>
              <Btn type="submit">Save doctor</Btn>
              <Btn
                type="button"
                variant="ghost"
                onClick={() => {
                  setAddingDocDept(null);
                  setDocForm(DOCTOR_FORM);
                }}
              >
                Cancel
              </Btn>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function AppointmentApprovals({ toast }) {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [prescribeAppt, setPrescribeAppt] = useState(null);
  const [activePrescription, setActivePrescription] = useState(null);
  const [medicines, setMedicines] = useState("");
  const [instructions, setInstructions] = useState("");

  const load = useCallback(() => api.get("/appointments").then(setItems).catch(error => toast(error.message, "error")), [toast]);
  useEffect(() => {
    let active = true;
    api.get("/appointments").then(rows => { if (active) setItems(rows); }).catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);
  const mark = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      toast(`Appointment marked ${status}.`);
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const submitPrescription = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prescriptions', {
        appointment_id: prescribeAppt.APPT_ID,
        medicines,
        instructions
      });
      toast("Prescription generated successfully.");
      setPrescribeAppt(null);
      setMedicines("");
      setInstructions("");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const viewPrescription = async (apptId) => {
    try {
      const data = await api.get(`/prescriptions/appointment/${apptId}`);
      setActivePrescription(data);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  // Filter items based on statusFilter
  const filteredItems = items.filter(item => {
    if (statusFilter === "all") return true;
    if (statusFilter === "Pending") return item.STATUS === "Pending";
    if (statusFilter === "Scheduled") return ["Approved", "Scheduled"].includes(item.STATUS);
    if (statusFilter === "Completed") return item.STATUS === "Completed";
    if (statusFilter === "others") return ["Rejected", "Cancelled", "No-Show"].includes(item.STATUS);
    return true;
  });

  // Sort items: Pending first, then Scheduled/Approved (earliest first), then others (latest first)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.STATUS === "Pending" && b.STATUS !== "Pending") return -1;
    if (a.STATUS !== "Pending" && b.STATUS === "Pending") return 1;

    const isApprSchedA = ["Approved", "Scheduled"].includes(a.STATUS);
    const isApprSchedB = ["Approved", "Scheduled"].includes(b.STATUS);
    if (isApprSchedA && !isApprSchedB) return -1;
    if (!isApprSchedA && isApprSchedB) return 1;

    const dateTimeA = new Date(`${a.APPT_DATE}T${a.APPT_TIME || "00:00:00"}`);
    const dateTimeB = new Date(`${b.APPT_DATE}T${b.APPT_TIME || "00:00:00"}`);

    if (a.STATUS === "Pending" || isApprSchedA) {
      return dateTimeA - dateTimeB;
    }
    return dateTimeB - dateTimeA;
  });

  return (
    <>
      <PageHeader title="Appointment Requests" subtitle="Approve patient requests and update completed care." />
      
      <div className="dept-filter-row" style={{ marginBottom: "20px" }}>
        <button
          className={`dept-filter-chip ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          All ({items.length})
        </button>
        <button
          className={`dept-filter-chip ${statusFilter === "Pending" ? "active" : ""}`}
          onClick={() => setStatusFilter("Pending")}
        >
          Pending ({items.filter(i => i.STATUS === "Pending").length})
        </button>
        <button
          className={`dept-filter-chip ${statusFilter === "Scheduled" ? "active" : ""}`}
          onClick={() => setStatusFilter("Scheduled")}
        >
          Scheduled ({items.filter(i => ["Approved", "Scheduled"].includes(i.STATUS)).length})
        </button>
        <button
          className={`dept-filter-chip ${statusFilter === "Completed" ? "active" : ""}`}
          onClick={() => setStatusFilter("Completed")}
        >
          Completed ({items.filter(i => i.STATUS === "Completed").length})
        </button>
        <button
          className={`dept-filter-chip ${statusFilter === "others" ? "active" : ""}`}
          onClick={() => setStatusFilter("others")}
        >
          Others ({items.filter(i => ["Rejected", "Cancelled", "No-Show"].includes(i.STATUS)).length})
        </button>
      </div>

      <Card>{sortedItems.length === 0 ? <Empty title="No appointment requests" detail="Try adjusting your status filter." /> : sortedItems.map(item => (
        <div className="request-row" key={item.APPT_ID}>
          <div><h3>{item.PATIENT_NAME}</h3><p>{item.DOCTOR_NAME} · {item.DEPT_NAME}</p><small>{item.APPT_DATE} · {item.APPT_TIME} · {item.REASON || "No reason provided"}</small></div>
          <div className="row-actions"><Badge status={item.STATUS} />
            {item.PRESCRIPTION_ID ? (
              <Btn variant="secondary" onClick={() => viewPrescription(item.APPT_ID)}>View Prescription</Btn>
            ) : (
              ["Approved", "Scheduled", "Completed"].includes(item.STATUS) && (
                <Btn variant="success" onClick={() => setPrescribeAppt(item)}>Write Prescription</Btn>
              )
            )}
            {item.STATUS === "Pending" && <><Btn variant="success" onClick={() => mark(item.APPT_ID, "Approved")}>Approve</Btn><Btn variant="danger" onClick={() => mark(item.APPT_ID, "Rejected")}>Reject</Btn></>}
            {["Approved", "Scheduled"].includes(item.STATUS) && <><Btn variant="success" onClick={() => mark(item.APPT_ID, "Completed")}>Complete</Btn><Btn variant="ghost" onClick={() => mark(item.APPT_ID, "No-Show")}>No-show</Btn></>}
          </div>
        </div>
      ))}</Card>

      {prescribeAppt && (
        <Modal title={`Write Prescription for ${prescribeAppt.PATIENT_NAME}`} onClose={() => setPrescribeAppt(null)}>
          <form className="stack" onSubmit={submitPrescription}>
            <div>
              <strong>Doctor:</strong> {prescribeAppt.DOCTOR_NAME} ({prescribeAppt.SPECIALIZATION})
            </div>
            <Textarea 
              label="Medicines *" 
              placeholder="e.g. Paracetamol 650mg - 1-0-1 after food" 
              value={medicines} 
              onChange={e => setMedicines(e.target.value)} 
              required 
            />
            <Textarea 
              label="Instructions" 
              placeholder="e.g. Drink plenty of water, review in 5 days." 
              value={instructions} 
              onChange={e => setInstructions(e.target.value)} 
            />
            <div className="form-actions">
              <Btn type="submit">Submit & Complete Visit</Btn>
              <Btn type="button" variant="ghost" onClick={() => setPrescribeAppt(null)}>Cancel</Btn>
            </div>
          </form>
        </Modal>
      )}

      {activePrescription && (
        <Modal title="Prescription Details" onClose={() => setActivePrescription(null)}>
          <div className="prescription-card">
            <div className="prescription-meta">
              <div className="prescription-meta-item">
                <span>Patient Name</span>
                <strong>{activePrescription.PATIENT_NAME}</strong>
              </div>
              <div className="prescription-meta-item">
                <span>Date & Time</span>
                <strong>{activePrescription.APPT_DATE} · {activePrescription.APPT_TIME}</strong>
              </div>
              <div className="prescription-meta-item">
                <span>Doctor Name</span>
                <strong>{activePrescription.DOCTOR_NAME}</strong>
              </div>
              <div className="prescription-meta-item">
                <span>Specialization</span>
                <strong>{activePrescription.SPECIALIZATION}</strong>
              </div>
            </div>
            <div className="prescription-section">
              <h4>Rx Medicines</h4>
              <p>{activePrescription.MEDICINES}</p>
            </div>
            {activePrescription.INSTRUCTIONS && (
              <div className="prescription-section">
                <h4>Instructions / Notes</h4>
                <p>{activePrescription.INSTRUCTIONS}</p>
              </div>
            )}
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Btn type="button" onClick={() => setActivePrescription(null)}>Close</Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AuthorityTests({ toast }) {
  const [catalog, setCatalog] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ test_name: "", description: "", price: "", preparation: "" });
  const [completingTest, setCompletingTest] = useState(null);
  const [results, setResults] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [addingTestState, setAddingTestState] = useState(false);

  const TEMPLATES = {
    cbc: "HEMOGLOBIN: 14.1 g/dL (Normal: 13.5 - 17.5)\nRBC COUNT: 4.8 Million/mcL (Normal: 4.3 - 5.9)\nWBC COUNT: 6,800 /mcL (Normal: 4,500 - 11,000)\nPLATELETS: 245,000 /mcL (Normal: 150,000 - 450,000)\nHEMATOCRIT: 42% (Normal: 41% - 50%)\nIMPRESSION: Hemogram parameters are within normal reference bounds.",
    lipid: "TOTAL CHOLESTEROL: 185 mg/dL (Normal: < 200)\nTRIGLYCERIDES: 130 mg/dL (Normal: < 150)\nHDL CHOLESTEROL: 48 mg/dL (Normal: > 40)\nLDL CHOLESTEROL: 111 mg/dL (Normal: < 130)\nIMPRESSION: Desirable lipid profile scores. Normal cardiovascular bounds.",
    glucose: "FASTING BLOOD GLUCOSE: 92 mg/dL (Normal: 70 - 100)\nPOST PRANDIAL GLUCOSE: 125 mg/dL (Normal: < 140)\nHbA1c: 5.4% (Normal: < 5.7%)\nIMPRESSION: Glycemic profiles display excellent metabolic control.",
    urine: "COLOR: Pale Yellow\nSP. GRAVITY: 1.015 (Normal: 1.005 - 1.030)\npH: 6.0 (Normal: 4.6 - 8.0)\nALBUMIN: Negative\nSUGAR: Negative\nIMPRESSION: Normal urinalysis. No indicators of active UTI."
  };

  const applyTemplate = (key) => {
    setResults(TEMPLATES[key]);
  };

  const load = useCallback(() => Promise.all([api.get("/tests/catalog"), api.get("/tests/requests")]).then(([tests, rows]) => { setCatalog(tests); setRequests(rows); }).catch(error => toast(error.message, "error")), [toast]);
  useEffect(() => {
    let active = true;
    Promise.all([api.get("/tests/catalog"), api.get("/tests/requests")]).then(([tests, rows]) => { if (active) { setCatalog(tests); setRequests(rows); } }).catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);
  const addTest = async (event) => {
    event.preventDefault();
    setAddingTestState(true);
    try {
      await api.post("/tests/catalog", form);
      toast("Diagnostic test added to catalog successfully.");
      setForm({ test_name: "", description: "", price: "", preparation: "" });
      load();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setAddingTestState(false);
    }
  };
  const mark = async (id, status) => {
    try {
      await api.put(`/tests/requests/${id}/status`, { status });
      toast(`Test request marked ${status}.`);
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  const handleComplete = async (event) => {
    event.preventDefault();
    if (!completingTest || !results.trim()) return;
    setSubmitting(true);
    try {
      await api.put(`/tests/requests/${completingTest.BOOKING_ID}/complete`, { results: results.trim() });
      setSuccessMsg(`Diagnostic report for "${completingTest.TEST_NAME}" has been generated. The patient has been auto-billed.`);
      load();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Diagnostic Requests" subtitle="Manage the test catalog and approve patient bookings." />
      <div className="two-columns">
        <Card>
          <h2>Add diagnostic test</h2>
          <form className="stack" onSubmit={addTest}>
            <Input label="Test name *" value={form.test_name} onChange={event => setForm({ ...form, test_name: event.target.value })} required />
            <Input label="Price *" type="number" min="0" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} required />
            <Input label="Preparation" value={form.preparation} onChange={event => setForm({ ...form, preparation: event.target.value })} />
            <Textarea label="Description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
            <Btn type="submit" disabled={addingTestState}>
              {addingTestState && <span className="spinner"></span>}
              {addingTestState ? "Adding..." : "Add test"}
            </Btn>
          </form>
          <p className="muted">{catalog.length} tests currently available.</p>
        </Card>
        <Card><h2>Patient requests</h2>{requests.length === 0 ? <Empty title="No test requests" detail="" /> : requests.map(item => <div className="list-row expanded" key={item.BOOKING_ID}><div><strong>{item.PATIENT_NAME} · {item.TEST_NAME}</strong><small>{item.BOOKING_DATE} · {money(item.PRICE)}</small></div><div className="row-actions"><Badge status={item.STATUS} />{item.STATUS === "Pending" && <><Btn variant="success" onClick={() => mark(item.BOOKING_ID, "Approved")}>Approve</Btn><Btn variant="danger" onClick={() => mark(item.BOOKING_ID, "Rejected")}>Reject</Btn></>}{item.STATUS === "Approved" && <Btn variant="primary" onClick={() => setCompletingTest(item)}>Complete & Report</Btn>}</div></div>)}</Card>
      </div>

      {completingTest && (
        <Modal title="Complete Lab Test & Write Report" onClose={() => { setCompletingTest(null); setResults(""); setSuccessMsg(""); }}>
          {successMsg ? (
            <SuccessCheckmark message={successMsg} onClose={() => { setCompletingTest(null); setResults(""); setSuccessMsg(""); }} />
          ) : (
            <form onSubmit={handleComplete} className="stack">
              <p><strong>Patient:</strong> {completingTest.PATIENT_NAME}</p>
              <p><strong>Test:</strong> {completingTest.TEST_NAME}</p>
              
              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#d4d4d8' }}>Pre-fill Diagnostic Template</label>
                <div className="template-btn-row">
                  <button type="button" className="template-btn" onClick={() => applyTemplate('cbc')}>CBC</button>
                  <button type="button" className="template-btn" onClick={() => applyTemplate('lipid')}>Lipid Profile</button>
                  <button type="button" className="template-btn" onClick={() => applyTemplate('glucose')}>Glucose</button>
                  <button type="button" className="template-btn" onClick={() => applyTemplate('urine')}>Urinalysis</button>
                </div>
              </div>

              <Textarea
                label="Diagnostic Results / Report Details *"
                rows="6"
                placeholder="Enter lab findings, values, and doctor recommendations..."
                value={results}
                onChange={e => setResults(e.target.value)}
                required
              />
              <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Btn type="submit" disabled={submitting}>
                  {submitting && <span className="spinner"></span>}
                  {submitting ? "Submitting Report..." : "Submit & Auto-Bill"}
                </Btn>
                <Btn type="button" variant="ghost" onClick={() => { setCompletingTest(null); setResults(""); }}>
                  Cancel
                </Btn>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

function Billing({ toast }) {
  const [patients, setPatients] = useState([]);
  const [bills, setBills] = useState([]);
  const [form, setForm] = useState(BILL_FORM);
  const load = useCallback(() => Promise.all([api.get("/patients"), api.get("/bills")]).then(([people, rows]) => { setPatients(people); setBills(rows); }).catch(error => toast(error.message, "error")), [toast]);
  useEffect(() => {
    let active = true;
    Promise.all([api.get("/patients"), api.get("/bills")]).then(([people, rows]) => { if (active) { setPatients(people); setBills(rows); } }).catch(error => toast(error.message, "error"));
    return () => { active = false; };
  }, [toast]);
  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.post("/bills", form);
      toast("Bill sent to patient portal.");
      setForm(BILL_FORM);
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  const markPaid = async (id) => {
    try {
      await api.put(`/bills/${id}/status`, { payment_status: "Paid" });
      playSound("transaction");
      toast("Bill recorded as paid.");
      load();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  return (
    <>
      <PageHeader title="Billing" subtitle="Issue patient bills and maintain payment status." />
      <div className="two-columns">
        <Card><h2>Send a bill</h2><form className="stack" onSubmit={submit}>
          <Select label="Patient *" value={form.patient_id} onChange={event => setForm({ ...form, patient_id: event.target.value })} required><option value="">Select patient</option>{patients.map(patient => <option value={patient.PATIENT_ID} key={patient.PATIENT_ID}>{patient.FIRST_NAME} {patient.LAST_NAME}</option>)}</Select>
          <Input label="Description *" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required />
          <Input label="Amount *" type="number" min="1" value={form.total_amount} onChange={event => setForm({ ...form, total_amount: event.target.value })} required />
          <Input label="Due date" type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} />
          <Btn type="submit">Send bill</Btn>
        </form></Card>
        <Card><h2>Issued bills</h2>{bills.length === 0 ? <Empty title="No bills issued" detail="" /> : bills.map(bill => <div className="list-row expanded" key={bill.BILL_ID}><div><strong>{bill.PATIENT_NAME}</strong><small>{bill.DESCRIPTION} · {money(bill.TOTAL_AMOUNT)}</small></div><div className="row-actions"><Badge status={bill.PAYMENT_STATUS} />{bill.PAYMENT_STATUS === "Pending" && <Btn variant="success" onClick={() => markPaid(bill.BILL_ID)}>Paid</Btn>}</div></div>)}</Card>
      </div>
    </>
  );
}

/* ---------- Health Tracker (Vitals + SVG Chart + Log Form) ---------- */
function HealthTracker({ toast }) {
  const [vitals, setVitals] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ blood_pressure: "", blood_sugar: "", weight: "", heart_rate: "" });
  const [tooltip, setTooltip] = useState(null);
  const [activeLines, setActiveLines] = useState({ weight: true, sugar: true, hr: true });

  const loadVitals = useCallback(() => {
    Promise.all([
      api.get("/patients/me/vitals"),
      api.get("/tests/mine"),
    ])
      .then(([vitalsRows, testsRows]) => {
        setVitals(vitalsRows);
        setCompletedTests(testsRows.filter(t => t.STATUS === "Completed" && t.RESULTS));
        setLoading(false);
      })
      .catch(err => { toast(err.message, "error"); setLoading(false); });
  }, [toast]);

  useEffect(() => { loadVitals(); }, [loadVitals]);

  const submitVitals = async (e) => {
    e.preventDefault();
    try {
      await api.post("/patients/me/vitals", {
        blood_pressure: logForm.blood_pressure || null,
        blood_sugar: Number(logForm.blood_sugar),
        weight: Number(logForm.weight),
        heart_rate: Number(logForm.heart_rate),
        check_date: todayString(),
      });
      toast("Vitals logged successfully!");
      setLogForm({ blood_pressure: "", blood_sugar: "", weight: "", heart_rate: "" });
      setShowLogForm(false);
      loadVitals();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const deleteVital = async (vitalId) => {
    if (!window.confirm("Delete this vitals entry? This action cannot be undone.")) return;
    try {
      await api.del(`/patients/me/vitals/${vitalId}`);
      toast("Vitals entry deleted.");
      loadVitals();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const latest = vitals.length > 0 ? vitals[vitals.length - 1] : null;

  const getStatus = (type, val) => {
    if (type === "sugar") return val < 70 ? "low" : val > 140 ? "high" : "normal";
    if (type === "hr") return val < 60 ? "low" : val > 100 ? "high" : "normal";
    if (type === "weight") return "normal";
    if (type === "bp") {
      const sys = parseInt(val);
      if (isNaN(sys)) return "";
      return sys > 140 ? "high" : sys < 90 ? "low" : "normal";
    }
    return "normal";
  };

  // SVG Chart rendering
  const renderChart = () => {
    if (vitals.length < 2) return <Empty title="Not enough data" detail="Log at least 2 readings to see trends." />;

    const W = 560, H = 200, PX = 50, PY = 20;
    const cw = W - PX * 2, ch = H - PY * 2;

    const datasets = [];
    if (activeLines.weight) datasets.push({ key: "WEIGHT", cls: "weight", label: "Weight (kg)", color: "#3b82f6", unit: "kg" });
    if (activeLines.sugar) datasets.push({ key: "BLOOD_SUGAR", cls: "sugar", label: "Blood Sugar", color: "#f59e0b", unit: "mg/dL" });
    if (activeLines.hr) datasets.push({ key: "HEART_RATE", cls: "hr", label: "Heart Rate", color: "#ef4444", unit: "bpm" });

    if (datasets.length === 0) return null;

    // Compute per-dataset min/max for independent scaling
    datasets.forEach(ds => {
      const vals = vitals.map(v => v[ds.key] != null ? Number(v[ds.key]) : null).filter(v => v != null && v > 0);
      if (vals.length === 0) {
        ds.min = 0; ds.max = 100; ds.range = 100; ds.hasData = false;
      } else {
        ds.min = Math.min(...vals) - 5;
        ds.max = Math.max(...vals) + 5;
        ds.range = ds.max - ds.min || 1;
        ds.hasData = true;
      }
    });

    const xStep = cw / Math.max(vitals.length - 1, 1);

    // Normalize value to chart Y for a specific dataset's own scale
    const toY = (ds, val) => PY + ch - ((val - ds.min) / ds.range) * ch;
    const toX = (i) => PX + i * xStep;

    // Build path skipping NULL/0 values (moves pen on gaps)
    const buildPath = (ds) => {
      let d = "";
      let drawing = false;
      vitals.forEach((v, i) => {
        const raw = v[ds.key];
        if (raw == null || Number(raw) === 0) { drawing = false; return; }
        const x = toX(i), y = toY(ds, Number(raw));
        d += `${drawing ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
        drawing = true;
      });
      return d;
    };

    // Build filled area under the line (only valid segments)
    const buildArea = (ds) => {
      const bottom = PY + ch;
      const segments = [];
      let seg = [];
      vitals.forEach((v, i) => {
        const raw = v[ds.key];
        if (raw == null || Number(raw) === 0) {
          if (seg.length > 0) { segments.push(seg); seg = []; }
          return;
        }
        seg.push({ x: toX(i), y: toY(ds, Number(raw)) });
      });
      if (seg.length > 0) segments.push(seg);

      return segments.map(pts =>
        `${pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L${pts[pts.length - 1].x.toFixed(1)},${bottom} L${pts[0].x.toFixed(1)},${bottom} Z`
      ).join(" ");
    };

    // Grid labels: if only one dataset active, use its scale. Otherwise show generic 0-100% markers
    const gridCount = 5;
    const gridDs = datasets.length === 1 ? datasets[0] : null;
    const gridLines = Array.from({ length: gridCount }, (_, i) => {
      const frac = i / (gridCount - 1);
      const y = PY + ch - frac * ch;
      if (gridDs) {
        const val = gridDs.min + frac * gridDs.range;
        return { label: Math.round(val), y };
      }
      return { label: Math.round(frac * 100) + "%", y };
    });

    const totalLen = vitals.length > 1 ? (vitals.length - 1) * xStep * 2 : 200;

    return (
      <div className="vitals-chart-container">
        <svg viewBox={`0 0 ${W} ${H + 30}`} preserveAspectRatio="xMidYMid meet">
          {/* Grid */}
          {gridLines.map((g, i) => (
            <g key={i}>
              <line x1={PX} y1={g.y} x2={W - PX} y2={g.y} className="chart-grid-line" />
              <text x={PX - 8} y={g.y + 4} textAnchor="end" className="chart-axis-label">{g.label}</text>
            </g>
          ))}
          {/* Normal Range Highlight Zone (rendered when exactly one of Heart Rate or Blood Sugar is active) */}
          {(() => {
            if (datasets.length === 1 && datasets[0].hasData) {
              const ds = datasets[0];
              if (ds.key === "HEART_RATE" || ds.key === "BLOOD_SUGAR") {
                const normalMin = ds.key === "HEART_RATE" ? 60 : 70;
                const normalMax = ds.key === "HEART_RATE" ? 100 : 140;
                const yMinVal = toY(ds, normalMin);
                const yMaxVal = toY(ds, normalMax);
                const rectTop = Math.max(PY, Math.min(yMinVal, yMaxVal));
                const rectBottom = Math.min(PY + ch, Math.max(yMinVal, yMaxVal));
                const rectHeight = Math.max(0, rectBottom - rectTop);
                
                if (rectHeight > 0) {
                  return (
                    <g key="normal-zone">
                      <rect
                        x={PX}
                        y={rectTop}
                        width={cw}
                        height={rectHeight}
                        fill={ds.key === "HEART_RATE" ? "rgba(239, 68, 68, 0.04)" : "rgba(245, 158, 11, 0.04)"}
                        stroke={ds.key === "HEART_RATE" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)"}
                        strokeDasharray="4 2"
                        className="chart-normal-zone"
                      />
                      <text
                        x={W - PX - 8}
                        y={rectTop + 14}
                        textAnchor="end"
                        style={{
                          fill: ds.key === "HEART_RATE" ? "rgba(239, 68, 68, 0.6)" : "rgba(245, 158, 11, 0.6)",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "0.5px"
                        }}
                      >
                        Normal ({normalMin}-{normalMax} {ds.unit})
                      </text>
                    </g>
                  );
                }
              }
            }
            return null;
          })()}
          {/* X-axis date labels — deduplicated and spaced to avoid overlap */}
          {(() => {
            // Build unique date positions: for each unique date, use the LAST index where it appears
            const dateMap = new Map();
            vitals.forEach((v, i) => {
              const date = v.CHECK_DATE ? v.CHECK_DATE.slice(5) : "";
              dateMap.set(date, i); // last occurrence wins
            });
            const uniqueDates = Array.from(dateMap.entries()); // [[date, lastIndex], ...]

            // Determine skip interval: aim for ~8 labels max to avoid overlap
            const maxLabels = Math.min(8, uniqueDates.length);
            const skip = Math.max(1, Math.ceil(uniqueDates.length / maxLabels));

            return uniqueDates.map(([date, dataIdx], i) => {
              // Always show first and last; skip intermediate if too many
              const isFirst = i === 0;
              const isLast = i === uniqueDates.length - 1;
              if (!isFirst && !isLast && i % skip !== 0) return null;

              const x = toX(dataIdx);
              return <text key={dataIdx} x={x} y={H + 14} textAnchor="middle" className="chart-axis-label">{date}</text>;
            });
          })()}
          {/* Areas */}
          {datasets.filter(ds => ds.hasData).map(ds => (
            <path key={`area-${ds.cls}`} d={buildArea(ds)} className={`chart-area ${ds.cls}-area`} />
          ))}
          {/* Lines */}
          {datasets.filter(ds => ds.hasData).map(ds => (
            <path
              key={`line-${ds.cls}`}
              d={buildPath(ds)}
              className={`chart-line ${ds.cls}-line`}
              style={{
                "--path-len": totalLen,
                strokeDasharray: "var(--path-len)",
                strokeDashoffset: "var(--path-len)",
              }}
            />
          ))}
          {/* Dots — only for non-null, non-zero values */}
          {datasets.filter(ds => ds.hasData).map(ds => vitals.map((v, i) => {
            const raw = v[ds.key];
            if (raw == null || Number(raw) === 0) return null;
            const x = toX(i), y = toY(ds, Number(raw));
            return (
              <circle
                key={`${ds.cls}-${i}`}
                cx={x}
                cy={y}
                className={`chart-dot ${ds.cls}-dot`}
                onMouseEnter={() => {
                  let normalRef = "";
                  if (ds.key === "HEART_RATE") normalRef = "Normal: 60-100 bpm";
                  if (ds.key === "BLOOD_SUGAR") normalRef = "Normal: 70-140 mg/dL";
                  setTooltip({
                    x, y: y - 10,
                    label: ds.label,
                    value: `${raw} ${ds.unit}`,
                    date: v.CHECK_DATE,
                    color: ds.color,
                    normalRef,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          }))}
        </svg>
        {tooltip && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(tooltip.x / W) * 100}%`,
              top: `${(tooltip.y / (H + 30)) * 100}%`,
              borderLeft: `3px solid ${tooltip.color}`,
            }}
          >
            <div className="tooltip-header">
              <strong>{tooltip.label}</strong>
              <span className="tooltip-date">{tooltip.date}</span>
            </div>
            <div className="tooltip-body">
              <span className="tooltip-value" style={{ color: tooltip.color }}>{tooltip.value}</span>
              {tooltip.normalRef && <span className="tooltip-normal">{tooltip.normalRef}</span>}
            </div>
          </div>
        )}
        <div className="chart-legend">
          <span
            style={{ cursor: "pointer", opacity: activeLines.weight ? 1 : 0.4 }}
            onClick={() => setActiveLines(p => ({ ...p, weight: !p.weight }))}
          >
            <i style={{ background: "#3b82f6" }} /> Weight (kg)
          </span>
          <span
            style={{ cursor: "pointer", opacity: activeLines.sugar ? 1 : 0.4 }}
            onClick={() => setActiveLines(p => ({ ...p, sugar: !p.sugar }))}
          >
            <i style={{ background: "#f59e0b" }} /> Blood Sugar
          </span>
          <span
            style={{ cursor: "pointer", opacity: activeLines.hr ? 1 : 0.4 }}
            onClick={() => setActiveLines(p => ({ ...p, hr: !p.hr }))}
          >
            <i style={{ background: "#ef4444" }} /> Heart Rate
          </span>
        </div>
      </div>
    );
  };

  if (loading) return <PageHeader title="Health Tracker" subtitle="Loading vitals..." />;

  return (
    <>
      <PageHeader
        title="Health Tracker"
        subtitle="Track your vitals over time and monitor key health metrics."
        action={<Btn onClick={() => setShowLogForm(!showLogForm)}>{showLogForm ? "Cancel" : "➕ Log Vitals"}</Btn>}
      />

      {/* Summary Cards */}
      {latest && (
        <div className="vitals-summary-row">
          <div className="vital-summary-card heart-rate">
            <div className="vital-icon heart-beat">❤️</div>
            <div className="vital-value">{latest.HEART_RATE || "—"}</div>
            <div className="vital-label">Heart Rate (bpm)</div>
            {latest.HEART_RATE && <span className={`vital-status ${getStatus("hr", latest.HEART_RATE)}`}>{getStatus("hr", latest.HEART_RATE)}</span>}
          </div>
          <div className="vital-summary-card blood-sugar">
            <div className="vital-icon">🩸</div>
            <div className="vital-value">{latest.BLOOD_SUGAR || "—"}</div>
            <div className="vital-label">Blood Sugar (mg/dL)</div>
            {latest.BLOOD_SUGAR && <span className={`vital-status ${getStatus("sugar", latest.BLOOD_SUGAR)}`}>{getStatus("sugar", latest.BLOOD_SUGAR)}</span>}
          </div>
          <div className="vital-summary-card weight">
            <div className="vital-icon">⚖️</div>
            <div className="vital-value">{latest.WEIGHT || "—"}</div>
            <div className="vital-label">Weight (kg)</div>
            <span className="vital-status normal">tracked</span>
          </div>
          <div className="vital-summary-card blood-pressure">
            <div className="vital-icon">🫀</div>
            <div className="vital-value">{latest.BLOOD_PRESSURE || "—"}</div>
            <div className="vital-label">Blood Pressure</div>
            {latest.BLOOD_PRESSURE && <span className={`vital-status ${getStatus("bp", latest.BLOOD_PRESSURE)}`}>{getStatus("bp", latest.BLOOD_PRESSURE)}</span>}
          </div>
        </div>
      )}

      {/* Log Vitals Form */}
      {showLogForm && (
        <Card>
          <h2>Log New Vitals Reading</h2>
          <form onSubmit={submitVitals}>
            <div className="log-vitals-form">
              <Input
                label={
                  <>
                    <span>Blood Pressure</span>
                    {logForm.blood_pressure && (
                      <span className={`input-badge ${getStatus("bp", logForm.blood_pressure)}`}>
                        {getStatus("bp", logForm.blood_pressure)}
                      </span>
                    )}
                  </>
                }
                placeholder="e.g. 120/80"
                value={logForm.blood_pressure}
                onChange={e => setLogForm(f => ({ ...f, blood_pressure: e.target.value }))}
              />
              <Input
                label={
                  <>
                    <span>Blood Sugar *</span>
                    {logForm.blood_sugar && (
                      <span className={`input-badge ${getStatus("sugar", Number(logForm.blood_sugar))}`}>
                        {getStatus("sugar", Number(logForm.blood_sugar))}
                      </span>
                    )}
                  </>
                }
                type="number"
                min="30"
                max="500"
                placeholder="mg/dL"
                value={logForm.blood_sugar}
                onChange={e => setLogForm(f => ({ ...f, blood_sugar: e.target.value }))}
                required
              />
              <Input
                label={
                  <>
                    <span>Weight *</span>
                    {logForm.weight && (
                      <span className="input-badge normal">tracked</span>
                    )}
                  </>
                }
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder="kg"
                value={logForm.weight}
                onChange={e => setLogForm(f => ({ ...f, weight: e.target.value }))}
                required
              />
              <Input
                label={
                  <>
                    <span>Heart Rate *</span>
                    {logForm.heart_rate && (
                      <span className={`input-badge ${getStatus("hr", Number(logForm.heart_rate))}`}>
                        {getStatus("hr", Number(logForm.heart_rate))}
                      </span>
                    )}
                  </>
                }
                type="number"
                min="30"
                max="250"
                placeholder="bpm"
                value={logForm.heart_rate}
                onChange={e => setLogForm(f => ({ ...f, heart_rate: e.target.value }))}
                required
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn type="submit">Save Reading</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* SVG Trend Chart */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0 }}>📊 Vitals Trends</h2>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{vitals.length} readings recorded</span>
          </div>
          {vitals.length >= 2 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
              background: "rgba(59,130,246,0.1)", color: "#3b82f6",
            }}>
              {vitals[0].CHECK_DATE} → {vitals[vitals.length - 1].CHECK_DATE}
            </span>
          )}
        </div>
        {renderChart()}
      </Card>

      {/* Vitals History Table */}
      {vitals.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>📋 Reading History</h2>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{vitals.length} entries</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</th>
                  <th style={{ padding: "10px 12px", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Blood Pressure</th>
                  <th style={{ padding: "10px 12px", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Blood Sugar</th>
                  <th style={{ padding: "10px 12px", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Weight</th>
                  <th style={{ padding: "10px 12px", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Heart Rate</th>
                  <th style={{ padding: "10px 12px", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[...vitals].reverse().map(v => {
                  const sugarStatus = v.BLOOD_SUGAR ? getStatus("sugar", v.BLOOD_SUGAR) : null;
                  const hrStatus = v.HEART_RATE ? getStatus("hr", v.HEART_RATE) : null;
                  const bpStatus = v.BLOOD_PRESSURE ? getStatus("bp", v.BLOOD_PRESSURE) : null;
                  return (
                    <tr key={v.VITAL_ID} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s ease" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{v.CHECK_DATE}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {v.BLOOD_PRESSURE ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 600 }}>{v.BLOOD_PRESSURE} <span style={{ fontSize: 10, color: "var(--muted)" }}>mmHg</span></span>
                            <span className={`status-pill ${bpStatus}`}>{bpStatus}</span>
                          </div>
                        ) : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {v.BLOOD_SUGAR ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 600 }}>{v.BLOOD_SUGAR} <span style={{ fontSize: 10, color: "var(--muted)" }}>mg/dL</span></span>
                            <span className={`status-pill ${sugarStatus}`}>{sugarStatus}</span>
                          </div>
                        ) : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {v.WEIGHT ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 600 }}>{v.WEIGHT} <span style={{ fontSize: 10, color: "var(--muted)" }}>kg</span></span>
                            <span className="status-pill tracked">tracked</span>
                          </div>
                        ) : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {v.HEART_RATE ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 600 }}>{v.HEART_RATE} <span style={{ fontSize: 10, color: "var(--muted)" }}>bpm</span></span>
                            <span className={`status-pill ${hrStatus}`}>{hrStatus}</span>
                          </div>
                        ) : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <button
                          onClick={() => deleteVital(v.VITAL_ID)}
                          title="Delete this entry"
                          style={{
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                            color: "#ef4444", borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                            fontSize: 12, fontWeight: 600, transition: "all 0.2s ease",
                          }}
                          onMouseEnter={e => { e.target.style.background = "rgba(239,68,68,0.18)"; e.target.style.transform = "scale(1.05)"; }}
                          onMouseLeave={e => { e.target.style.background = "rgba(239,68,68,0.08)"; e.target.style.transform = "scale(1)"; }}
                        >🗑️ Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Diagnostic Test Reports synced to vitals */}
      {completedTests.length > 0 && (
        <Card>
          <h2>🧪 Diagnostic Reports</h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
            Completed lab tests automatically sync relevant values (blood sugar, BP, etc.) to your vitals chart.
          </p>
          {completedTests.map(test => {
            const isVitalTest = /glucose|sugar|blood count|cbc|lipid|diabetes/i.test(test.TEST_NAME);
            return (
              <div className="list-row expanded" key={test.BOOKING_ID} style={{ marginBottom: "8px" }}>
                <div>
                  <strong>{test.TEST_NAME}</strong>
                  <small style={{ display: "block", color: "var(--muted)" }}>{test.BOOKING_DATE}</small>
                  <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: "1.5" }}>{test.RESULTS}</p>
                </div>
                <div className="row-actions">
                  {isVitalTest && (
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: "rgba(16,185,129,0.12)",
                      color: "#10b981",
                    }}>
                      ✓ Synced to Vitals
                    </span>
                  )}
                  <Badge status={test.STATUS} />
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}

/* ---------- Live Queue Card (displayed in PatientOverview) ---------- */
function LiveQueueCard({ appointments, toast }) {
  const [checkedIn, setCheckedIn] = useState(false);
  const today = todayString();

  const todayAppts = appointments.filter(a =>
    a.APPT_DATE === today && ["Approved", "Scheduled"].includes(a.STATUS)
  );

  if (todayAppts.length === 0) return null;

  // Simulate queue position based on appointment time ordering
  const appt = todayAppts[0];
  const allTodayCount = appointments.filter(a => a.APPT_DATE === today).length;
  const apptIdNum = Number(String(appt.APPT_ID || "").replace(/[^0-9]/g, "")) || 1;
  const position = Math.max(1, Math.min(allTodayCount, (apptIdNum % 5) + 2)); // simulated position
  const waitMins = (position - 1) * 15;

  return (
    <div className="queue-card">
      <div className="queue-position">{checkedIn ? "✓" : position}</div>
      <div className="queue-info">
        <h3>{checkedIn ? "You're checked in!" : `You're #${position} in line`}</h3>
        <p>{checkedIn ? "Please wait in the waiting area. You'll be called shortly." : `Estimated wait: ~${waitMins} minutes`}</p>
        <div className="queue-doctor">📍 {appt.DOCTOR_NAME} · {appt.APPT_TIME}</div>
      </div>
      <button
        className="queue-checkin-btn"
        disabled={checkedIn}
        onClick={() => { setCheckedIn(true); toast("Checked in successfully! 🎉"); }}
      >
        {checkedIn ? "Checked In ✓" : "Check In"}
      </button>
    </div>
  );
}

/* ---------- Pill Tracker (Medication Dose Logger) ---------- */
function PillTracker({ toast }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const DOSE_KEY = "clinicos_pill_doses";

  // Load checked dose state from localStorage
  const [doseState, setDoseState] = useState(() => {
    try {
      const saved = localStorage.getItem(DOSE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only use today's data
        if (parsed.date === todayString()) return parsed.doses;
      }
    } catch { /* ignore */ }
    return {};
  });

  // Persist dose state
  useEffect(() => {
    localStorage.setItem(DOSE_KEY, JSON.stringify({ date: todayString(), doses: doseState }));
  }, [doseState]);

  useEffect(() => {
    // Fetch completed appointments with prescriptions
    api.get("/appointments/mine")
      .then(appts => {
        const completed = appts.filter(a => a.STATUS === "Completed" && a.PRESCRIPTION_ID);
        // Fetch prescriptions for each
        return Promise.all(completed.map(a =>
          api.get(`/prescriptions/appointment/${a.APPT_ID}`).catch(() => null)
        ));
      })
      .then(results => {
        setPrescriptions(results.filter(Boolean));
        setLoading(false);
      })
      .catch(err => { toast(err.message, "error"); setLoading(false); });
  }, [toast]);

  const toggleDose = (prescId, medName, slot) => {
    const key = `${prescId}_${medName}_${slot}`;
    setDoseState(prev => {
      const next = { ...prev };
      next[key] = !next[key];
      if (next[key]) toast(`✅ ${medName} - ${slot} logged!`);
      return next;
    });
  };

  const SLOTS = ["Morning", "Afternoon", "Evening"];

  if (loading) return <PageHeader title="My Meds" subtitle="Loading prescriptions..." />;

  // Parse dosing pattern (e.g. "1-0-1") from medicine string
  const parseDosing = (medStr) => {
    const match = medStr.match(/(\d)-(\d)-(\d)/);
    if (match) {
      return {
        name: medStr.replace(/\s*\d-\d-\d\s*/, "").trim(),
        pattern: [Number(match[1]), Number(match[2]), Number(match[3])],
      };
    }
    // No pattern found — assume all 3 slots active
    return { name: medStr.trim(), pattern: [1, 1, 1] };
  };

  // Parse medications from prescriptions
  const medCards = [];
  prescriptions.forEach(p => {
    const meds = p.MEDICINES.split(",").map(m => m.trim()).filter(Boolean);
    meds.forEach(med => {
      const { name, pattern } = parseDosing(med);
      const activeSlots = SLOTS.filter((_, i) => pattern[i] > 0);
      medCards.push({
        prescId: p.PRESCRIPTION_ID,
        med,
        displayName: name || med,
        activeSlots,
        pattern,
        doctor: p.DOCTOR_NAME,
        date: p.CREATED_AT,
        instructions: p.INSTRUCTIONS,
      });
    });
  });

  return (
    <>
      <PageHeader title="My Meds" subtitle="Track your daily medication intake and stay on schedule." />

      {medCards.length === 0 ? (
        <Card>
          <Empty title="No active medications" detail="Prescriptions from completed appointments will appear here." />
        </Card>
      ) : (
        <div className="pill-tracker-grid">
          {medCards.map((item, idx) => {
            const totalSlots = item.activeSlots.length;
            const checkedCount = item.activeSlots.filter(s => doseState[`${item.prescId}_${item.med}_${s}`]).length;
            const progress = totalSlots > 0 ? (checkedCount / totalSlots) * 100 : 100;

            return (
              <div className="pill-card" key={`${item.prescId}-${idx}`}>
                <div className="pill-prescription-meta">
                  <span>💊</span>
                  <strong>{item.doctor}</strong>
                  <span>·</span>
                  <span>{item.date}</span>
                </div>
                <div className="pill-card-header">
                  <h3>{item.displayName}</h3>
                  <small>{checkedCount}/{totalSlots} doses · <span style={{ color: "var(--muted)", fontWeight: 400 }}>{item.pattern.join("-")}</span></small>
                </div>
                <div className="pill-dose-row">
                  {SLOTS.map((slot, si) => {
                    const isActive = item.pattern[si] > 0;
                    if (!isActive) return null;
                    const key = `${item.prescId}_${item.med}_${slot}`;
                    const checked = !!doseState[key];
                    return (
                      <div
                        key={slot}
                        className={`dose-chip ${checked ? "checked" : ""}`}
                        onClick={() => toggleDose(item.prescId, item.med, slot)}
                      >
                        <span className="dose-check">{checked ? "✓" : ""}</span>
                        <span>{slot === "Morning" ? "🌅" : slot === "Afternoon" ? "☀️" : "🌙"} {slot}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="pill-progress-bar">
                  <div className="pill-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                {item.instructions && <div className="pill-instructions">📋 {item.instructions}</div>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const PATIENT_NAV = [
  ["home", "Dashboard"], ["profile", "My Profile"], ["book", "Book Appointment"], ["appointments", "My Appointments"], ["tests", "Diagnostic Tests"], ["bills", "My Bills"], ["vitals", "Health Tracker"], ["meds", "My Meds"],
];
const ADMIN_NAV = [
  ["dashboard", "Dashboard"], ["appointments", "Appointments Manager"], ["test-requests", "Tests Manager"], ["billing", "Billing"], ["patients", "Patients"], ["doctors", "Doctors"], ["departments", "Departments"], ["staff", "Staff Accounts"],
];
const DOCTOR_NAV = [
  ["dashboard", "Dashboard"], ["appointments", "My Appointments"], ["patients", "My Patients"], ["shared-reports", "Shared Reports"],
];

function PatientNotifications({ toast, setPage, dismissNotification, clearAllNotifications }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    api.get("/notifications")
      .then(rows => {
        setItems(rows);
        setLoading(false);
      })
      .catch(error => {
        toast(error.message, "error");
        setLoading(false);
      });
  }, [toast]);

  // Filter out dismissed ones
  const dismissed = JSON.parse(localStorage.getItem("dismissed_notifs") || "[]");
  const visible = items.filter(i => !dismissed.includes(i.id));

  const handleDismiss = (id) => {
    dismissNotification(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleClearAll = () => {
    clearAllNotifications(visible.map(i => i.id));
    setItems([]);
  };

  if (loading) return <Empty title="Loading notifications..." detail="" />;

  return (
    <>
      <PageHeader
        title="Notifications & Reminders"
        subtitle="Keep track of upcoming appointments, test results, and outstanding bills."
        action={visible.length > 0 ? <Btn variant="ghost" onClick={handleClearAll}>Clear All</Btn> : null}
      />
      <Card>
        {visible.length === 0 ? (
          <Empty title="All caught up!" detail="No new notifications or reminders at this time." />
        ) : (
          <div className="notifications-list">
            {visible.map(item => (
              <div className={`notification-item ${item.type}`} key={item.id} style={{ position: "relative" }}>
                <button
                  onClick={() => handleDismiss(item.id)}
                  title="Dismiss"
                  style={{
                    position: "absolute", top: 8, right: 8,
                    background: "rgba(255,255,255,0.1)", border: "none",
                    color: "var(--muted)", borderRadius: "50%",
                    width: 24, height: 24, fontSize: 14, cursor: "pointer",
                    display: "grid", placeItems: "center",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { e.target.style.background = "rgba(239,68,68,0.2)"; e.target.style.color = "#ef4444"; }}
                  onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "var(--muted)"; }}
                >✕</button>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <div style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
                  {item.type === 'reminder' && (
                    <Btn variant="primary" onClick={() => { handleDismiss(item.id); setPage("appointments"); }} style={{ minHeight: '30px', padding: '4px 10px', fontSize: '11px' }}>
                      View Appointments
                    </Btn>
                  )}
                  {item.type === 'billing' && (
                    <Btn variant="primary" onClick={() => { handleDismiss(item.id); setPage("bills"); }} style={{ minHeight: '30px', padding: '4px 10px', fontSize: '11px' }}>
                      Pay Bill
                    </Btn>
                  )}
                  {item.type === 'report' && (
                    <Btn variant="primary" onClick={() => { handleDismiss(item.id); setPage("tests"); }} style={{ minHeight: '30px', padding: '4px 10px', fontSize: '11px' }}>
                      View Reports
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function PortalShell({ session, onLogout, toast, theme, toggleTheme, themeRotating }) {
  const isAdmin = session.user.ROLE === "ADMIN";
  const isDoctor = session.user.ROLE === "DOCTOR";
  const nav = isAdmin ? ADMIN_NAV : (isDoctor ? DOCTOR_NAV : PATIENT_NAV);
  const [page, setPage] = useState(nav[0][0]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Dismissed notifications (persisted in localStorage)
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_notifs") || "[]"); } catch { return []; }
  });

  const dismissNotification = useCallback((id) => {
    setDismissedIds(prev => {
      const next = [...prev, id];
      localStorage.setItem("dismissed_notifs", JSON.stringify(next));
      return next;
    });
  }, [setDismissedIds]);

  const clearAllNotifications = useCallback((ids) => {
    setDismissedIds(prev => {
      const next = [...new Set([...prev, ...ids])];
      localStorage.setItem("dismissed_notifs", JSON.stringify(next));
      return next;
    });
  }, [setDismissedIds]);

  const loadNotifications = useCallback(() => {
    if (session.user.ROLE === "PATIENT") {
      api.get("/notifications")
        .then(rows => {
          setNotifications(prev => {
            const prevIds = new Set(prev.map(r => r.id));
            const newNotifs = rows.filter(r => !prevIds.has(r.id));
            if (prev.length > 0 && newNotifs.length > 0) {
              playSound("notification");
            }
            return rows;
          });
          // Auto-cleanup: remove dismissed IDs that no longer exist in the server response
          const currentIds = new Set(rows.map(r => r.id));
          setDismissedIds(prev => {
            const cleaned = prev.filter(id => currentIds.has(id));
            if (cleaned.length !== prev.length) {
              localStorage.setItem("dismissed_notifs", JSON.stringify(cleaned));
            }
            return cleaned;
          });
        })
        .catch(() => {});
    }
  }, [session.user.ROLE, setDismissedIds]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [loadNotifications, page]);

  useEffect(() => {
  const closeDropdown = (e) => {
    if (!e.target.closest(".notification-bell-container")) {
      setShowNotifications(false);
    }
  };

  document.addEventListener("click", closeDropdown);

  return () => {
    document.removeEventListener("click", closeDropdown);
  };
}, []);

  const visibleNotifications = notifications.filter(n => !dismissedIds.includes(n.id));
  const notificationCount = visibleNotifications.length;

  let content;
  if (isAdmin) {
    const pages = {
      dashboard: <AuthorityDashboard setPage={setPage} toast={toast} />,
      appointments: <AppointmentApprovals toast={toast} />,
      "test-requests": <AuthorityTests toast={toast} />,
      billing: <Billing toast={toast} />,
      patients: <AuthorityPatients toast={toast} />,
      doctors: <AuthorityDoctors toast={toast} />,
      departments: <AuthorityDepartments toast={toast} />,
      staff: <AuthorityStaff toast={toast} />,
    };
    content = pages[page];
  } else if (isDoctor) {
    const pages = {
      dashboard: <DoctorDashboard user={session.user} setPage={setPage} toast={toast} />,
      appointments: <DoctorAppointments user={session.user} toast={toast} />,
      patients: <DoctorPatients user={session.user} toast={toast} />,
      "shared-reports": <DoctorSharedReports user={session.user} toast={toast} />,
    };
    content = pages[page];
  } else {
    const pages = {
      home: <PatientOverview user={session.user} setPage={setPage} toast={toast} />,
      profile: <PatientProfile toast={toast} />,
      book: <PatientBooking toast={toast} setPage={setPage} />,
      appointments: <MyAppointments toast={toast} />,
      tests: <PatientTests toast={toast} user={session.user} />,
      bills: <MyBills toast={toast} />,
      vitals: <HealthTracker toast={toast} />,
      meds: <PillTracker toast={toast} />,
      notifications: <PatientNotifications toast={toast} setPage={setPage} dismissNotification={dismissNotification} clearAllNotifications={clearAllNotifications} />,
    };
    content = pages[page];
  }
  return (
    <div className={`app-shell ${mobileMenuOpen ? "mobile-menu-active" : ""}`}>
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)}></div>
      )}
      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <button 
          className="sidebar-close-btn" 
          onClick={() => setMobileMenuOpen(false)} 
          aria-label="Close menu"
        >
          ✕
        </button>
        <div className="brand"><b>+</b><div><strong>ClinicOS</strong><small>{isAdmin ? "Authority Console" : (isDoctor ? "Doctor Portal" : "Patient Portal")}</small></div></div>
        <nav>
          {nav.map(([id, label]) => (
            <button 
              key={id} 
              className={page === id ? "active" : ""} 
              onClick={() => { setPage(id); setMobileMenuOpen(false); }}
            >
              {label}
            </button>
          ))}
          {session.user.ROLE === "PATIENT" && (
            <button 
              className={page === "notifications" ? "active" : ""} 
              onClick={() => { setPage("notifications"); setMobileMenuOpen(false); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
            >
              <span>Notifications</span>
              {notificationCount > 0 && <span className="nav-badge" style={{ position: "static" }}>{notificationCount}</span>}
            </button>
          )}
        </nav>
        <div className="account"><strong>{session.user.FULL_NAME}</strong><small>{isDoctor ? "Doctor Specialist" : (isAdmin ? "Hospital Authority" : "Patient")}</small><Btn variant="ghost" onClick={onLogout}>Sign out</Btn></div>
      </aside>
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="menu-toggle-btn" 
              onClick={() => setMobileMenuOpen(true)} 
              aria-label="Open menu"
            >
              ☰
            </button>
            <h2>{nav.find(([id]) => id === page)?.[1] || "Console"}</h2>
          </div>
          <div className="header-actions">
            <button className={`theme-toggle ${themeRotating ? "rotating" : ""}`} onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              <span className="theme-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
            </button>
            {!isAdmin && (
              <div className="notification-bell-container">
                <button
                    type="button"
                    className="bell-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNotifications(prev => !prev);
                    }}
              >
              🔔

              {notificationCount > 0 && (
              <span className="nav-badge">
              {notificationCount}
               </span>
              )}
              </button>
                {showNotifications ? (
                  <div className="notification-dropdown-panel">
                    <div className="dropdown-header">
                      <h3>Recent Updates</h3>
                      <button className="clear-btn" onClick={() => { setShowNotifications(false); setPage("notifications"); }}>View All</button>
                    </div>
                    <div className="dropdown-body">
                      {notifications.length === 0 ? (
                        <div className="dropdown-empty">All caught up!</div>
                      ) : (
                        visibleNotifications.slice(0, 4).map(item => (
                          <div key={item.id} className={`notification-item ${item.type}`} style={{ padding: '8px 10px', fontSize: '12px', position: 'relative' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissNotification(item.id); setMobileMenuOpen(false); }}
                              title="Dismiss"
                              style={{
                                position: "absolute", top: 6, right: 6,
                                background: "transparent", border: "none",
                                color: "var(--muted)", fontSize: 12, cursor: "pointer",
                                width: 20, height: 20, display: "grid", placeItems: "center",
                                borderRadius: "50%", transition: "all 0.15s ease",
                              }}
                              onMouseEnter={e => { e.target.style.background = "rgba(239,68,68,0.2)"; e.target.style.color = "#ef4444"; }}
                              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "var(--muted)"; }}
                            >✕</button>
                            <strong>{item.title}</strong>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', lineHeight: '1.3' }}>{item.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
              <span className="doctor-avatar-circle" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                {session.user.FULL_NAME ? session.user.FULL_NAME.split(' ').map(n => n[0]).join('') : "U"}
              </span>
              <span style={{ color: '#fff' }} className="user-profile-name">{session.user.FULL_NAME}</span>
            </div>
            <button className="header-signout-btn" onClick={onLogout} title="Sign out" aria-label="Sign out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>
        <div key={page} className="page-transition-wrapper">
          {content}
        </div>
      </main>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [notice, setNotice] = useState({ msg: "", type: "success" });
  const toast = useCallback((msg, type = "success") => setNotice({ msg, type }), []);
  const closeToast = useCallback(() => setNotice({ msg: "", type: "success" }), []);

  useEffect(() => {
    // Quietly wake up the Render backend on page load
    api.get("/health").catch(() => {});
  }, []);

  // Global Theme switcher
  const [theme, setTheme] = useState(() => localStorage.getItem("clinicos_theme") || "dark");
  const [themeRotating, setThemeRotating] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
    localStorage.setItem("clinicos_theme", theme);
  }, [theme]);
  const toggleTheme = () => {
    setThemeRotating(true);
    setTimeout(() => {
      setTheme(t => t === "dark" ? "light" : "dark");
      setThemeRotating(false);
    }, 250);
  };

  const establishSession = (result) => {
    const value = { token: result.token, user: result.user };
    localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    setSession(value);
  };
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    playSound("success");
    toast("See you soon! Good Health 😇");
  };
  return (
    <>
      {session ? (
        <PortalShell session={session} onLogout={logout} toast={toast} theme={theme} toggleTheme={toggleTheme} themeRotating={themeRotating} />
      ) : (
        <AuthLanding onSession={establishSession} toast={toast} theme={theme} toggleTheme={toggleTheme} themeRotating={themeRotating} />
      )}
      <Toast toast={notice} close={closeToast} />
    </>
  );
}