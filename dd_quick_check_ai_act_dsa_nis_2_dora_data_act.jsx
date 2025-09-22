'use client';

import React, { useEffect, useMemo, useState } from 'react';

// --- Compact, Shopify‑ready DD QuickCheck ---
// Key changes (per your approval):
// • Dev/test UI alleen met ?dev=1 (prod = uit)
// • Alleen Shopify embed + Parent listener (HTML embed verwijderd)
// • Detailteksten in één data‑map (minder JSX → korter/stabieler)
// • Geen webfonts of inline scripts; 1‑klik PDF blijft

// ============== Logic ==============
function evaluateTriggers(input:{
  nis2Sectors:string[]; emp50plus:boolean; turnover10m:boolean;
  aiProviderOrDeployer:boolean; sellsIoTOrRelatedServices:boolean;
  financialEntity:boolean; dsaHostingOrUGC:boolean; itServiceProvider:boolean;
  itHasFinancialClients:boolean; itStoresCustomerData:boolean; itServesNis2Orgs:boolean;
  providesDIS:boolean; dataAltruismOrg:boolean; publicSectorProtectedData:boolean;
  isHealthcareProvider:boolean; developsEHRorWellnessInteroperable:boolean; holdsHealthDataForSecondaryUse:boolean;
}){
  const NIS2 = ((input.nis2Sectors?.length||0)>0 && input.emp50plus && input.turnover10m) || (input.itServiceProvider && input.itServesNis2Orgs);
  const DORA = input.financialEntity || (input.itServiceProvider && input.itHasFinancialClients);
  const DSA = input.dsaHostingOrUGC;
  const AIACT = input.aiProviderOrDeployer;
  const DATAACT = input.sellsIoTOrRelatedServices || (input.itServiceProvider && input.itStoresCustomerData);
  const DGA = input.providesDIS || input.dataAltruismOrg || input.publicSectorProtectedData; // low threshold: any role
  const EHDS = input.isHealthcareProvider || input.developsEHRorWellnessInteroperable || input.holdsHealthDataForSecondaryUse;
  return {NIS2,DORA,DSA,AIACT,DATAACT,DGA,EHDS};
}

const NIS2_SECTORS = [
  'Energie','Vervoer/Transport','Bankwezen','Financiële markt-infrastructuur','Gezondheidszorg','Drinkwater','Afvalwater','Digitale infrastructuur (cloud, datacenter, CDN, DNS/TLD)','Beheerders van ICT-diensten / MSP/MSSP','Overheidsdiensten (meestal centraal/regionaal)','Ruimtevaart','Post- en koeriersdiensten','Afvalstoffenbeheer','Levensmiddelen','Chemische stoffen','Onderzoek','Vervaardiging (kritieke producten)'
];

type LawKey = 'NIS2'|'DORA'|'DSA'|'AIACT'|'DATAACT'|'DGA'|'EHDS';
const LAW_LABELS:Record<LawKey,string>={NIS2:'NIS2',DORA:'DORA',DSA:'DSA',AIACT:'AI Act',DATAACT:'Data Act',DGA:'DGA',EHDS:'EHDS'};

