import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ContactModal from '../components/ContactModal';

export default function Home() {
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showContact, setShowContact] = useState(false);

  /* ── Particle background ── */
  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0, raf = 0;
    interface P { x:number;y:number;r:number;vx:number;vy:number;a:number;p:number;ps:number }
    const pts: P[] = [];
    function resize() { W = canvas!.width = window.innerWidth; H = canvas!.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    for (let i = 0; i < 90; i++) pts.push({ x:Math.random()*window.innerWidth, y:Math.random()*window.innerHeight, r:Math.random()*1.6+.3, vx:(Math.random()-.5)*.15, vy:(Math.random()-.5)*.15, a:Math.random()*.4+.05, p:Math.random()*Math.PI*2, ps:Math.random()*.01+.005 });
    function draw() {
      ctx.clearRect(0,0,W,H);
      for (const p of pts) { p.x+=p.vx;p.y+=p.vy;p.p+=p.ps; if(p.x<-5)p.x=W+5; if(p.x>W+5)p.x=-5; if(p.y<-5)p.y=H+5; if(p.y>H+5)p.y=-5; const a=p.a*(0.6+0.4*Math.sin(p.p)); ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(79,142,247,${a})`;ctx.fill(); }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('ph-vis'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('[data-ph]').forEach((el) => io.observe(el));
    document.querySelectorAll('#ph-hero [data-ph]').forEach((el) => {
      setTimeout(() => el.classList.add('ph-vis'), 100 + parseInt(el.getAttribute('data-d') || '0') * 150);
    });
    return () => io.disconnect();
  }, []);

  /* ── Ecosystem constellation ── */
  useEffect(() => {
    const lG = document.getElementById('ph-eco-lines');
    const nG = document.getElementById('ph-eco-nodes');
    if (!lG || !nG) return;
    const ns = 'http://www.w3.org/2000/svg';
    const nodes = [
      { id:'hub',   label:'Explain.global',    x:400, y:250, r:28, main:true },
      { id:'cand',  label:'Candidate Portal',   x:180, y:130, r:18, main:false },
      { id:'rec',   label:'Recruiter Portal',   x:620, y:130, r:18, main:false },
      { id:'learn', label:'Learn Engine',       x:120, y:300, r:18, main:false },
      { id:'iv',    label:'Interview Engine',   x:680, y:300, r:18, main:false },
      { id:'flow',  label:'Flow Viewer',        x:200, y:420, r:16, main:false },
      { id:'packs', label:'Interview Packs',    x:600, y:420, r:16, main:false },
      { id:'ai',    label:'Explain AI',         x:400, y:420, r:16, main:false },
      { id:'p1',    label:'Percentile.One',     x:400, y:100, r:14, main:false },
    ];
    const edges: [string,string][] = [['hub','cand'],['hub','rec'],['hub','learn'],['hub','iv'],['hub','flow'],['hub','packs'],['hub','ai'],['hub','p1'],['cand','learn'],['cand','flow'],['rec','packs'],['rec','iv'],['ai','learn'],['ai','iv'],['p1','hub']];
    edges.forEach(([a,b],i) => {
      const na=nodes.find(n=>n.id===a)!, nb=nodes.find(n=>n.id===b)!;
      const len=Math.hypot(nb.x-na.x,nb.y-na.y);
      const line=document.createElementNS(ns,'line');
      ['x1',String(na.x),'y1',String(na.y),'x2',String(nb.x),'y2',String(nb.y),'stroke','rgba(79,142,247,0.2)','stroke-width','1','stroke-dasharray',String(len),'stroke-dashoffset',String(len)].forEach((_,idx,arr)=>{ if(idx%2===0) line.setAttribute(arr[idx],arr[idx+1]); });
      const an=document.createElementNS(ns,'animate');
      ['attributeName','stroke-dashoffset','from',String(len),'to','0','dur','1.5s','begin',`${i*0.08}s`,'fill','freeze','calcMode','spline','keySplines','0.16 1 0.3 1'].forEach((_,idx,arr)=>{ if(idx%2===0) an.setAttribute(arr[idx],arr[idx+1]); });
      line.appendChild(an); lG.appendChild(line);
      if (i<8) {
        const dot=document.createElementNS(ns,'circle'); dot.setAttribute('r','2'); dot.setAttribute('fill','rgba(79,142,247,0.8)');
        const am=document.createElementNS(ns,'animateMotion'); am.setAttribute('dur',`${2+i*0.3}s`); am.setAttribute('repeatCount','indefinite'); am.setAttribute('begin',`${1.5+i*0.2}s`); am.setAttribute('path',`M${na.x},${na.y} L${nb.x},${nb.y}`);
        dot.appendChild(am); nG.appendChild(dot);
      }
    });
    nodes.forEach((n,i) => {
      const g=document.createElementNS(ns,'g');
      const ring=document.createElementNS(ns,'circle'); ring.setAttribute('cx',String(n.x)); ring.setAttribute('cy',String(n.y)); ring.setAttribute('r',String(n.r)); ring.setAttribute('fill','none'); ring.setAttribute('stroke','rgba(79,142,247,0.3)'); ring.setAttribute('stroke-width','1');
      const pr=document.createElementNS(ns,'animate'); pr.setAttribute('attributeName','r'); pr.setAttribute('values',`${n.r};${n.r*1.8};${n.r}`); pr.setAttribute('dur',`${2.5+i*0.2}s`); pr.setAttribute('repeatCount','indefinite');
      const pa=document.createElementNS(ns,'animate'); pa.setAttribute('attributeName','opacity'); pa.setAttribute('values','0.4;0;0.4'); pa.setAttribute('dur',`${2.5+i*0.2}s`); pa.setAttribute('repeatCount','indefinite');
      ring.appendChild(pr); ring.appendChild(pa); g.appendChild(ring);
      const c=document.createElementNS(ns,'circle'); c.setAttribute('cx',String(n.x)); c.setAttribute('cy',String(n.y)); c.setAttribute('r',String(n.r)); c.setAttribute('fill',n.main?'rgba(45,91,255,0.25)':'rgba(79,142,247,0.1)'); c.setAttribute('stroke',n.main?'#4F8EF7':'rgba(79,142,247,0.4)'); c.setAttribute('stroke-width',n.main?'1.5':'1');
      const ao=document.createElementNS(ns,'animate'); ao.setAttribute('attributeName','opacity'); ao.setAttribute('from','0'); ao.setAttribute('to','1'); ao.setAttribute('dur','.6s'); ao.setAttribute('begin',`${i*0.1}s`); ao.setAttribute('fill','freeze');
      c.appendChild(ao); g.appendChild(c);
      const tx=document.createElementNS(ns,'text'); tx.setAttribute('x',String(n.x)); tx.setAttribute('y',String(n.y+n.r+14)); tx.setAttribute('text-anchor','middle'); tx.setAttribute('font-size',n.main?'9':'8'); tx.setAttribute('font-weight',n.main?'800':'700'); tx.setAttribute('fill',n.main?'#4F8EF7':'rgba(79,142,247,0.7)'); tx.setAttribute('font-family','-apple-system,system-ui,sans-serif'); tx.textContent=n.label;
      g.appendChild(tx); nG.appendChild(g);
    });
  }, []);

  const css = `
    .ph-r{opacity:0;transform:translateY(28px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
    .ph-r.ph-vis{opacity:1;transform:none}
    .ph-r[data-d="1"]{transition-delay:.1s}.ph-r[data-d="2"]{transition-delay:.2s}
    .ph-r[data-d="3"]{transition-delay:.3s}.ph-r[data-d="4"]{transition-delay:.4s}
    .ph-r[data-d="5"]{transition-delay:.5s}.ph-r[data-d="6"]{transition-delay:.6s}

    .ph-ex{color:#4F8EF7}.ph-gl{color:#F0F4FF}

    .ph-c{max-width:1100px;margin:0 auto;padding:0 32px}
    .ph-gl-line{height:1px;background:linear-gradient(to right,transparent,#4F8EF7,transparent);opacity:.2}

    .ph-badge-gold{display:inline-flex;align-items:center;gap:8px;padding:5px 16px;border:1px solid rgba(200,169,110,.35);border-radius:100px;background:rgba(200,169,110,.06);font-size:9px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#C8A96E}
    .ph-badge-gold::before{content:'';width:6px;height:6px;border-radius:50%;background:#C8A96E;animation:ph-blink 2s ease-in-out infinite}
    .ph-badge-blue{display:inline-flex;align-items:center;gap:8px;padding:5px 16px;border:1px solid rgba(79,142,247,.3);border-radius:100px;background:rgba(79,142,247,.08);font-size:9px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#4F8EF7}
    @keyframes ph-blink{0%,100%{opacity:1}50%{opacity:.3}}

    .ph-lbl{font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#4F8EF7;margin-bottom:16px}
    .ph-h-xl{font-size:clamp(36px,5vw,60px);font-weight:900;line-height:1.08;letter-spacing:-.03em;color:#F0F4FF;user-select:none}

    .ph-btn-primary{display:inline-flex;align-items:center;gap:8px;padding:15px 32px;border-radius:12px;background:#4F8EF7;color:#fff;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 8px 32px rgba(79,142,247,.35);transition:all .25s;border:none;cursor:pointer;font-family:inherit}
    .ph-btn-primary:hover{background:#2D5BFF;box-shadow:0 12px 40px rgba(79,142,247,.5);transform:translateY(-1px)}
    .ph-btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:15px 32px;border-radius:12px;background:rgba(79,142,247,.06);color:#4F8EF7;font-size:15px;font-weight:700;text-decoration:none;border:1px solid rgba(79,142,247,.25);transition:all .25s;cursor:pointer;font-family:inherit}
    .ph-btn-ghost:hover{background:rgba(79,142,247,.12);border-color:rgba(79,142,247,.5)}

    #ph-hero{min-height:calc(100vh - 60px);display:flex;align-items:center;padding:60px 32px;overflow:hidden;position:relative;z-index:1}
    .ph-hero-inner{max-width:1200px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}
    .ph-hero-glow{position:absolute;top:50%;left:30%;transform:translate(-50%,-60%);width:900px;height:700px;background:radial-gradient(ellipse,rgba(30,80,255,.18) 0%,rgba(79,142,247,.06) 40%,transparent 70%);pointer-events:none}
    .ph-hero-hl{font-size:clamp(36px,4vw,64px);font-weight:900;line-height:1.05;letter-spacing:-.04em;color:#F0F4FF;text-shadow:0 0 60px rgba(79,142,247,.2)}

    #ph-why{background:#070C1A;padding:120px 0}
    .ph-why-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
    .ph-manifesto p{font-size:clamp(18px,2.5vw,26px);font-weight:500;line-height:1.65;color:rgba(240,244,255,.65);margin-bottom:20px}
    .ph-em1{font-size:clamp(24px,3.5vw,38px)!important;font-weight:800!important;color:#F0F4FF!important;letter-spacing:-.02em;line-height:1.2!important}
    .ph-em2{font-size:clamp(24px,3.5vw,38px)!important;font-weight:800!important;color:#4F8EF7!important;letter-spacing:-.02em;line-height:1.2!important}
    .ph-pillars{display:flex;flex-direction:column;gap:10px}
    .ph-pillar{display:flex;align-items:center;gap:16px;padding:18px 20px;border:1px solid rgba(79,142,247,.14);border-radius:14px;background:rgba(79,142,247,.04);transition:all .3s}
    .ph-pillar:hover{border-color:rgba(79,142,247,.3);background:rgba(79,142,247,.08)}
    .ph-pillar-icon{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,rgba(79,142,247,.2),rgba(45,91,255,.1));border:1px solid rgba(79,142,247,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .ph-tagline{margin-top:40px;padding:20px 24px;border-left:3px solid #4F8EF7;background:rgba(79,142,247,.05);border-radius:0 12px 12px 0}
    .ph-tagline p{font-size:17px;font-weight:600;color:rgba(240,244,255,.65);line-height:1.55}
    .ph-tagline strong{color:#4F8EF7}

    #ph-global{background:#03060F;padding:100px 0;overflow:hidden}
    .ph-global-hl{font-size:clamp(36px,5.5vw,72px);font-weight:900;line-height:1.05;letter-spacing:-.04em;text-align:center;max-width:800px;margin:0 auto 16px}
    .ph-lang-ticker{overflow:hidden;height:44px;margin:40px 0 0}
    .ph-lang-inner{display:flex;gap:12px;animation:ph-tick 22s linear infinite;width:max-content}
    @keyframes ph-tick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    .ph-lang-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:100px;border:1px solid rgba(79,142,247,.25);background:rgba(79,142,247,.06);white-space:nowrap;font-size:13px;font-weight:700;color:rgba(240,244,255,.65)}
    .ph-job-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:800px;margin:40px auto 0}
    .ph-job-chip{padding:8px 18px;border-radius:10px;border:1px solid rgba(79,142,247,.2);background:rgba(79,142,247,.05);font-size:13px;font-weight:700;color:rgba(240,244,255,.65);transition:all .2s;cursor:default}
    .ph-job-chip:hover{border-color:rgba(79,142,247,.5);background:rgba(79,142,247,.12);color:#F0F4FF}
    .ph-global-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:700px;margin:60px auto 0;text-align:center}
    .ph-stat-num{font-size:clamp(40px,6vw,72px);font-weight:900;letter-spacing:-.04em;color:#4F8EF7;line-height:1}
    .ph-stat-lbl{font-size:13px;color:rgba(240,244,255,.35);margin-top:6px;font-weight:600}

    .ph-feat{padding:100px 0}.ph-feat.ph-dark{background:#070C1A}
    .ph-feat-head{text-align:center;margin-bottom:64px}

    .ph-learn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .ph-card{background:#0A1020;border:1px solid rgba(79,142,247,.14);border-radius:18px;padding:24px;transition:all .3s;position:relative;overflow:hidden}
    .ph-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(to right,#4F8EF7,#2D5BFF);opacity:.6}
    .ph-card:hover{border-color:rgba(79,142,247,.35);transform:translateY(-3px);box-shadow:0 20px 40px rgba(79,142,247,.1)}
    .ph-chip{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.2);color:#4F8EF7}
    .ph-prog{height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;margin-top:16px}
    .ph-prog-fill{height:100%;border-radius:2px;background:linear-gradient(to right,#4F8EF7,#2D5BFF)}
    .ph-quiz-opt{font-size:11px;padding:6px 10px;border-radius:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(240,244,255,.35);margin-top:5px}
    .ph-quiz-opt.ok{background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.3);color:#34D399}
    .ph-shelf{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:rgba(79,142,247,.06);border:1px solid rgba(79,142,247,.12);margin-top:8px}

    #ph-ir{background:#03060F;padding:100px 0}
    .ph-ir-layout{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
    .ph-ir-list{margin-top:24px;list-style:none;padding:0;display:flex;flex-direction:column;gap:10px}
    .ph-ir-list li{display:flex;align-items:center;gap:10px;font-size:14px;color:rgba(240,244,255,.65)}
    .ph-ir-list li::before{content:'→';color:#4F8EF7;font-weight:700;flex-shrink:0}
    .ph-ir-preview{border-radius:20px;overflow:hidden;border:1px solid rgba(79,142,247,.2);box-shadow:0 0 60px rgba(79,142,247,.12),0 40px 80px rgba(0,0,0,.5)}
    .ph-rec-card{padding:10px 20px;border-radius:10px;border:1px solid rgba(79,142,247,.2);background:rgba(79,142,247,.05);font-size:13px;font-weight:700;color:#4F8EF7;transition:all .2s;cursor:default}
    .ph-rec-card:hover{border-color:rgba(79,142,247,.5);background:rgba(79,142,247,.12)}

    .ph-packs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .ph-pack{border-radius:18px;overflow:hidden;border:1px solid rgba(79,142,247,.14);background:#0A1020;transition:all .3s}
    .ph-pack:hover{border-color:rgba(79,142,247,.35);transform:translateY(-4px);box-shadow:0 20px 40px rgba(79,142,247,.1)}
    .ph-pack-feat{font-size:12px;color:rgba(240,244,255,.65);display:flex;align-items:center;gap:8px;margin-top:6px}
    .ph-pack-feat::before{content:'✓';color:#4F8EF7;font-weight:800;font-size:11px;flex-shrink:0}

    .ph-portals-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .ph-portal{border-radius:20px;border:1px solid rgba(79,142,247,.14);background:#0A1020;padding:32px;transition:all .3s;position:relative;overflow:hidden}
    .ph-portal:hover{border-color:rgba(79,142,247,.3);box-shadow:0 0 40px rgba(79,142,247,.08)}
    .ph-portal::after{content:'';position:absolute;bottom:0;right:0;width:200px;height:200px;background:radial-gradient(circle,rgba(79,142,247,.08) 0%,transparent 70%);pointer-events:none}
    .ph-portal-feat{display:flex;align-items:center;gap:10px;font-size:13px;color:rgba(240,244,255,.65);margin-top:8px}
    .ph-dot{width:6px;height:6px;border-radius:50%;background:#4F8EF7;flex-shrink:0}
    .ph-mockup{margin-top:24px;background:rgba(79,142,247,.05);border:1px solid rgba(79,142,247,.1);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px}
    .ph-mock-row{height:8px;border-radius:4px;background:rgba(79,142,247,.15)}
    .ph-mock-card{height:40px;border-radius:8px;background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.12)}

    #ph-flow{background:#070C1A;padding:100px 0}
    .ph-flow-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:60px;align-items:start}
    .ph-flow-tl{position:relative;padding-left:32px}
    .ph-flow-tl::before{content:'';position:absolute;left:10px;top:0;bottom:0;width:1px;background:linear-gradient(to bottom,#4F8EF7,rgba(79,142,247,.1))}
    .ph-flow-ev{position:relative;margin-bottom:20px;padding:14px 20px;border-radius:12px;background:#0A1020;border:1px solid rgba(79,142,247,.14);transition:all .3s}
    .ph-flow-ev:hover{border-color:rgba(79,142,247,.3);transform:translateX(4px)}
    .ph-flow-ev::before{content:'';position:absolute;left:-27px;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;background:#4F8EF7;box-shadow:0 0 8px #4F8EF7}

    #ph-mastery{background:#03060F;padding:120px 0}
    .ph-mastery-grid{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:start}
    .ph-mastery-hl{font-size:clamp(38px,5.5vw,68px);font-weight:900;line-height:1.04;letter-spacing:-.04em;color:#F0F4FF}
    .ph-mastery-divider{width:48px;height:2px;background:#4F8EF7;margin:28px 0}
    .ph-mastery-body{font-size:clamp(16px,1.6vw,19px);line-height:1.85;color:rgba(240,244,255,.65);margin-bottom:0}
    .ph-mastery-body strong{color:#F0F4FF;font-weight:700}
    .ph-mastery-pillars{margin-top:40px;display:flex;flex-direction:column;gap:0}
    .ph-mastery-pillar{padding:18px 0;border-top:1px solid rgba(79,142,247,.12);display:flex;justify-content:space-between;align-items:center}
    .ph-mastery-pillar:last-child{border-bottom:1px solid rgba(79,142,247,.12)}
    .ph-mastery-pillar-name{font-size:15px;font-weight:800;color:#F0F4FF;letter-spacing:-.01em}
    .ph-mastery-pillar-desc{font-size:12px;color:rgba(240,244,255,.35);font-weight:500;text-align:right;max-width:180px;line-height:1.5}

    #ph-stages{background:#070C1A;padding:120px 0;text-align:center}
    .ph-stages-emblem{display:inline-flex;flex-direction:column;align-items:center;border:1px solid rgba(79,142,247,.4);padding:40px 64px;margin:48px auto 0;position:relative}
    .ph-stages-emblem::before{content:'';position:absolute;top:8px;left:8px;right:8px;bottom:8px;border:1px solid rgba(79,142,247,.12)}
    .ph-stages-num{font-size:clamp(80px,12vw,120px);font-weight:900;letter-spacing:-.05em;color:#4F8EF7;line-height:1;font-variant-numeric:tabular-nums}
    .ph-stages-unit{font-size:10px;font-weight:800;letter-spacing:.35em;text-transform:uppercase;color:rgba(79,142,247,.5);margin-top:2px}
    .ph-stages-claim{font-size:clamp(13px,1.4vw,16px);font-weight:600;color:rgba(240,244,255,.55);margin-top:16px;line-height:1.6;max-width:280px;text-align:center}
    .ph-stages-list{display:flex;max-width:660px;margin:48px auto 0;border:1px solid rgba(79,142,247,.15);border-radius:14px;overflow:hidden}
    .ph-stages-step{flex:1;padding:20px 8px;text-align:center;border-right:1px solid rgba(79,142,247,.12);transition:background .25s}
    .ph-stages-step:last-child{border-right:none}
    .ph-stages-step:hover{background:rgba(79,142,247,.06)}
    .ph-stages-step-n{font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#4F8EF7;margin-bottom:6px}
    .ph-stages-step-name{font-size:13px;font-weight:800;color:#F0F4FF;line-height:1.3}
    .ph-stages-sub{font-size:clamp(14px,1.5vw,17px);line-height:1.8;color:rgba(240,244,255,.55);max-width:580px;margin:40px auto 0}
    .ph-stages-sub strong{color:#F0F4FF;font-weight:700}

    #ph-eco{background:#03060F;padding:100px 0}
    #ph-road{background:#070C1A;padding:100px 0}
    .ph-road-list{display:flex;flex-direction:column;max-width:700px;margin:40px auto 0;position:relative}
    .ph-road-list::before{content:'';position:absolute;left:20px;top:0;bottom:0;width:1px;background:linear-gradient(to bottom,#4F8EF7,rgba(79,142,247,.1))}
    .ph-road-item{display:flex;gap:24px;align-items:flex-start;padding:24px 0}
    .ph-road-num{width:40px;height:40px;border-radius:50%;border:1px solid rgba(79,142,247,.35);background:rgba(79,142,247,.08);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#4F8EF7;flex-shrink:0;position:relative;z-index:1}
    .ph-road-num.done{background:rgba(79,142,247,.2);border-color:#4F8EF7}
    .ph-rbadge{display:inline-flex;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;margin-top:8px}
    .ph-rbadge.live{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);color:#34D399}
    .ph-rbadge.coming{background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.2);color:#4F8EF7}

    #ph-wait{background:#03060F;padding:120px 0;text-align:center;position:relative;overflow:hidden}
    .ph-wait-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:800px;height:600px;background:radial-gradient(ellipse,rgba(30,80,255,.15) 0%,transparent 65%);pointer-events:none}
    .ph-wait-input{padding:14px 20px;border-radius:10px;border:1px solid rgba(79,142,247,.25);background:rgba(79,142,247,.06);color:#F0F4FF;font-size:15px;outline:none;width:300px;font-family:inherit;transition:border-color .2s}
    .ph-wait-input:focus{border-color:rgba(79,142,247,.5)}.ph-wait-input::placeholder{color:rgba(240,244,255,.35)}

    #ph-founder{background:#070C1A;padding:80px 0;text-align:center}
    .ph-founder-card{max-width:640px;margin:0 auto;padding:40px;border-radius:24px;border:1px solid rgba(79,142,247,.14);background:rgba(79,142,247,.04);position:relative}
    .ph-founder-card::before{content:'"';position:absolute;top:-20px;left:40px;font-size:120px;color:rgba(79,142,247,.08);font-family:Georgia,serif;line-height:1;pointer-events:none}

    .ph-footer{background:#03060F;border-top:1px solid rgba(79,142,247,.08);padding:32px}
    .ph-footer-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
    .ph-footer-links a{font-size:12px;color:rgba(240,244,255,.35);text-decoration:none;margin:0 10px;transition:color .2s}
    .ph-footer-links a:hover{color:#4F8EF7}

    .ph-ir-badge{position:absolute;top:14px;left:50%;transform:translateX(-50%)}
    .ph-irm{background:#070b14;border-radius:16px;overflow:hidden;font-family:-apple-system,system-ui,sans-serif;border:1px solid rgba(255,255,255,0.07)}
    .ph-irm-chair{position:relative;height:160px;overflow:hidden;background:#000}
    .ph-irm-chair img{position:absolute;right:0;top:0;width:60%;height:100%;object-fit:cover;object-position:center 30%;display:block}
    .ph-irm-chair-overlay{position:absolute;inset:0;background:linear-gradient(to right,rgba(7,11,20,1) 0%,rgba(7,11,20,0.97) 35%,rgba(7,11,20,0.6) 55%,rgba(0,0,0,0) 100%)}
    .ph-irm-chair-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;padding:0 24px}
    .ph-irm-chair-eyebrow{font-size:8px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(167,139,250,0.7)}
    .ph-irm-chair-headline{font-size:16px;font-weight:800;color:#fff;text-align:left;letter-spacing:-.01em}
    .ph-irm-tiles{display:flex;gap:10px;padding:12px 12px 0}
    .ph-irm-tile{flex:1;border-radius:12px;overflow:hidden;position:relative;aspect-ratio:4/3}
    .ph-irm-tile img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
    .ph-irm-tile-vignette{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 55%)}
    .ph-irm-tile-name{position:absolute;bottom:0;left:0;right:0;padding:10px 12px}
    .ph-irm-tile-name strong{display:block;font-size:11px;font-weight:700;color:#fff}
    .ph-irm-tile-name span{font-size:8px;font-weight:600;color:rgba(255,255,255,0.45);letter-spacing:.07em;text-transform:uppercase}
    .ph-irm-tile-status{position:absolute;top:8px;right:10px;font-size:9px;font-weight:600;color:rgba(255,255,255,0.4)}
    .ph-irm-tile-wave{position:absolute;bottom:32px;right:10px;display:flex;align-items:center;gap:2px;height:20px}
    .ph-irm-tile-wave span{display:block;width:3px;background:#a78bfa;border-radius:2px}
    .ph-irm-tile-active{border:2px solid rgba(167,139,250,0.55);box-shadow:0 0 0 1px rgba(167,139,250,0.15)}
    .ph-irm-tile-james{border:1px solid rgba(255,255,255,0.06)}
    .ph-irm-qcard{margin:10px 12px 0;padding:12px 14px;background:#0c1220;border:1px solid rgba(255,255,255,0.07);border-radius:12px}
    .ph-irm-qtags{display:flex;align-items:center;gap:8px;margin-bottom:8px}
    .ph-irm-qtag-blue{font-size:8px;font-weight:700;letter-spacing:.08em;padding:3px 9px;border-radius:5px;background:rgba(79,142,247,0.15);color:#4F8EF7;border:1px solid rgba(79,142,247,0.25)}
    .ph-irm-qtag-grey{font-size:8px;font-weight:600;padding:3px 9px;border-radius:5px;background:rgba(255,255,255,0.05);color:rgba(240,244,255,0.4);border:1px solid rgba(255,255,255,0.08)}
    .ph-irm-qbtns{margin-left:auto;display:flex;gap:6px}
    .ph-irm-qbtn{font-size:9px;font-weight:600;padding:3px 10px;border-radius:6px;border:1px solid rgba(79,142,247,0.35);background:rgba(79,142,247,0.1);color:#4F8EF7;cursor:pointer}
    .ph-irm-qbtn-green{border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.08);color:#34D399}
    .ph-irm-qtext{font-size:12px;font-weight:600;color:#F0F4FF;line-height:1.55}
    .ph-irm-body{display:flex;gap:10px;padding:10px 12px 12px}
    .ph-irm-answer{flex:3;background:#0c1220;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
    .ph-irm-whisper{display:inline-flex;align-items:center;gap:5px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:5px;padding:3px 8px;font-size:9px;font-weight:700;color:#34D399}
    .ph-irm-mic-row{display:flex;align-items:center;gap:10px}
    .ph-irm-mic{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#4F8EF7,#2563eb);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 14px rgba(79,142,247,0.35)}
    .ph-irm-bars{flex:1;display:flex;align-items:center;gap:2px;height:32px}
    .ph-irm-bars span{flex:1;background:rgba(255,255,255,0.08);border-radius:2px}
    .ph-irm-mic-label{font-size:10px;color:rgba(240,244,255,0.3)}
    .ph-irm-textarea{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:8px 10px;font-size:11px;color:rgba(240,244,255,0.35);font-family:inherit;width:100%;box-sizing:border-box;resize:none;height:52px}
    .ph-irm-pass{font-size:10px;font-weight:600;padding:5px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:rgba(240,244,255,0.45);cursor:pointer;align-self:flex-start}
    .ph-irm-prev{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;min-height:0}
    .ph-irm-prev::-webkit-scrollbar{width:3px}.ph-irm-prev::-webkit-scrollbar-track{background:transparent}.ph-irm-prev::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
    .ph-irm-prev-label{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(240,244,255,0.25);margin-bottom:2px}
    .ph-irm-prev-item{padding:8px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;display:flex;align-items:flex-start;gap:8px;flex-shrink:0}
    .ph-irm-prev-score{font-size:11px;font-weight:800;flex-shrink:0;min-width:28px;text-align:right;font-variant-numeric:tabular-nums;line-height:1.4}
    .ph-irm-prev-score-hi{color:#34D399}.ph-irm-prev-score-mid{color:#F59E0B}.ph-irm-prev-score-lo{color:#EF4444}
    .ph-irm-prev-q{font-size:10px;color:rgba(240,244,255,0.45);line-height:1.5;flex:1}
    .ph-irm-stats{flex:1;background:#0c1220;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
    .ph-irm-stat-label{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(240,244,255,0.3);margin-bottom:2px}
    .ph-irm-progress-pips{display:flex;gap:4px}
    .ph-irm-pip-dot{height:4px;flex:1;border-radius:2px;background:rgba(255,255,255,0.08)}
    .ph-irm-pip-dot-done{background:#4F8EF7}
    .ph-irm-timer-val{font-size:20px;font-weight:800;color:#f1f5f9;font-variant-numeric:tabular-nums}
    .ph-irm-coach-cue{font-size:10px;line-height:1.5;color:rgba(167,139,250,0.9);background:rgba(167,139,250,0.07);border:1px solid rgba(167,139,250,0.15);border-radius:7px;padding:7px 9px}
    .ph-irm-benchmark{background:linear-gradient(135deg,rgba(79,142,247,0.10),rgba(167,139,250,0.08));border:1px solid rgba(79,142,247,0.22);border-radius:8px;padding:8px 10px}
    .ph-irm-bench-text{font-size:9px;font-weight:700;color:#f1f5f9;line-height:1.5;margin:3px 0 5px}
    .ph-irm-bench-text em{color:#34D399;font-style:normal}
    .ph-irm-bench-bar{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;margin-bottom:3px}
    .ph-irm-bench-fill{height:100%;width:5%;background:linear-gradient(90deg,#4F8EF7,#a78bfa);border-radius:2px}
    .ph-irm-bench-sub{font-size:8px;color:rgba(240,244,255,0.3)}
    .ph-irm-diff-badge{font-size:10px;font-weight:700;padding:6px 10px;border-radius:7px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:#F59E0B;text-align:center}
    .ph-irm-pause-btn{font-size:10px;font-weight:700;padding:7px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(240,244,255,0.4);cursor:pointer;text-align:center;margin-top:auto}

    #ph-practice{background:#070B18;padding:80px 0 100px}
    .ph-practice-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;max-width:1100px;margin:0 auto;padding:0 32px}
    .ph-practice-hook{font-size:clamp(32px,4.5vw,54px);font-weight:900;line-height:1.08;letter-spacing:-.03em;color:#F0F4FF;margin-bottom:20px}
    .ph-practice-hook em{font-style:normal;color:#4F8EF7}
    .ph-practice-sub{font-size:clamp(16px,2vw,19px);line-height:1.7;color:rgba(240,244,255,.6);margin-bottom:32px}
    .ph-practice-sub strong{color:#F0F4FF;font-weight:700}
    .ph-practice-stats{display:flex;gap:32px;margin-top:36px;flex-wrap:wrap}
    .ph-practice-stat{display:flex;flex-direction:column;gap:4px}
    .ph-practice-stat-val{font-size:clamp(28px,3.5vw,42px);font-weight:900;letter-spacing:-.04em;color:#4F8EF7}
    .ph-practice-stat-lbl{font-size:12px;font-weight:600;color:rgba(240,244,255,.4);letter-spacing:.05em;text-transform:uppercase}

    .ph-pack-card{background:#fff;border-radius:20px;box-shadow:0 32px 80px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.06);overflow:hidden;max-width:340px;width:100%}
    .ph-pack-card-header{background:linear-gradient(135deg,#3B4FCF 0%,#5B6FEF 100%);padding:20px 24px;display:flex;align-items:center;gap:14px}
    .ph-pack-card-icon{width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
    .ph-pack-card-title{font-size:15px;font-weight:700;color:#fff}
    .ph-pack-card-body{padding:24px 24px 20px}
    .ph-pack-card-hl{font-size:22px;font-weight:900;color:#111827;line-height:1.25;margin-bottom:10px}
    .ph-pack-card-price{float:right;margin-top:-4px;background:#FEF3C7;color:#92400E;font-size:18px;font-weight:900;padding:10px 16px;border-radius:12px;letter-spacing:-.01em}
    .ph-pack-card-desc{font-size:13px;color:#6B7280;line-height:1.6;clear:both;margin-bottom:20px}
    .ph-pack-card-btn{display:block;width:100%;padding:16px;border-radius:14px;background:#3B4FCF;color:#fff;font-size:15px;font-weight:700;text-align:center;border:none;font-family:inherit;cursor:pointer;margin-bottom:14px;transition:background .2s}
    .ph-pack-card-btn:hover{background:#2D3DB8}
    .ph-pack-card-footer{text-align:center;font-size:12px;color:#9CA3AF;padding-bottom:4px}
    .ph-pack-card-footer strong{color:#3B4FCF}

    @media(max-width:900px){
      .ph-why-grid,.ph-ir-layout,.ph-portals-grid,.ph-flow-grid,.ph-hero-inner{grid-template-columns:1fr}
      .ph-learn-grid,.ph-packs-grid{grid-template-columns:1fr 1fr}
      .ph-c{padding:0 20px}.ph-global-stats{grid-template-columns:1fr 1fr}
      .ph-practice-grid{grid-template-columns:1fr;gap:40px}
    }
    @media(max-width:600px){
      .ph-learn-grid,.ph-packs-grid,.ph-global-stats{grid-template-columns:1fr}
    }
  `;

  const LANGS = ['🇬🇧 English','🇫🇷 Français','🇩🇪 Deutsch','🇪🇸 Español','🇵🇹 Português','🇮🇹 Italiano','🇨🇳 中文','🇯🇵 日本語','🇰🇷 한국어','🇸🇦 العربية','🇮🇳 हिन्दी','🇳🇱 Nederlands','🇵🇱 Polski','🇸🇪 Svenska','🇧🇷 Português BR'];
  const JOBS = ['🏦 Investment Banking','💻 Software Engineering','🏥 Healthcare & Nursing','⚖️ Law & Legal','📊 Finance & Accounting','🏗️ Engineering','🎓 Education','🛒 Retail & Operations','🚀 Start-ups & Scale-ups','🏛️ Public Sector','🎨 Creative & Design','📦 Logistics & Supply Chain'];

  const heroFeatures = t('hero.features', { returnObjects: true }) as string[];
  const whyPillars = t('why.pillars', { returnObjects: true }) as { name: string; hl: string; body: string; micro: string }[];
  const roadPhases = t('road.phases', { returnObjects: true }) as { phase: string; title: string; sub: string }[];
  const candidateFeats = t('portals.candidate.feats', { returnObjects: true }) as string[];
  const recruiterFeats = t('portals.recruiter.feats', { returnObjects: true }) as string[];

  const PILLAR_ICONS = ['💡','📐','🎯','📊','⚡'];
  const ROAD_STATUS = [
    { badge: 'live', done: true },
    { badge: 'live', done: true },
    { badge: 'coming', done: false },
    { badge: 'coming', done: false },
    { badge: 'coming', done: false },
    { badge: 'coming', done: false },
    { badge: 'coming', done: false },
  ];

  return (
    <>
      {showContact && <ContactModal onClose={() => setShowContact(false)} defaultSubject="Early access to Explain.global" />}
      <style>{css}</style>
      <canvas ref={particlesRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }} />

      {/* HERO */}
      <section id="ph-hero">
        <div className="ph-hero-glow" />
        <div className="ph-hero-inner">
          <div>
            <div className="ph-r" data-ph="" style={{marginBottom:20}}><span className="ph-badge-gold">✦ {t('hero.badge')}</span></div>
            <h1 className="ph-hero-hl ph-r" data-ph="" data-d="1">
              {t('hero.line1')} <span style={{color:'#4F8EF7'}}>Interview Chair</span><br />
              <span style={{background:'linear-gradient(90deg,#4F8EF7,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                {t('hero.line3')}
              </span>
            </h1>
            <p className="ph-r" data-ph="" data-d="2" style={{fontSize:17,lineHeight:1.75,color:'rgba(240,244,255,.65)',marginTop:20,maxWidth:460}}>
              {t('hero.desc')}
            </p>
            <ul className="ph-ir-list ph-r" data-ph="" data-d="3" style={{marginTop:20}}>
              {heroFeatures.map(li => <li key={li}>{li}</li>)}
            </ul>
            <div className="ph-r" data-ph="" data-d="4" style={{display:'flex',gap:14,flexWrap:'wrap',marginTop:36}}>
              <a className="ph-btn-primary" href="/register">{t('hero.cta1')}</a>
              <a href="https://product.explain.global" target="_blank" rel="noopener noreferrer" className="ph-btn-ghost" style={{borderColor:'rgba(167,139,250,.35)',color:'#a78bfa'}}>{t('hero.cta2')}</a>
            </div>
          </div>
          <div className="ph-ir-preview ph-r" data-ph="" data-d="2" style={{position:'relative'}}>
            <div className="ph-irm">
              <div className="ph-irm-chair">
                <img src="/images/mastermind-chair.png" alt="" />
                <div className="ph-irm-chair-overlay" />
                <div className="ph-irm-chair-text">
                  <div className="ph-irm-chair-eyebrow">Your interview awaits</div>
                  <div className="ph-irm-chair-headline">The seat is yours.<br /><span style={{color:'rgba(167,139,250,0.9)'}}>Make every answer count.</span></div>
                </div>
              </div>
              <div className="ph-irm-tiles">
                <div className="ph-irm-tile ph-irm-tile-active">
                  <img src="/images/sarah.jpg" alt="Sarah Mitchell" />
                  <div className="ph-irm-tile-vignette" />
                  <div className="ph-irm-tile-wave">
                    {[14,22,18,26,20,16,24,18].map((h,i)=><span key={i} style={{height:h}} />)}
                  </div>
                  <div className="ph-irm-tile-name"><strong>Sarah Mitchell</strong><span>HR Director</span></div>
                </div>
                <div className="ph-irm-tile ph-irm-tile-james">
                  <img src="/images/james.png" alt="James Okafor" />
                  <div className="ph-irm-tile-vignette" />
                  <div className="ph-irm-tile-status">Ready</div>
                  <div className="ph-irm-tile-name"><strong>James Okafor</strong><span>Hiring Manager</span></div>
                </div>
              </div>
              <div className="ph-irm-qcard">
                <div className="ph-irm-qtags">
                  <span className="ph-irm-qtag-blue">JAMES · HIRING MANAGER</span>
                  <span className="ph-irm-qtag-grey">Medium</span>
                  <div className="ph-irm-qbtns">
                    <button className="ph-irm-qbtn">↩ Repeat</button>
                    <button className="ph-irm-qbtn ph-irm-qbtn-green">⏸ Pause</button>
                  </div>
                </div>
                <div className="ph-irm-qtext">Walk me through the most complex challenge you have faced in this type of role. What did you do and what was the outcome?</div>
              </div>
              <div className="ph-irm-body">
                <div className="ph-irm-answer">
                  <div className="ph-irm-whisper">
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#34D399',display:'inline-block'}} />
                    Whisper STT active
                  </div>
                  <div className="ph-irm-mic-row">
                    <div className="ph-irm-mic">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z" fill="#fff"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M9 22h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div className="ph-irm-bars">
                      {Array(18).fill(0).map((_,i)=><span key={i} style={{height:`${8+Math.round(Math.sin(i*0.8)*10+12)}px`}} />)}
                    </div>
                    <span className="ph-irm-mic-label">Speak or type</span>
                  </div>
                  <textarea className="ph-irm-textarea" placeholder="Type your answer here…" readOnly />
                  <button className="ph-irm-pass">Pass →</button>
                  <div className="ph-irm-prev">
                    <div className="ph-irm-prev-label">Previous Answers</div>
                    {[
                      {q:'Tell me about yourself and your background.',score:8,hi:true},
                      {q:'Why are you interested in this particular role?',score:7,hi:true},
                      {q:'Describe a time you handled a difficult stakeholder.',score:6,hi:false,mid:true},
                    ].map(({q,score,hi,mid},i)=>(
                      <div className="ph-irm-prev-item" key={i}>
                        <span className={`ph-irm-prev-score ${hi?'ph-irm-prev-score-hi':mid?'ph-irm-prev-score-mid':'ph-irm-prev-score-lo'}`}>{score}<span style={{fontSize:8,fontWeight:500,color:'rgba(240,244,255,0.3)'}}>/10</span></span>
                        <span className="ph-irm-prev-q">{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ph-irm-stats">
                  <div>
                    <div className="ph-irm-stat-label">Progress</div>
                    <div className="ph-irm-progress-pips">
                      {[true,false,false,false,false].map((done,i)=>(
                        <div key={i} className={`ph-irm-pip-dot${done?' ph-irm-pip-dot-done':''}`} />
                      ))}
                    </div>
                    <div style={{fontSize:9,color:'rgba(240,244,255,0.3)',marginTop:3}}>Q1 of 5</div>
                  </div>
                  <div>
                    <div className="ph-irm-stat-label">Time on Answer</div>
                    <div className="ph-irm-timer-val">0:11</div>
                  </div>
                  <div>
                    <div className="ph-irm-stat-label">Coach</div>
                    <div className="ph-irm-coach-cue">Stay calm — you've got this 💪</div>
                  </div>
                  <div className="ph-irm-benchmark">
                    <div className="ph-irm-stat-label" style={{color:'rgba(79,142,247,0.7)'}}>Benchmark</div>
                    <div className="ph-irm-bench-text">Top 5% scored <em>8/10</em> for this role</div>
                    <div className="ph-irm-bench-bar"><div className="ph-irm-bench-fill" /></div>
                    <div className="ph-irm-bench-sub">Top 5th percentile</div>
                  </div>
                  <div>
                    <div className="ph-irm-stat-label">Difficulty</div>
                    <div className="ph-irm-diff-badge">Medium</div>
                  </div>
                  <div className="ph-irm-pause-btn">⏸ Pause</div>
                </div>
              </div>
            </div>
            <div className="ph-ir-badge"><span className="ph-badge-gold">Live Preview</span></div>
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* INTERVIEW PRACTICE HOOK */}
      <section id="ph-practice">
        <div className="ph-practice-grid">
          <div>
            <div className="ph-lbl ph-r" data-ph="">{t('practice.label')}</div>
            <h2 className="ph-practice-hook ph-r" data-ph="" data-d="1" style={{whiteSpace:'pre-line'}}>
              {t('practice.headline').split('\n').map((line, i, arr) => (
                <span key={i}>{i === 1 ? <em>{line}</em> : line}{i < arr.length - 1 && <br />}</span>
              ))}
            </h2>
            <p className="ph-practice-sub ph-r" data-ph="" data-d="2" dangerouslySetInnerHTML={{__html: t('practice.body1').replace(/<s>/g,'<strong>').replace(/<\/s>/g,'</strong>')}} />
            <p className="ph-practice-sub ph-r" data-ph="" data-d="3" style={{marginTop:-16}} dangerouslySetInnerHTML={{__html: t('practice.body2').replace(/<s>/g,'<strong>').replace(/<\/s>/g,'</strong>')}} />
            <div className="ph-practice-stats ph-r" data-ph="" data-d="4">
              <div className="ph-practice-stat"><span className="ph-practice-stat-val">{t('practice.stat1val')}</span><span className="ph-practice-stat-lbl">{t('practice.stat1lbl')}</span></div>
              <div className="ph-practice-stat"><span className="ph-practice-stat-val">{t('practice.stat2val')}</span><span className="ph-practice-stat-lbl">{t('practice.stat2lbl')}</span></div>
              <div className="ph-practice-stat"><span className="ph-practice-stat-val">{t('practice.stat3val')}</span><span className="ph-practice-stat-lbl">{t('practice.stat3lbl')}</span></div>
            </div>
          </div>
          <div className="ph-r" data-ph="" data-d="3" style={{display:'flex',justifyContent:'center'}}>
            <div style={{
              borderRadius:16,overflow:'hidden',
              fontFamily:'"Segoe UI",Arial,sans-serif',
              background:'linear-gradient(180deg,#07112a 0%,#061228 60%,#050d20 100%)',
              border:'1px solid rgba(79,142,247,0.2)',
              boxShadow:'0 12px 48px rgba(0,0,0,0.55),0 2px 8px rgba(79,142,247,0.1)',
              width:300,flexShrink:0,
            }}>
              {/* Brand header */}
              <div style={{padding:'14px 20px 12px',borderBottom:'1px solid rgba(79,142,247,0.1)',textAlign:'center',borderRadius:'16px 16px 0 0'}}>
                <span style={{fontSize:20,fontWeight:900,letterSpacing:'-0.02em',lineHeight:1}}>
                  <span style={{color:'#4F8EF7'}}>www.</span>
                  <span style={{color:'#ffffff'}}>Explain</span>
                  <span style={{color:'#4F8EF7'}}>.global</span>
                </span>
              </div>
              {/* Chair hero */}
              <div style={{width:'100%',background:'linear-gradient(180deg,#0d1f45 0%,#07112a 65%,#050d20 100%)',textAlign:'center',padding:'16px 0 8px'}}>
                <img src="/images/MastermindChair2.png" alt="" style={{width:'60%',height:'auto',display:'inline-block'}} />
              </div>
              {/* Body */}
              <div style={{padding:'20px 20px 0'}}>
                <div style={{fontSize:17,fontWeight:800,color:'#fff',lineHeight:1.35,letterSpacing:'-0.02em',marginBottom:5}}>
                  Get your tailored Interview Practice Pack for this exact role
                </div>
                <div style={{fontSize:14,color:'#22c55e',fontWeight:700,marginBottom:14}}>only £1</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.72)',lineHeight:1.65,marginBottom:20}}>
                  20 AI-generated practice questions · Tailored to your CV · Tailored to this job · Instant access
                </div>
                <button
                  onClick={() => window.location.href='/register'}
                  style={{width:'100%',height:50,background:'linear-gradient(135deg,#4F8EF7 0%,#7b5cf5 100%)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'-0.01em',boxShadow:'0 4px 20px rgba(79,142,247,0.3)'}}>
                  Get Interview Practice Pack — £1
                </button>
              </div>
              {/* Footer */}
              <div style={{padding:'12px 20px 16px',fontSize:11,color:'rgba(255,255,255,0.55)',textAlign:'center',lineHeight:1.7,marginTop:4}}>
                No login needed · Instant access<br />
                <span style={{color:'#4F8EF7',fontWeight:700}}>Powered by Explain.Global</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* WHY */}
      <section id="ph-why">
        <div className="ph-c">
          <div className="ph-why-grid">
            <div className="ph-manifesto">
              <div className="ph-lbl ph-r" data-ph="">{t('why.label')}</div>
              <p className="ph-r" data-ph="" data-d="1">{t('why.p1')}</p>
              <p className="ph-r" data-ph="" data-d="2">{t('why.p2')}</p>
              <p className="ph-em1 ph-r" data-ph="" data-d="3" style={{whiteSpace:'pre-line'}}>{t('why.em1')}</p>
              <p className="ph-em2 ph-r" data-ph="" data-d="4">{t('why.em2')}</p>
              <div className="ph-tagline ph-r" data-ph="" data-d="5"><p>{t('why.tagline')}</p></div>
            </div>
            <div>
              <div className="ph-pillars">
                {whyPillars.map((pillar, i) => (
                  <div className="ph-pillar ph-r" data-ph="" data-d={String(i+1)} key={pillar.name} style={{flexDirection:'column',alignItems:'flex-start',gap:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div className="ph-pillar-icon">{PILLAR_ICONS[i]}</div>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,color:'#F0F4FF',letterSpacing:'-.01em'}}>{pillar.name}</div>
                        <div style={{fontSize:11,fontWeight:700,color:'#4F8EF7',marginTop:1}}>{pillar.hl}</div>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:'rgba(240,244,255,.5)',lineHeight:1.65}}>{pillar.body}</div>
                    <div style={{fontSize:11,fontWeight:700,color:'rgba(79,142,247,.6)',fontStyle:'italic'}}>{pillar.micro}</div>
                  </div>
                ))}
              </div>
              <p className="ph-r" data-ph="" data-d="6" style={{marginTop:24,fontSize:14,color:'#4F8EF7',fontWeight:700,textAlign:'center'}}>{t('why.allFive')}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* CONTINUOUS MASTERY */}
      <section id="ph-mastery">
        <div className="ph-c">
          <div className="ph-mastery-grid">
            <div>
              <div className="ph-lbl ph-r" data-ph="">Continuous Mastery</div>
              <h2 className="ph-mastery-hl ph-r" data-ph="" data-d="1">
                Get the Job.<br />Keep the Job.
              </h2>
              <div className="ph-mastery-divider ph-r" data-ph="" data-d="2" />
              <p className="ph-mastery-body ph-r" data-ph="" data-d="3">
                People work incredibly hard to secure a role — but once they're hired, they relax, stop learning, and slowly become stale. <strong>Explain.Global is the only platform built to prevent that.</strong> Daily coaching, Push Questions, continuous learning, and structured mastery keep your skills sharp long after the interview is over.
              </p>
            </div>
            <div className="ph-r" data-ph="" data-d="2">
              <div className="ph-mastery-pillars">
                {[
                  { name: 'Daily Coaching', desc: 'A structured question, every day' },
                  { name: 'Push Questions', desc: 'Role-specific prompts sent to you' },
                  { name: 'Continuous Learning', desc: 'Micro-lessons that compound over time' },
                  { name: 'Structured Mastery', desc: 'Tracked progress across every skill' },
                ].map(p => (
                  <div className="ph-mastery-pillar" key={p.name}>
                    <span className="ph-mastery-pillar-name">{p.name}</span>
                    <span className="ph-mastery-pillar-desc">{p.desc}</span>
                  </div>
                ))}
              </div>
              <div className="ph-tagline" style={{marginTop:32}}>
                <p>Most platforms prepare you for the interview. <strong style={{color:'#4F8EF7'}}>Explain.Global prepares you for the career.</strong></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* 5-STAGE INTERVIEW */}
      <section id="ph-stages">
        <div className="ph-c">
          <div className="ph-lbl ph-r" data-ph="" style={{textAlign:'center'}}>Built for Real Hiring Processes</div>
          <h2 className="ph-h-xl ph-r" data-ph="" data-d="1" style={{textAlign:'center'}}>
            Most platforms prepare you for <span style={{color:'#4F8EF7'}}>one stage.</span><br />
            We prepare you for <span style={{color:'#F0F4FF'}}>all five.</span>
          </h2>
          <div className="ph-r" data-ph="" data-d="2" style={{display:'flex',justifyContent:'center'}}>
            <div className="ph-stages-emblem">
              <div className="ph-stages-num">5</div>
              <div className="ph-stages-unit">Interview Stages</div>
              <div className="ph-stages-claim">The only platform that supports up to 5 interview stages.</div>
            </div>
          </div>
          <div className="ph-stages-list ph-r" data-ph="" data-d="3">
            {[
              { n: '01', name: 'HR Screen' },
              { n: '02', name: 'Hiring Manager' },
              { n: '03', name: 'Technical' },
              { n: '04', name: 'Panel' },
              { n: '05', name: 'Final' },
            ].map(s => (
              <div className="ph-stages-step" key={s.n}>
                <div className="ph-stages-step-n">{s.n}</div>
                <div className="ph-stages-step-name">{s.name}</div>
              </div>
            ))}
          </div>
          <p className="ph-stages-sub ph-r" data-ph="" data-d="4">
            Most platforms only prepare you for one stage. <strong>Explain.Global prepares you for all five</strong> — HR, Hiring Manager, Technical, Panel, and Final.
          </p>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* GLOBAL */}
      <section id="ph-global">
        <div className="ph-c">
          <div className="ph-feat-head">
            <div className="ph-lbl ph-r" data-ph="">{t('global.label')}</div>
            <h2 className="ph-global-hl ph-r" data-ph="" data-d="1">{t('global.headline1')}<br /><span style={{color:'#4F8EF7'}}>{t('global.headline2')}</span><br />{t('global.headline3')}</h2>
            <p className="ph-r" data-ph="" data-d="2" style={{fontSize:18,lineHeight:1.75,color:'rgba(240,244,255,.65)',maxWidth:540,margin:'0 auto'}}>
              {t('global.desc')}
            </p>
          </div>
          <div className="ph-lang-ticker ph-r" data-ph="" data-d="2">
            <div className="ph-lang-inner">
              {[...LANGS,...LANGS].map((l,i)=><span className="ph-lang-pill" key={i}>{l}</span>)}
            </div>
          </div>
          <div className="ph-job-grid ph-r" data-ph="" data-d="3">
            {JOBS.map(j=><div className="ph-job-chip" key={j}>{j}</div>)}
          </div>
          <div className="ph-global-stats ph-r" data-ph="" data-d="4">
            <div><div className="ph-stat-num">50+</div><div className="ph-stat-lbl">{t('global.stat1lbl')}</div></div>
            <div><div className="ph-stat-num">∞</div><div className="ph-stat-lbl">{t('global.stat2lbl')}</div></div>
            <div><div className="ph-stat-num">Any</div><div className="ph-stat-lbl">{t('global.stat3lbl')}</div></div>
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* LEARN ENGINE */}
      <section id="ph-learn" className="ph-feat">
        <div className="ph-c">
          <div className="ph-feat-head">
            <div className="ph-lbl ph-r" data-ph="">{t('learn.label')}</div>
            <h2 className="ph-h-xl ph-r" data-ph="" data-d="1"><span style={{color:'#4F8EF7'}}>{t('learn.headline')}</span></h2>
            <p className="ph-r" data-ph="" data-d="2" style={{fontSize:18,lineHeight:1.75,color:'rgba(240,244,255,.65)',maxWidth:520,margin:'16px auto 0'}}>{t('learn.desc')}</p>
            <div className="ph-r" data-ph="" data-d="3" style={{marginTop:24,display:'flex',justifyContent:'center'}}>
              <button className="ph-btn-primary" onClick={() => navigate('/learn')}>{t('learn.cta')}</button>
            </div>
          </div>
          <div className="ph-learn-grid ph-r" data-ph="" data-d="2">
            <div className="ph-card">
              <div style={{fontSize:28,marginBottom:14}}>⚛️</div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#4F8EF7',marginBottom:8}}>Science · Advanced</div>
              <div style={{fontSize:16,fontWeight:800,color:'#F0F4FF',marginBottom:8,lineHeight:1.3,letterSpacing:'-.01em'}}>Quantum Entanglement &amp; Superposition</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:14}}>{["Wave function","Decoherence","Bell's theorem"].map(c=><span className="ph-chip" key={c}>{c}</span>)}</div>
              <div className="ph-prog"><div className="ph-prog-fill" style={{width:'68%'}} /></div>
              <div style={{fontSize:11,color:'rgba(240,244,255,.35)',marginTop:6,display:'flex',justifyContent:'space-between'}}><span>Progress</span><span>68%</span></div>
            </div>
            <div className="ph-card">
              <div style={{fontSize:28,marginBottom:14}}>🧠</div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#4F8EF7',marginBottom:8}}>Multiple Choice Quiz</div>
              <div style={{fontSize:16,fontWeight:800,color:'#F0F4FF',marginBottom:8,lineHeight:1.3}}>Which statement best describes quantum entanglement?</div>
              {['A — Particles share the same physical location','B — Measurement of one particle instantly determines the other ✓','C — Particles move faster than light','D — Superposition requires observation'].map((o,i)=><div className={`ph-quiz-opt${i===1?' ok':''}`} key={o}>{o}</div>)}
            </div>
            <div className="ph-card">
              <div style={{fontSize:28,marginBottom:14}}>📚</div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#4F8EF7',marginBottom:8}}>Your Bookshelf · 14 Lessons</div>
              <div style={{fontSize:16,fontWeight:800,color:'#F0F4FF',marginBottom:0}}>Saved Lessons</div>
              {[['⚛️','Quantum Entanglement','Science · 68% complete'],['💰','Compound Interest','Mathematics · 100% ✓'],['🏛️','The Roman Empire','History · 24% complete']].map(([icon,title,meta])=>(
                <div className="ph-shelf" key={title}><span>{icon}</span><div><div style={{fontSize:12,fontWeight:700,color:'#F0F4FF'}}>{title}</div><div style={{fontSize:10,color:'rgba(240,244,255,.35)'}}>{meta}</div></div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* INTERVIEW PACKS */}
      <section className="ph-feat ph-dark">
        <div className="ph-c">
          <div className="ph-feat-head">
            <div className="ph-lbl ph-r" data-ph="">{t('packs.label')}</div>
            <h2 className="ph-h-xl ph-r" data-ph="" data-d="1">{t('packs.headline').split(' ').slice(0,-1).join(' ')} <span style={{color:'#4F8EF7'}}>{t('packs.headline').split(' ').slice(-1)}</span></h2>
            <p className="ph-r" data-ph="" data-d="2" style={{fontSize:18,lineHeight:1.75,color:'rgba(240,244,255,.65)',maxWidth:520,margin:'16px auto 0'}}>{t('packs.desc')}</p>
            <div className="ph-r" data-ph="" data-d="3" style={{marginTop:20}}><span className="ph-badge-gold">Global Distribution</span></div>
          </div>
          <div className="ph-packs-grid ph-r" data-ph="" data-d="2">
            {[
              {icon:'🏦',title:'Investment Banking',meta:'Goldman Sachs · J.P. Morgan · Barclays',spine:'linear-gradient(to right,#4F8EF7,#2D5BFF)',feats:['12 structured lessons','48 practice questions','3 live simulations','Behavioural scoring','AI coaching debrief']},
              {icon:'🏥',title:'NHS Nursing & Healthcare',meta:'NHS · Nuffield · Bupa · CQC-ready',spine:'linear-gradient(to right,#2D9E6A,#34D399)',feats:['10 clinical competency lessons','36 interview questions','Safeguarding simulation','Values & behaviours scoring','CQC standards guidance']},
              {icon:'💻',title:'Software Engineering',meta:'FAANG · Scale-up · Deep tech',spine:'linear-gradient(to right,#7C3AED,#A855F7)',feats:['15 technical + behavioural lessons','60 coding & competency questions','System design simulation','Technical depth scoring','Senior engineer coaching']},
            ].map(p=>(
              <div className="ph-pack" key={p.title}>
                <div style={{height:4,background:p.spine}} />
                <div style={{padding:22}}>
                  <div style={{fontSize:32,marginBottom:12}}>{p.icon}</div>
                  <div style={{fontSize:17,fontWeight:800,color:'#F0F4FF',marginBottom:6,letterSpacing:'-.01em'}}>{p.title}</div>
                  <div style={{fontSize:12,color:'rgba(240,244,255,.35)'}}>{p.meta}</div>
                  {p.feats.map(f=><div className="ph-pack-feat" key={f}>{f}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* PORTALS */}
      <section className="ph-feat">
        <div className="ph-c">
          <div className="ph-feat-head">
            <div className="ph-lbl ph-r" data-ph="">{t('portals.label')}</div>
            <h2 className="ph-h-xl ph-r" data-ph="" data-d="1">{t('portals.headline').replace('Portals','').trim()} <span style={{color:'#4F8EF7'}}>Portals</span>{t('portals.headline').includes(',') ? ', ' + t('portals.headline').split(',').slice(1).join(',') : ''}</h2>
          </div>
          <div className="ph-portals-grid">
            {([
              { badge: 'Candidate Portal', titleKey: 'portals.candidate.title', subKey: 'portals.candidate.sub', feats: candidateFeats, cols: 'repeat(3,1fr)' },
              { badge: 'Recruiter Portal', titleKey: 'portals.recruiter.title', subKey: 'portals.recruiter.sub', feats: recruiterFeats, cols: '1fr 1fr' },
            ] as const).map((p, i) => (
              <div className="ph-portal ph-r" data-ph="" data-d={String(i)} key={p.badge}>
                <span className="ph-badge-blue">{p.badge}</span>
                <div style={{fontSize:24,fontWeight:800,letterSpacing:'-.02em',margin:'14px 0 8px',color:'#F0F4FF',whiteSpace:'pre-line'}}>{t(p.titleKey)}</div>
                <div style={{fontSize:13,color:'rgba(240,244,255,.35)'}}>{t(p.subKey)}</div>
                {p.feats.map(f=><div className="ph-portal-feat" key={f}><div className="ph-dot" />{f}</div>)}
                <div className="ph-mockup">
                  <div className="ph-mock-row" style={{width:'70%'}} />
                  <div style={{display:'grid',gridTemplateColumns:p.cols,gap:8,marginTop:6}}>
                    {Array.from({length:p.cols.includes('3')?3:2}).map((_,j)=><div className="ph-mock-card" key={j} />)}
                  </div>
                  <div className="ph-mock-row" style={{width:'80%'}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* FLOW VIEWER */}
      <section id="ph-flow">
        <div className="ph-c">
          <div className="ph-flow-grid">
            <div>
              <div className="ph-lbl ph-r" data-ph="">{t('flow.label')}</div>
              <h2 className="ph-h-xl ph-r" data-ph="" data-d="1">{t('flow.headline1')}<br /><span style={{color:'#4F8EF7'}}>{t('flow.headline2')}</span><br />{t('flow.headline3')}</h2>
              <p className="ph-r" data-ph="" data-d="2" style={{fontSize:18,lineHeight:1.75,color:'rgba(240,244,255,.65)',marginTop:20}}>{t('flow.desc1')}</p>
              <p className="ph-r" data-ph="" data-d="3" style={{fontSize:15,lineHeight:1.7,color:'rgba(240,244,255,.65)',marginTop:16}}>{t('flow.desc2')}</p>
            </div>
            <div className="ph-flow-tl ph-r" data-ph="" data-d="2">
              {[['09:14 · Session Start','Candidate opened Interview Prep Pack','Role: Senior Software Engineer · Company: DeepMind'],['09:17 · Learn Engine','Generated lesson: System Design Fundamentals','7 concepts · 5 exam questions · quiz started'],['09:34 · Interview Room','Practice session completed — 6 questions','Strong: 4 · OK: 1 · Needs work: 1'],['09:41 · LEARN Plan','3 modules recommended from weak areas','Stakeholder Management · System Design · Communication'],['10:02 · Session End','Candidate marked prep as complete','48 min session · full flow captured']].map(([time,title,sub])=>(
                <div className="ph-flow-ev" key={time}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:'.1em',color:'#4F8EF7',textTransform:'uppercase',marginBottom:4}}>{time}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'#F0F4FF'}}>{title}</div>
                  <div style={{fontSize:12,color:'rgba(240,244,255,.35)'}}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* ECOSYSTEM */}
      <section id="ph-eco">
        <div className="ph-c" style={{textAlign:'center'}}>
          <div className="ph-lbl ph-r" data-ph="">{t('eco.label')}</div>
          <h2 className="ph-h-xl ph-r" data-ph="" data-d="1">One <span style={{color:'#4F8EF7'}}>{t('eco.headline').replace('One ','').replace('Одно ','').replace('Ein ','').replace('Un ','').replace('Uma ','').replace('Een ','').replace('Jedna ','')}</span></h2>
          <p className="ph-r" data-ph="" data-d="2" style={{fontSize:18,lineHeight:1.75,color:'rgba(240,244,255,.65)',maxWidth:480,margin:'16px auto 0'}}>{t('eco.desc')}</p>
          <svg id="ph-eco-svg" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',maxWidth:800,display:'block',margin:'40px auto 0',overflow:'visible'}} role="img" aria-label="Explain.global ecosystem constellation">
            <title>Explain.global Ecosystem</title>
            <g id="ph-eco-lines" /><g id="ph-eco-nodes" />
          </svg>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* ROADMAP */}
      <section id="ph-road">
        <div className="ph-c" style={{textAlign:'center'}}>
          <div className="ph-lbl ph-r" data-ph="">{t('road.label')}</div>
          <h2 className="ph-h-xl ph-r" data-ph="" data-d="1">{t('road.headline').split(' ').slice(0,-1).join(' ')} <span style={{color:'#4F8EF7'}}>{t('road.headline').split(' ').slice(-1)}</span></h2>
          <p className="ph-r" data-ph="" data-d="2" style={{fontSize:18,lineHeight:1.75,color:'rgba(240,244,255,.65)',maxWidth:480,margin:'16px auto 0'}}>{t('road.desc')}</p>
          <div className="ph-road-list ph-r" data-ph="" data-d="2">
            {roadPhases.map((r, i) => (
              <div className="ph-road-item" key={i}>
                <div className={`ph-road-num${ROAD_STATUS[i].done?' done':''}`}>{i+1}</div>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:10,fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#4F8EF7',marginBottom:4}}>{r.phase}</div>
                  <div style={{fontSize:18,fontWeight:800,color:'#F0F4FF',letterSpacing:'-.01em',marginBottom:4}}>{r.title}</div>
                  <div style={{fontSize:13,color:'rgba(240,244,255,.35)',lineHeight:1.55}}>{r.sub}</div>
                  <span className={`ph-rbadge ${ROAD_STATUS[i].badge}`}>{ROAD_STATUS[i].done ? t('road.liveNow') : i === 2 ? t('road.inBeta') : i >= 5 ? t('road.vision') : t('road.planned')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* WAITLIST */}
      <section id="ph-wait">
        <div className="ph-wait-glow" />
        <div className="ph-c" style={{position:'relative',zIndex:1,textAlign:'center'}}>
          <div className="ph-r" data-ph="" style={{marginBottom:20}}><span className="ph-badge-gold">{t('wait.badge')}</span></div>
          <h2 className="ph-h-xl ph-r" data-ph="" data-d="1" style={{textAlign:'center'}}>{t('wait.headline').split(' ').slice(0,-1).join(' ')} <span style={{color:'#4F8EF7'}}>{t('wait.headline').split(' ').slice(-1)}</span></h2>
          <p className="ph-r" data-ph="" data-d="2" style={{fontSize:18,lineHeight:1.75,color:'rgba(240,244,255,.65)',textAlign:'center',maxWidth:480,margin:'16px auto 0'}}>{t('wait.desc')}</p>
          <div className="ph-r" data-ph="" data-d="3" style={{marginTop:40}}>
            <button className="ph-btn-primary" onClick={() => setShowContact(true)} style={{fontSize:16,padding:'16px 40px'}}>{t('wait.cta')}</button>
          </div>
          <p className="ph-r" data-ph="" data-d="4" style={{fontSize:13,lineHeight:1.65,color:'rgba(240,244,255,.35)',textAlign:'center',marginTop:16}}>{t('wait.footnote')}</p>
        </div>
      </section>

      <div className="ph-gl-line" />

      {/* FOUNDER */}
      <section id="ph-founder">
        <div className="ph-c">
          <div className="ph-lbl ph-r" data-ph="" style={{textAlign:'center',marginBottom:32}}>{t('founder.label')}</div>
          <div className="ph-founder-card ph-r" data-ph="" style={{maxWidth:760}}>
            <p style={{fontSize:16,color:'rgba(240,244,255,.5)',lineHeight:1.85,marginBottom:20,position:'relative',zIndex:1,fontWeight:500}}>
              {t('founder.p1')}
            </p>
            <p style={{fontSize:16,color:'rgba(240,244,255,.6)',lineHeight:1.85,marginBottom:20,position:'relative',zIndex:1}}>
              {t('founder.p2')}
            </p>
            <p style={{fontSize:16,color:'rgba(240,244,255,.6)',lineHeight:1.85,marginBottom:20,position:'relative',zIndex:1}}>
              {t('founder.p3')}
            </p>
            <p style={{fontSize:16,color:'rgba(240,244,255,.6)',lineHeight:1.85,marginBottom:20,position:'relative',zIndex:1}}>
              {t('founder.p4')}
            </p>
            <p style={{fontSize:17,fontWeight:700,color:'#F0F4FF',lineHeight:1.7,marginBottom:28,position:'relative',zIndex:1}}>
              {t('founder.p5')}
            </p>
            <div style={{padding:'20px 24px',borderLeft:'3px solid #4F8EF7',background:'rgba(79,142,247,.05)',borderRadius:'0 12px 12px 0',marginBottom:28,position:'relative',zIndex:1}}>
              <p style={{fontSize:18,fontWeight:800,color:'#F0F4FF',lineHeight:1.5,margin:0,letterSpacing:'-.02em'}}>
                "{t('founder.quote')}"
              </p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:14,position:'relative',zIndex:1}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#4F8EF7,#2D5BFF)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#fff',flexShrink:0}}>FC</div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:'#F0F4FF'}}>{t('founder.name')}</div>
                <div style={{fontSize:11,color:'rgba(240,244,255,.35)',marginTop:2}}>{t('founder.founderTitle')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ph-footer">
        <div className="ph-footer-inner">
          <div>
            <div style={{fontSize:15,fontWeight:900,letterSpacing:'-.03em',marginBottom:6}}><span className="ph-ex">Explain</span><span className="ph-gl">.global</span></div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <a href="mailto:francis@explain.global" style={{fontSize:11,color:'rgba(240,244,255,.35)',textDecoration:'none',transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget.style.color='#4F8EF7')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,244,255,.35)')}>
                francis@explain.global
              </a>
              <a href="tel:+447346814898" style={{fontSize:11,color:'rgba(240,244,255,.35)',textDecoration:'none',transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget.style.color='#4F8EF7')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,244,255,.35)')}>
                +44 7346 814898
              </a>
            </div>
          </div>
          <div className="ph-footer-links">
            <a href="#ph-why">{t('footer.whyExplain')}</a><a href="#ph-global">{t('footer.global')}</a>
            <a href="#ph-learn">{t('footer.learnEngine')}</a><a href="#ph-eco">{t('footer.ecosystem')}</a>
            <a href="#ph-wait">{t('footer.waitlist')}</a>
          </div>
          <div style={{fontSize:11,color:'rgba(240,244,255,.35)'}}>{t('footer.copy')}</div>
        </div>
      </footer>
    </>
  );
}