// Detailcontent in compacte data‑map (HTML toegestaan).
const DETAILS:Record<LawKey,{title:string; rows:[string,string][]}>= {
  NIS2:{title:'NIS2 – wat te checken',rows:[
    ['Toepassing (DD)','Check sector (Annex I/II) en omvang (middelgroot/groot). NIS2 kan ook <em>indirect</em> gelden via levering aan NIS2‑organisaties. Registreer als essentieel/belangrijk waar vereist.'],
    ['Kernverplichtingen','Registratieplicht (entiteitenregister), zorgplicht (risicoanalyse → maatregelen), meldplicht voor significante incidenten.'],
    ['Documenten & bewijs','Cybersecurity‑beleid/plan; risicokader & zelfbeoordeling; CSIRT/incidentprocessen; audits; incident‑log & meldingstermijnen; training; leverancierscontracten & keten‑security.'],
    ['Risico’s & boetes','Essentiële entiteiten: ≥ €10.000.000 of 2% wereldwijde omzet. Belangrijke entiteiten: ≥ €7.000.000 of 1,4% wereldwijde omzet. Sectoraal toezicht; proactieve controles mogelijk.']
  ]},
  DORA:{title:'DORA – wat te checken',rows:[
    ['Toepassing (DD)','Direct: financiële entiteit. Indirect: ICT‑derde voor financiële cliënten (contractuele doorwerking; mogelijke aanwijzing als kritieke derde).'],
    ['Kernverplichtingen','ICT‑risicobeheer; incidentregistratie & melding; testen operationele weerbaarheid; beheer van ICT‑derden (strategie, informatieregister, kritikaliteit, exit).'],
    ['Documenten & bewijs','ICT‑RMF/BCM; informatieregister leveranciers; incident response‑plan; testplannen; leveranciersbeoordelingen; DORA‑conforme contracten.'],
    ['Risico’s & boetes','Kritieke derde: dwangsom tot 1% van wereldwijde gemiddelde dagomzet; instellingen: nationale sancties (NL: AFM/vergunningrisico).']
  ]},
  DSA:{title:'DSA – wat te checken',rows:[
    ['Toepassing (DD)','Aanbieders van tussenhandelsdiensten in de EU (hosting/online platform/zoekmachine). Zwaardere plichten bij platformen/zoekmachines.'],
    ['Kernverplichtingen','Inhoudsmoderatie & meldmechanismen; melding strafbare feiten; transparantierapportage; advertentietransparantie; T&C’s; contactpunt; klachtenafhandeling.'],
    ['Documenten & bewijs','Moderation‑policy; transparantierapport; ad‑transparency beleid; T&C’s; contactpunten; klachtenprocesdocumentatie.'],
    ['Risico’s & boetes','Tot 6% van wereldwijde jaaromzet; 1% voor info‑verzuim; 5% dwangsom. Toezicht: EC (VLOPs/VLOSEs) en nationale toezichthouders (NL: ACM/AP).']
  ]},
  AIACT:{title:'AI Act – wat te checken',rows:[
    ['Toepassing (DD)','Providers, deployers, importeurs, distributeurs en fabrikanten die AI integreren/onder eigen merk aanbieden binnen de EU. Verplichtingen naar risicoklasse (verboden/hoog risico/beperkt).'],
    ['Kernverplichtingen','Voor hoog‑risico: post‑market monitoring; kwaliteitsbeheersysteem; transparantie (bij directe interactie); EU‑conformiteitsverklaring.'],
    ['Documenten & bewijs','Technische documentatie; incidentmeldingen; monitoringplan; kwaliteitsbeleid/procedures; transparantiemaatregelen.'],
    ['Risico’s & boetes','Verboden praktijken/databeheersysteem: tot €35 mln of 7% omzet; overige: tot €15 mln of 3% omzet.'],
    ['Tijdlijn','Inwerking: 1 aug 2024; verbodsbepalingen: feb 2025; GPAI & governance: aug 2025; veel hoog‑risico‑bepalingen: aug 2027.']
  ]},
  DATAACT:{title:'Data Act – wat te checken',rows:[
    ['Toepassing (DD)','Data‑houders (IoT/connected products & related services), data‑ontvangers, aanbieders van data‑verwerkingsdiensten (cloud).'],
    ['Kernverplichtingen','Toegang & portabiliteit (art. 3–12); oneerlijke voorwaarden (art. 13); B2G bij nood (art. 14–22); cloud‑switching (art. 23–31; geen switching fees vanaf 12‑01‑2027); buitenlandse overheidstoegang (art. 32); interoperabiliteit (art. 33–36).'],
    ['Documenten & bewijs','Toegang/gebruik‑contracten; afspraken over trade secrets; tarieven (redelijk & nondiscriminatoir); exit‑plan, formats/APIs; beleid tegen onrechtmatige buitenlandse toegang; interoperabiliteitsspecificaties.'],
    ['Risico’s & boetes','Nationale sancties; NL beoogd: ACM tot €1.030.000 of 10% jaaromzet (welk hoger is). Toepasselijk vanaf sept 2025.']
  ]},
  DGA:{title:'DGA – wat te checken',rows:[
    ['Toepassing (DD)','1) Hergebruik van ‘beschermde’ overheidsdata (commerc./statist. vertrouwelijkheid, IE‑rechten derden of persoonsgegevens). 2) Data‑intermediation services (meld/registratie, eisen). 3) Erkende data altruism‑organisaties (vrijwillige registratie, transparantie & bescherming).'],
    ['Kernverplichtingen','Voorwaarden hergebruik; notificatie/monitoring DI‑services; register & eisen voor erkende data‑altruïsme‑organisaties; EU Data‑innovatieboard.'],
    ['Risico’s & boetes','Lidstaten stellen sancties vast; in NL: ACM kan dwangsom of boete tot €1.030.000 (of 10% jaaromzet).'],
    ['Transactie‑aandachtspunten','Biedt target DI‑services en is dit gemeld/voldoet het aan art. 12‑eisen? Is target erkend data‑altruïsme‑organisatie en voldoet het aan art. 20/21? Is er omgang met ‘beschermde’ overheidsdata onder DGA‑voorwaarden?']
  ]},
  EHDS:{title:'EHDS – wat te checken',rows:[
    ['Toepassing (DD)','Zorgaanbieders (primaire zorggegevens), fabrikanten van EHR‑systemen en apps/hulpmiddelen die EHR‑interoperabiliteit claimen, en organisaties die elektronische gezondheidsdata beschikbaar stellen voor <em>secundair gebruik</em> via de Health Data Access Body.'],
    ['Kernverplichtingen (samengevat)','1) Primaire zorg: prioritaire datacategorieën in EU‑formaat & grensoverschrijdende uitwisseling. 2) EHR‑systemen: interoperabiliteit/veiligheid + certificering. 3) Secundair gebruik: vergunning via HDAB, dataminimalisatie/pseudonimisering, beveiligde omgevingen.'],
    ['Documenten & bewijs','EHR‑architectuur & certificaten; beleid patiënt‑toegang & logging; gegevenscatalogus + HDAB‑procedures; DPIA’s & beveiligingsmaatregelen; contracten over interoperabiliteit.'],
    ['Tijdlijn','Gefaseerde toepassing; belangrijke verplichtingen later (richting 2029).'],
    ['Cross‑links','<em>NIS2</em> (zorg & security), <em>AI Act</em> (AI met gezondheidsdata), <em>Data Act</em> (cloud‑exit), <em>DGA</em> (governance/DI), <em>DSA</em> (UGC‑functionaliteit).']
  ]}
};

// ============== Styles (compact) ==============
const styles=`:root{--bg:#f5f6fa;--card:#fff;--text:#23262d;--muted:#6b7280;--line:#e7e9ee;--radius:28px}html,body{background:var(--bg);color:var(--text)}body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial} .container{max-width:1200px;margin:0 auto;padding:2.25rem 1.25rem}.row{display:flex;gap:1rem;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}.h1{font-family:ui-serif,Georgia,Cambria,Times New Roman,Times,serif;font-weight:700;letter-spacing:-.02em;line-height:1.02;margin:0 0 .5rem 0;font-size:clamp(2.25rem,2.1vw + 2rem,3.75rem)}.lead{font-size:1.1rem;line-height:1.75;color:var(--muted);max-width:920px}.muted{color:var(--muted)}.card{border:1px solid var(--line);border-radius:var(--radius);background:var(--card);box-shadow:0 14px 28px rgba(8,15,35,.06),0 1px 2px rgba(8,15,35,.04)}.card-content{padding:1.25rem}.question{border:1px solid var(--line);border-radius:18px;background:#fff;padding:1.1rem;display:flex;flex-direction:column;gap:1rem;box-shadow:0 1px 2px rgba(8,15,35,.04)}.q-title{font-family:ui-serif,Georgia,Cambria,Times New Roman,Times,serif;font-weight:800;letter-spacing:.005em;color:#0f172a;font-size:clamp(1.2rem,.7vw + 1rem,1.6rem)}.q-prompt{font-weight:800;font-size:clamp(1.1rem,.6vw + 1rem,1.35rem);line-height:1.5;color:#111827}.answers{border-top:1px solid var(--line);padding-top:.85rem;display:grid;gap:.7rem}.btn{appearance:none;border:1px solid var(--line);background:#fff;border-radius:999px;padding:.6rem 1rem;font-size:.95rem;cursor:pointer;transition:all .15s ease}.btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(8,15,35,.08)}.btn.secondary{background:#0f172a;color:#fff;border-color:#0f172a}.badge{display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--line);padding:.28rem .7rem;border-radius:999px;font-size:.9rem;background:#fff}.badge.off{opacity:.4}.grid2{display:grid;grid-template-columns:1fr;gap:.7rem}@media(min-width:768px){.grid2{grid-template-columns:1fr 1fr}}.grid3{display:grid;grid-template-columns:1fr;gap:.7rem}@media(min-width:768px){.grid3{grid-template-columns:1fr 1fr 1fr}}.detail{border:1px solid var(--line);border-radius:var(--radius);background:#fff;padding:1.1rem}.detail-title{font-family:ui-serif,Georgia,Cambria,Times New Roman,Times,serif;font-size:1.1rem;font-weight:700;margin-bottom:.35rem}.detail-row{border:1px solid var(--line);background:#fafbfc;border-radius:18px;padding:.95rem}.detail-row-label{font-size:.82rem;font-weight:800;margin-bottom:.2rem;color:#334155;letter-spacing:.02em;text-transform:uppercase}.detail-row-body{font-size:.98rem;color:#334155;line-height:1.6}.chips{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}.right{margin-left:auto;display:flex;gap:.6rem;align-items:center}.small{font-size:.9rem;color:var(--muted)}.ans{font-size:1rem;color:#0f172a}.ans input{transform:translateY(1px)}.input{width:100%;padding:.7rem .8rem;border:1px solid var(--line);border-radius:14px;background:#fff}.code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85rem;background:#0b1020;color:#e2e8f0;padding:.7rem .9rem;border-radius:12px;overflow:auto}@media print{.btn,.input,.ddqc-embed{display:none!important}.container{max-width:none;padding:0}.card{box-shadow:none;border:0}}`;

export default function Component(){
  // Inject CSS
  useEffect(()=>{const id='ddqc-lite-css';if(!document.getElementById(id)){const s=document.createElement('style');s.id=id;s.textContent=styles;document.head.appendChild(s);}},[]);

  // Auto-resize for iframes
  useEffect(()=>{const send=()=>{try{const h=document.documentElement.scrollHeight||document.body.scrollHeight;window.parent?.postMessage({type:'DDQC_HEIGHT',height:h},'*');}catch{}};send();const ro=new ResizeObserver(()=>requestAnimationFrame(send));ro.observe(document.body);window.addEventListener('load',send);window.addEventListener('resize',send);return()=>{ro.disconnect();window.removeEventListener('load',send);window.removeEventListener('resize',send);};},[]);

  // State
  const [nis2Sectors,setNis2Sectors]=useState<string[]>([]);
  const [emp50plus,setEmp50plus]=useState(false);
  const [turnover10m,setTurnover10m]=useState(false);
  const [aiProviderOrDeployer,setAiProviderOrDeployer]=useState(false);
  const [sellsIoTOrRelatedServices,setSellsIoTOrRelatedServices]=useState(false);
  const [financialEntity,setFinancialEntity]=useState(false);
  const [dsaHostingOrUGC,setDsaHostingOrUGC]=useState(false);
  const [itServiceProvider,setItServiceProvider]=useState(false);
  const [itHasFinancialClients,setItHasFinancialClients]=useState(false);
  const [itStoresCustomerData,setItStoresCustomerData]=useState(false);
  const [itServesNis2Orgs,setItServesNis2Orgs]=useState(false);
  const [showAllDetails,setShowAllDetails]=useState(false);
  const [embedUrl,setEmbedUrl]=useState('');

  // DGA / EHDS flags
  const [providesDIS,setProvidesDIS]=useState(false);
  const [dataAltruismOrg,setDataAltruismOrg]=useState(false);
  const [publicSectorProtectedData,setPublicSectorProtectedData]=useState(false);
  const [isHealthcareProvider,setIsHealthcareProvider]=useState(false);
  const [developsEHRorWellnessInteroperable,setDevelopsEHRorWellnessInteroperable]=useState(false);
  const [holdsHealthDataForSecondaryUse,setHoldsHealthDataForSecondaryUse]=useState(false);

  const TRIGGERS = useMemo(()=>{
    return evaluateTriggers({
      nis2Sectors,emp50plus,turnover10m,aiProviderOrDeployer,sellsIoTOrRelatedServices,financialEntity,dsaHostingOrUGC,itServiceProvider,itHasFinancialClients,itStoresCustomerData,itServesNis2Orgs,providesDIS,dataAltruismOrg,publicSectorProtectedData,isHealthcareProvider,developsEHRorWellnessInteroperable,holdsHealthDataForSecondaryUse
    });
  },[nis2Sectors,emp50plus,turnover10m,aiProviderOrDeployer,sellsIoTOrRelatedServices,financialEntity,dsaHostingOrUGC,itServiceProvider,itHasFinancialClients,itStoresCustomerData,itServesNis2Orgs,providesDIS,dataAltruismOrg,publicSectorProtectedData,isHealthcareProvider,developsEHRorWellnessInteroperable,holdsHealthDataForSecondaryUse]);

  const activeLaws=(Object.keys(LAW_LABELS) as LawKey[]).filter(k=> (TRIGGERS as any)[k]);

  // Persist + share
  const formState=useMemo(()=>({nis2Sectors,emp50plus,turnover10m,aiProviderOrDeployer,sellsIoTOrRelatedServices,financialEntity,dsaHostingOrUGC,itServiceProvider,itHasFinancialClients,itStoresCustomerData,itServesNis2Orgs,providesDIS,dataAltruismOrg,publicSectorProtectedData,isHealthcareProvider,developsEHRorWellnessInteroperable,holdsHealthDataForSecondaryUse}),[nis2Sectors,emp50plus,turnover10m,aiProviderOrDeployer,sellsIoTOrRelatedServices,financialEntity,dsaHostingOrUGC,itServiceProvider,itHasFinancialClients,itStoresCustomerData,itServesNis2Orgs,providesDIS,dataAltruismOrg,publicSectorProtectedData,isHealthcareProvider,developsEHRorWellnessInteroperable,holdsHealthDataForSecondaryUse]);
  useEffect(()=>{try{localStorage.setItem('ddqc_state_v1',JSON.stringify(formState));}catch{}},[formState]);
  useEffect(()=>{const apply=(o:any)=>{if(!o)return;setNis2Sectors(o.nis2Sectors||[]);setEmp50plus(!!o.emp50plus);setTurnover10m(!!o.turnover10m);setAiProviderOrDeployer(!!o.aiProviderOrDeployer);setSellsIoTOrRelatedServices(!!o.sellsIoTOrRelatedServices);setFinancialEntity(!!o.financialEntity);setDsaHostingOrUGC(!!o.dsaHostingOrUGC);setItServiceProvider(!!o.itServiceProvider);setItHasFinancialClients(!!o.itHasFinancialClients);setItStoresCustomerData(!!o.itStoresCustomerData);setItServesNis2Orgs(!!o.itServesNis2Orgs);setProvidesDIS(!!o.providesDIS);setDataAltruismOrg(!!o.dataAltruismOrg);setPublicSectorProtectedData(!!o.publicSectorProtectedData);setIsHealthcareProvider(!!o.isHealthcareProvider);setDevelopsEHRorWellnessInteroperable(!!o.developsEHRorWellnessInteroperable);setHoldsHealthDataForSecondaryUse(!!o.holdsHealthDataForSecondaryUse);};
    const fromHash=(()=>{try{const m=location.hash.match(/state=([^&]+)/);if(m){return JSON.parse(decodeURIComponent(atob(m[1])));} }catch{} return null;})();
    if(fromHash)apply(fromHash); else{try{const ls=localStorage.getItem('ddqc_state_v1'); if(ls)apply(JSON.parse(ls));}catch{}}
    try{const u=new URL(window.location.href);u.hash='';setEmbedUrl(u.toString());}catch{} },[]);

  const yesNo=(b:boolean)=>(b?'Ja':'Nee');
  const copySummary=async()=>{const lines=[
    'DD QuickCheck – Resultaat','',
    `1) NIS2-sectoren: ${nis2Sectors.join(', ')||'–'}`,
    `   ≥50 fte: ${yesNo(emp50plus)} | ≥€10m: ${yesNo(turnover10m)}`,
    `2) AI-systemen/GPAI/deploy: ${yesNo(aiProviderOrDeployer)}`,
    `3) IoT/related services: ${yesNo(sellsIoTOrRelatedServices)}`,
    `4) Financiële entiteit: ${yesNo(financialEntity)}`,
    `5) DSA hosting/UGC: ${yesNo(dsaHostingOrUGC)}`,
    `6) IT-dienstverlener: ${yesNo(itServiceProvider)}`,
    `   – Financiële klanten: ${yesNo(itHasFinancialClients)}`,
    `   – Data opgeslagen/gebruikt: ${yesNo(itStoresCustomerData)}`,
    `   – Levert aan NIS2-orgs: ${yesNo(itServesNis2Orgs)}`,
    `7) DGA: DIS: ${yesNo(providesDIS)} | altruism‑org: ${yesNo(dataAltruismOrg)} | overheid met beschermde data: ${yesNo(publicSectorProtectedData)}`,
    `8) EHDS: zorg: ${yesNo(isHealthcareProvider)} | EHR/wellness‑EHR: ${yesNo(developsEHRorWellnessInteroperable)} | secundair via HDAB: ${yesNo(holdsHealthDataForSecondaryUse)}`,'',
    `→ Getriggerde wetten: ${activeLaws.length?activeLaws.join(', '):'(geen)'}
  `].join('\n'); try{await navigator.clipboard.writeText(lines); alert('Samenvatting gekopieerd.');}catch{alert('Kopiëren niet gelukt.');}};

  const downloadPDF=async()=>{const load=(src:string)=>new Promise<void>((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>res();s.onerror=()=>rej(new Error('script load failed:'+src));document.head.appendChild(s);}); const w:any=window as any; if(!w.html2canvas) await load('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'); if(!w.jspdf||!w.jspdf.jsPDF) await load('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'); const root=document.getElementById('ddqc-root'); if(!root) return alert('PDF export: root niet gevonden.'); window.scrollTo(0,0); const canvas=await w.html2canvas(root,{scale:2,backgroundColor:'#fff',useCORS:true}); const img=canvas.toDataURL('image/png'); const pdf=new w.jspdf.jsPDF('p','mm','a4'); const W=pdf.internal.pageSize.getWidth(), H=pdf.internal.pageSize.getHeight(); const m=8, wpx=W-m*2, hpx=canvas.height*wpx/canvas.width; let left=hpx-H; pdf.addImage(img,'PNG',m,m,wpx,hpx); while(left>0){pdf.addPage(); pdf.addImage(img,'PNG',m,(left*-1)+m,wpx,hpx); left-=H;} pdf.save('DD-QuickCheck.pdf'); };

  // Embed: alleen Shopify + parent listener (HTML embed verwijderd)
  const copyEmbedLiquid=async()=>{const src=embedUrl||(typeof window!=='undefined'?window.location.href.split('#')[0]:''); const id=`ddqc-${Math.random().toString(36).slice(2,8)}`; const liquid=[
    `<div class="ddqc-embed">`,
    `  <iframe data-ddqc id="${id}" src="${src}" style="width:100%;border:0;min-height:700px" loading="lazy" allow="clipboard-write" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
    `</div>`,
    `{% comment %} Voeg onderstaande script 1x toe in theme.liquid (onder </body>) {% endcomment %}`,
    `{% comment %}`,
    `<script>`,
    `  (function(){ function resize(e){ try{ if(e.data&&e.data.type==='DDQC_HEIGHT'){ var frames=document.querySelectorAll('iframe[data-ddqc]'); frames.forEach(function(f){ f.style.height=e.data.height+'px'; }); } }catch(_){} } window.addEventListener('message',resize,false); })();`,
    `</script>`,
    `{% endcomment %}`
  ].join('\n'); try{await navigator.clipboard.writeText(liquid); alert('Shopify (Liquid) embed gekopieerd.');}catch{alert('Kopiëren niet gelukt.');}};

  const copyParentListener=async()=>{const script=[
    `<script>`,
    `  (function(){ function resize(e){ try{ if(e.data&&e.data.type==='DDQC_HEIGHT'){ var frames=document.querySelectorAll('iframe[data-ddqc]'); frames.forEach(function(f){ f.style.height=e.data.height+'px'; }); } }catch(_){} } window.addEventListener('message',resize,false); })();`,
    `</script>`
  ].join('\n'); try{await navigator.clipboard.writeText(script); alert('Parent resize script gekopieerd.');}catch{alert('Kopiëren niet gelukt.');}};

  const copyShareLink=async()=>{try{const u=new URL(window.location.href); const enc=btoa(encodeURIComponent(JSON.stringify(formState))); u.hash=`state=${enc}`; await navigator.clipboard.writeText(u.toString()); alert('Link gekopieerd.'); }catch{ alert('Kopiëren niet gelukt.'); }};

  const DEV = typeof window!=='undefined' && new URLSearchParams(window.location.search).get('dev')==='1';

  const LawPill=({law}:{law:LawKey})=>{const active=(TRIGGERS as any)[law]; return <span className={`badge ${active?'':'off'}`} aria-pressed={active}>{LAW_LABELS[law]}</span>;};
  const QuestionRow:React.FC<{children:React.ReactNode}> = ({children})=> (<div className="question" role="group">{children}</div>);

  return (
    <div id="ddqc-root" className="container">
      <div className="row">
        <div>
          <h1 className="h1">DD QuickCheck – Toepasselijkheid EU Tech‑wetgeving</h1>
          <p className="lead">Legal Data Due Diligence (L‑DD) verbreedt de klassieke privacy‑DD. Met nieuwe EU‑regels beoordeel je <em>data, AI, platforms, IT</em> en <em>security</em> samen. Stap (1): bepalen welke wetten waarschijnlijk gelden voor de target.</p>
        </div>
        <div className="right">
          <button type="button" className="btn secondary" onClick={copySummary}>Kopieer samenvatting</button>
          <button type="button" className="btn" onClick={downloadPDF}>Download PDF</button>
        </div>
      </div>

      <div className="card"><div className="card-content">
        <div className="row" style={{alignItems:'center'}}>
          <div style={{flex:1,minWidth:280}}>
            <div className="small">Publieke URL van deze tool (voor embed)</div>
            <input className="input" value={embedUrl} onChange={e=>setEmbedUrl(e.target.value)} placeholder="https://…/dd-quickcheck"/>
          </div>
          <div className="right">
            <button type="button" className="btn" onClick={copyEmbedLiquid}>Copy Embed (Shopify)</button>
            <button type="button" className="btn" onClick={copyParentListener}>Copy Parent Listener</button>
            <button type="button" className="btn" onClick={copyShareLink}>Kopieer link met status</button>
          </div>
        </div>
      </div></div>

      {/* Active laws */}
      <div className="card"><div className="card-content">
        <div className="chips">
          <span className="small">Getriggerde wetten:</span>
          {(Object.keys(LAW_LABELS) as LawKey[]).map(law=> <LawPill key={law} law={law}/>) }
          <div className="right">
            <label className="small" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}>
              <input type="checkbox" checked={showAllDetails} onChange={e=>setShowAllDetails(e.target.checked)}/> Toon alle toelichtingen
            </label>
          </div>
        </div>
      </div></div>

      {/* Q1 NIS2 */}
      <QuestionRow>
        <div className="chips"><span className="badge">1) NIS2 – Sector & omvang</span></div>
        <div className="q-title">NIS2 – Sector & Omvang</div>
        <div className="q-prompt">Is de Company actief in / levert zij diensten aan één of meer van de volgende sectoren?</div>
        <div className="answers">
          <div className="grid2">
            {NIS2_SECTORS.map(s=> (
              <label key={s} className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.5rem'}}>
                <input type="checkbox" checked={nis2Sectors.includes(s)} onChange={e=>{const c=e.target.checked; setNis2Sectors(p=> c?[...p,s]:p.filter(x=>x!==s));}}/> {s}
              </label>
            ))}
          </div>
          <div className="chips" style={{marginTop:'.5rem'}}>
            <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={emp50plus} onChange={e=>setEmp50plus(e.target.checked)}/> Ja, ≥ 50 werknemers</label>
            <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={turnover10m} onChange={e=>setTurnover10m(e.target.checked)}/> Ja, ≥ €10m omzet/balans</label>
          </div>
        </div>
      </QuestionRow>

      {/* Q2 AI */}
      <QuestionRow>
        <div className="chips"><span className="badge">2) AI Act – Ontwikkelt/verkoopt/deployed AI?</span></div>
        <div className="q-title">AI Act – Activiteiten met AI</div>
        <div className="q-prompt">Ontwikkelt of verkoopt de Company AI‑systemen of GPAI‑modellen, of integreert/labelt zij AI‑features / deployed zij AI in haar dienstverlening?</div>
        <div className="answers"><label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.5rem'}}><input type="checkbox" checked={aiProviderOrDeployer} onChange={e=>setAiProviderOrDeployer(e.target.checked)}/> Ja</label></div>
      </QuestionRow>

      {/* Q3 Data Act */}
      <QuestionRow>
        <div className="chips"><span className="badge">3) Data Act – Verbonden (IoT) producten / related services</span></div>
        <div className="q-title">Data Act – Connected producten & diensten</div>
        <div className="q-prompt">Verkoopt de Company verbonden (IoT) producten of levert zij related services die product‑/servicedata genereren?</div>
        <div className="answers"><label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.5rem'}}><input type="checkbox" checked={sellsIoTOrRelatedServices} onChange={e=>setSellsIoTOrRelatedServices(e.target.checked)}/> Ja</label></div>
      </QuestionRow>

      {/* Q4 DORA */}
      <QuestionRow>
        <div className="chips"><span className="badge">4) DORA – Financiële entiteit</span></div>
        <div className="q-title">DORA – Financiële entiteit</div>
        <div className="q-prompt">Is de Company een financiële entiteit (bijv. bank, betaaldienst, verzekeraar, beleggingsonderneming, fondsbeheerder, handelsplatform/CCP/CSD, etc.)?</div>
        <div className="answers"><label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.5rem'}}><input type="checkbox" checked={financialEntity} onChange={e=>setFinancialEntity(e.target.checked)}/> Ja</label></div>
      </QuestionRow>

      {/* Q5 DSA */}
      <QuestionRow>
        <div className="chips"><span className="badge">5) DSA – Intermediary/UGC/Hosting</span></div>
        <div className="q-title">DSA – Gebruikerscontent / Intermediaire diensten</div>
        <div className="q-prompt">Laat de dienst gebruikerscontent opslaan/delen (reviews, posts, reacties, fora, marktplaats, foto’s/video) of fungeert zij als hosting/caching/mere conduit?</div>
        <div className="answers"><label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.5rem'}}><input type="checkbox" checked={dsaHostingOrUGC} onChange={e=>setDsaHostingOrUGC(e.target.checked)}/> Ja</label></div>
      </QuestionRow>

      {/* Q6 IT dienstverlener */}
      <QuestionRow>
        <div className="chips"><span className="badge">6) IT-dienstverlener (cross-links)</span></div>
        <div className="q-title">IT‑dienstverlener</div>
        <div className="q-prompt">Is de Company een IT‑dienstverlener (bijv. MSP/MSSP, cloud/edge, datacenter, CDN, DNS/TLD)?</div>
        <div className="answers">
          <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.5rem'}}><input type="checkbox" checked={itServiceProvider} onChange={e=>setItServiceProvider(e.target.checked)}/> Ja</label>
          {itServiceProvider && (
            <div className="grid3" style={{marginTop:'.5rem'}}>
              <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={itHasFinancialClients} onChange={e=>setItHasFinancialClients(e.target.checked)}/> Klanten in de financiële sector? <span className="muted">(→ DORA flow‑down)</span></label>
              <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={itStoresCustomerData} onChange={e=>setItStoresCustomerData(e.target.checked)}/> Opslag/gebruik van klantdata (cloud/managed)? <span className="muted">(→ Data Act switching)</span></label>
              <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={itServesNis2Orgs} onChange={e=>setItServesNis2Orgs(e.target.checked)}/> Levert aan organisaties in NIS2‑sectoren? <span className="muted">(→ NIS2 keten‑impact)</span></label>
            </div>
          )}
        </div>
      </QuestionRow>

      {/* Q7 DGA */}
      <QuestionRow>
        <div className="chips"><span className="badge">7) DGA – Data intermediation / data altruism / overheid</span></div>
        <div className="q-title">DGA – Rollen & toepasselijkheid</div>
        <div className="q-prompt">Valt de Company onder een van de onderstaande DGA‑rollen?</div>
        <div className="answers">
          <div className="grid2">
            <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={providesDIS} onChange={e=>setProvidesDIS(e.target.checked)}/> Data‑intermediation services (DGA)</label>
            <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={dataAltruismOrg} onChange={e=>setDataAltruismOrg(e.target.checked)}/> Erkende data altruism‑organisatie</label>
            <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={publicSectorProtectedData} onChange={e=>setPublicSectorProtectedData(e.target.checked)}/> Overheidsinstantie met ‘beschermde’ data</label>
          </div>
        </div>
      </QuestionRow>

      {/* Q8 EHDS */}
      <QuestionRow>
        <div className="chips"><span className="badge">8) EHDS – Elektronische gezondheidsdata / EHR / secundair gebruik</span></div>
        <div className="q-title">EHDS – Elektronische gezondheidsdata</div>
        <div className="q-prompt">Valt de Company onder EHDS vanwege een van de volgende situaties?</div>
        <div className="answers">
          <div className="grid2">
            <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={isHealthcareProvider} onChange={e=>setIsHealthcareProvider(e.target.checked)}/> Zorgaanbieder in de EU <span className="muted">(↔ NIS2 ‘Gezondheidszorg’)</span></label>
            <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={developsEHRorWellnessInteroperable} onChange={e=>setDevelopsEHRorWellnessInteroperable(e.target.checked)}/> EHR‑systemen of wellness apps/medische hulpmiddelen met EHR‑interoperabiliteit</label>
            <label className="ans" style={{display:'inline-flex',alignItems:'center',gap:'.35rem'}}><input type="checkbox" checked={holdsHealthDataForSecondaryUse} onChange={e=>setHoldsHealthDataForSecondaryUse(e.target.checked)}/> Beschikbaarstelling voor <em>secundair gebruik</em> via de HDAB</label>
          </div>
        </div>
      </QuestionRow>

      {/* Details */}
      <div className="card"><div className="card-content" style={{display:'flex',flexDirection:'column',gap:'.9rem'}}>
        {(Object.keys(LAW_LABELS) as LawKey[]).filter(k=> (TRIGGERS as any)[k] || showAllDetails).map(law=> (
          <div key={law} className="detail">
            <div className="detail-title">{DETAILS[law].title}</div>
            <div className="grid2">
              {DETAILS[law].rows.map(([label,body],i)=> (
                <div key={i} className="detail-row">
                  <div className="detail-row-label">{label}</div>
                  <div className="detail-row-body" dangerouslySetInnerHTML={{__html:body}}/>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div></div>

      {/* DEV panel alleen met ?dev=1 */}
      {DEV && (
        <div className="card"><div className="card-content">
          <div className="small">Dev self‑tests</div>
          <DevTests />
        </div></div>
      )}

      <div className="small">Tip: <strong>Kopieer samenvatting</strong> voor notulen/datakamers; <strong>Download PDF</strong> maakt een 1‑pager.</div>
    </div>
  );

  function DevTests(){
    const base={nis2Sectors:[],emp50plus:false,turnover10m:false,aiProviderOrDeployer:false,sellsIoTOrRelatedServices:false,financialEntity:false,dsaHostingOrUGC:false,itServiceProvider:false,itHasFinancialClients:false,itStoresCustomerData:false,itServesNis2Orgs:false,providesDIS:false,dataAltruismOrg:false,publicSectorProtectedData:false,isHealthcareProvider:false,developsEHRorWellnessInteroperable:false,holdsHealthDataForSecondaryUse:false};
    const tests:[{name:string;input:any;expect:Partial<ReturnType<typeof evaluateTriggers>>}] = [
      {name:'NIS2 via sector+size',input:{...base,nis2Sectors:['Energie'],emp50plus:true,turnover10m:true},expect:{NIS2:true}},
      {name:'DORA direct',input:{...base,financialEntity:true},expect:{DORA:true}},
      {name:'DSA hosting',input:{...base,dsaHostingOrUGC:true},expect:{DSA:true}},
      {name:'AI Act provider/deployer',input:{...base,aiProviderOrDeployer:true},expect:{AIACT:true}},
      {name:'Data Act cloud switching',input:{...base,itServiceProvider:true,itStoresCustomerData:true},expect:{DATAACT:true}},
      {name:'NIS2 via clients',input:{...base,itServiceProvider:true,itServesNis2Orgs:true},expect:{NIS2:true}},
      {name:'DGA via DIS',input:{...base,providesDIS:true},expect:{DGA:true}},
      {name:'DGA via altruism',input:{...base,dataAltruismOrg:true},expect:{DGA:true}},
      {name:'DGA via public sector',input:{...base,publicSectorProtectedData:true},expect:{DGA:true}},
      {name:'EHDS via provider',input:{...base,isHealthcareProvider:true},expect:{EHDS:true}},
      {name:'EHDS via EHR',input:{...base,developsEHRorWellnessInteroperable:true},expect:{EHDS:true}},
      {name:'EHDS via HDAB',input:{...base,holdsHealthDataForSecondaryUse:true},expect:{EHDS:true}},
      {name:'Combo NIS2&DORA',input:{...base,itServiceProvider:true,itHasFinancialClients:true,itServesNis2Orgs:true},expect:{NIS2:true,DORA:true}},
      {name:'No triggers',input:{...base},expect:{NIS2:false,DORA:false,DSA:false,AIACT:false,DATAACT:false,DGA:false,EHDS:false}},
      {name:'AI+DSA+DataAct',input:{...base,aiProviderOrDeployer:true,dsaHostingOrUGC:true,itServiceProvider:true,itStoresCustomerData:true},expect:{AIACT:true,DSA:true,DATAACT:true}}
    ] as any;
    const results=tests.map(t=>{const got=evaluateTriggers(t.input);const pass=Object.entries(t.expect).every(([k,v])=>(got as any)[k]===v);return{name:t.name,pass,got}});
    return (
      <div className="grid2" style={{marginTop:'.5rem'}}>
        {results.map(r=> (
          <div key={r.name} className="detail-row" style={{borderColor:r.pass?'#86efac':'#fca5a5',background:r.pass?'#f0fdf4':'#fef2f2'}}>
            <div className="detail-row-label">{r.name} — {r.pass?'PASS':'FAIL'}</div>
            <pre className="code">{JSON.stringify(r.got,null,2)}</pre>
          </div>
        ))}
      </div>
    );
  }
}
