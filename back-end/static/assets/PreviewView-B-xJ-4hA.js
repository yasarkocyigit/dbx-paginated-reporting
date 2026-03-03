import{d as Tt,K as Rt,j as Et,k as Ft,L as Ot,E as D,I as At,c as d,b as a,e as E,t as f,F as ae,r as oe,w as $,P as fe,v as qe,Q as Ct,z as Dt,q as x,g as $t,x as v,y as w,o as c,f as Ie,_ as zt}from"./index-CCT9bnxz.js";import{m as ge}from"./mustache-lDDT9aR0.js";import{a as Ne,v as Lt,d as be,p as He,e as Ue,b as he,r as ye,f as Vt}from"./templateValidation-C1UxlFen.js";function Bt(z){const k=[];return{html:z.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi,(le,H)=>(k.push(H??""),"")).trim(),css:k.join(`
`).trim()}}function we(z,k){return k.trim()?`<style>${k}</style>
${z}`:z}const Mt={class:"preview-view"},jt={class:"premium-toolbar mb-4"},qt={class:"toolbar-header mb-3 d-flex justify-content-between align-items-center"},It={class:"d-flex gap-2"},Nt=["disabled"],Ht={key:0,class:"spinner-border spinner-border-sm me-1",role:"status"},Ut={key:1,class:"bi bi-file-earmark-pdf me-1"},Wt={class:"toolbar-controls d-flex gap-3 align-items-center flex-wrap"},Gt={class:"control-group"},Qt=["value"],Kt=["value"],Jt={class:"d-flex align-items-center gap-3 page-setup-controls"},Xt={class:"control-group"},Yt={class:"control-group"},Zt={class:"control-group"},er={class:"control-group"},tr={class:"control-group switch-group"},rr={class:"form-check form-switch m-0 d-flex align-items-center"},ar=["disabled"],or={key:0,class:"premium-info-banner mb-4 d-flex align-items-center"},lr={class:"banner-content"},nr={class:"text-primary me-2"},sr={key:0,class:"text-secondary"},ir={key:1,class:"text-secondary"},ur={class:"text-tertiary ms-2"},dr={key:1,class:"card mb-3"},cr={class:"card-body"},pr={class:"row g-2"},mr={class:"form-label form-label-sm fw-semibold"},vr=["value","onChange"],fr=["onChange"],gr=["value","selected"],br=["value","onChange"],hr=["value"],yr=["value","type","placeholder","onInput"],wr={key:4,class:"small text-danger mt-1"},xr={key:5,class:"small text-muted mt-1"},_r={class:"text-uppercase"},kr={key:0},Pr={key:6,class:"small text-muted"},Sr={key:0},Tr={key:0,class:"small text-danger mb-0 mt-1"},Rr={key:2,class:"card mb-3"},Er={class:"card-body"},Fr={class:"row g-2"},Or={class:"col-md-12"},Ar={class:"mb-2 small p-2 bg-light border rounded"},Cr={key:0,class:"col-md-12"},Dr={class:"mb-2 small p-2 bg-light border rounded"},$r={key:1,class:"col-md-12"},zr={class:"mb-2 small p-2 bg-light border rounded"},Lr={key:2,class:"col-md-12"},Vr={class:"mb-0 small p-2 bg-light border rounded"},Br={class:"preview-container card"},Mr={class:"card-header d-flex justify-content-between align-items-center"},jr={key:0,class:"text-muted small"},qr={class:"card-body p-0"},Ir={key:0,class:"empty-state"},Nr={key:1,class:"d-flex justify-content-center align-items-center",style:{"min-height":"400px"}},Hr={key:2,class:"alert alert-danger m-3"},Ur={key:3,class:"empty-state"},Wr=["srcdoc"],We=5e3,xe=1e5,Ge="<\/script>",Gr=Tt({__name:"PreviewView",setup(z){const k=Rt(),N=Et(),{data:le}=Ft(),{data:H}=Ot(),p=v(()=>{var t;return((t=H.value)==null?void 0:t.find(e=>e.id===k.activeTemplateId))??null}),A=w({}),U=w(!1),L=w(!1),V=w(null),B=w("A4"),M=w("portrait"),ne=w(10),W=w("compact"),T=w(!0),se=w(5),_=w({}),F=w(null),G=w(""),Q=w({}),K=w({});let j=null,q=null,J=0,C=0;const Qe={dept:["department","dept"],status:["status"],curr:["currency","curr","currency_code"],user:["user","user_name","created_by","owner"]},ie=v(()=>{const t=Number(ne.value);return Number.isFinite(t)?Math.min(30,Math.max(5,t)):10}),I=v(()=>{const t=Number(se.value);return Number.isFinite(t)?Math.min(200,Math.max(1,Math.floor(t))):5});function Ke(t,e){if(e<=0||t.length===0)return[t];const n=[];for(let l=0;l<t.length;l+=e)n.push(t.slice(l,l+e));return n}function _e(t=[],e=""){const n=[];return t.forEach(l=>{const s=e?`${e}.${l.name}`:l.name;n.push(s),Array.isArray(l.children)&&l.children.length>0&&n.push(..._e(l.children,s))}),n}function X(t){return t.toLowerCase().replace(/[^a-z0-9]/g,"")}function ke(t){if(typeof t!="string")return!1;const e=t.trim().toUpperCase();return e==="ALL"||e==="(ALL)"||e==="*"}function Y(t,e=""){return Array.isArray(t)?t.join(", "):typeof t=="string"?t:e}function Je(t){return t?Array.from(new Set(t.split(",").map(e=>e.trim()).filter(Boolean))):[]}function Xe(t,e){return`${t}:${e.trim().toLowerCase()}`}function Ye(t){return t||"equals"}function Pe(t,e,n,l){const s=Lt(t);if(!s.isValid)throw new Error(`Template validation failed: ${s.errors[0]}`);const o=be(l)??He(t),i={totalFields:o!=null&&o.showGrandTotal?o.totalFields:[],groupByField:o==null?void 0:o.groupByField,showGroupSubtotals:o==null?void 0:o.showGroupSubtotals,sortByField:o==null?void 0:o.sortByField,sortDirection:o==null?void 0:o.sortDirection,conditionalRules:(o==null?void 0:o.conditionalRules)||[]},u={};o==null||o.parameters.forEach(O=>{O.label&&(u[O.label]=O.value)});const g={...Ue(e,i),...u},m=he(t).trim(),S=o?he(ye(o)).trim():"",b=m||S||t,{html:y,css:R}=Bt(b);if(!n.paginate)return we(ge.render(y,g),R);const ve=Vt(g);if(ve.length===0)return we(ge.render(y,{...g,page_number:1,total_pages:1,rows:[]}),R);const Ve=Ke(ve,n.rowsPerPage),wt=ve.length,xt=Ve.length,Be=Ve.map((O,re)=>{const Me=re*n.rowsPerPage,je=O.map((Pt,St)=>({...Pt,_index:Me+St+1,_total:wt})),kt=Ue({...e,rows:je},i);return ge.render(y,{...g,...kt,rows:je,page_number:re+1,total_pages:xt})}),_t=Be.map((O,re)=>`<div class="ssrs-page-shell${re===Be.length-1?" is-last":""}">${O}</div>`).join(`
`);return we(_t,R)}async function Se(){var l,s;const t=p.value;if(!t){A.value={};return}const e=++J,n=t.id;U.value=!0;try{V.value=null;const o=T.value?Math.min(120,Math.max(10,I.value*3)):10,r=await Te(n,o,ee.value,de.value,ce.value,0);if(e!==J||n!==((l=p.value)==null?void 0:l.id))return;A.value=r.data??{},G.value=r.executed_query||"",F.value=r.filter_debug||null}catch(o){if(e!==J||n!==((s=p.value)==null?void 0:s.id))return;V.value=o instanceof Error?o.message:"Failed to load preview data",A.value={},G.value="",F.value=null}finally{e===J&&(U.value=!1)}}async function Te(t,e,n,l,s=[],o=0){return Ie({url:`/api/v1/templates/${t}/preview-data`,method:"POST",headers:{"Content-Type":"application/json"},data:{limit:e,offset:o,filters:n,group_by:l||void 0,sorts:s}})}async function Ze(t,e,n,l=[]){var m,S;let s=0,o=null,r="",i;const u=[];for(;s<xe;){const b=await Te(t,We,e,n,l,s);o||(o=b),r=b.executed_query||r,i=b.filter_debug||i;const y=Array.isArray((m=b.data)==null?void 0:m.rows)?(S=b.data)==null?void 0:S.rows:[];if(!y.length||(u.push(...y),s+=y.length,y.length<We))break}if(!o)return{data:{rows:[]},row_count:0};u.length>=xe&&N.warning(`Export capped at ${xe.toLocaleString()} rows`);const g=u.map((b,y)=>({...b,_index:y+1,_total:u.length}));return{...o,data:{...o.data||{},rows:g},row_count:g.length,executed_query:r||o.executed_query,filter_debug:i||o.filter_debug}}async function et(t,e,n){return(await Ie({url:`/api/v1/templates/${t}/parameter-options`,method:"POST",headers:{"Content-Type":"application/json"},data:{field:e,limit:100,filters:n}})).values||[]}D([()=>{var t;return(t=p.value)==null?void 0:t.id},()=>T.value,()=>I.value],()=>{Se()},{immediate:!0});const Re=v(()=>(H.value??[]).filter(t=>!!t.id));D(Re,t=>{if(!t.length)return;const e=k.activeTemplateId;t.some(l=>l.id===e)||k.setActiveTemplate(t[0].id)},{immediate:!0});const tt=v(()=>{var t;return p.value?((t=le.value)==null?void 0:t.find(e=>e.id===p.value.structure_id))??null:null});function h(t,e){return Xe(t,e)}function rt(t){return be(t.definition_json)??He(t.html_content??"")}const Ee=v(()=>p.value?rt(p.value):null),P=v(()=>{const t=Ee.value;return t?t.parameters.length?{...t,parameters:t.parameters.map((e,n)=>{const l=h(n,e.label),s=_.value[l],o=e.defaultValue||e.value;return{...e,value:Y(s,o)}})}:t:null}),at=v(()=>{var t;return(((t=P.value)==null?void 0:t.parameters.length)??0)>0}),ot=v(()=>{var l,s,o;const t=new Set,e=((l=tt.value)==null?void 0:l.fields)??[];_e(e).forEach(r=>{const i=r.split(".")[0];i&&t.add(i)}),(o=(s=P.value)==null?void 0:s.columns)==null||o.forEach(r=>{const i=(r.key||"").split(".")[0];i&&t.add(i)});const n=Array.isArray(A.value.rows)?A.value.rows[0]:void 0;return n&&Object.keys(n).filter(r=>!r.startsWith("_")).forEach(r=>t.add(r)),Array.from(t)});function lt(t){const e=ot.value;if(!e.length)return null;const n=new Map;e.forEach(i=>{n.set(X(i),i)});const l=X(t);if(!l)return null;const s=Qe[l]??[],o=[l,...s.map(i=>X(i))];for(const i of o){const u=n.get(i);if(u)return u}return e.find(i=>{const u=X(i);return u.includes(l)||l.includes(u)})??null}function Z(t){const e=(t.filterField||"").trim();return e||lt(t.label)||""}function ue(t){const e=(t.optionsSourceField||"").trim();return e||Z(t)}function Fe(t,e){const n=h(e,t.label),l=_.value[n];return Array.isArray(l)||typeof l=="string"?l:t.defaultValue||t.value}function nt(t,e,n){if(n)return{normalized:Array.isArray(t)?t.map(r=>String(r).trim()).filter(Boolean):String(t||"").split(",").map(r=>r.trim()).filter(Boolean)};const s=(Array.isArray(t)?t.join(","):String(t||"")).trim();if(!s)return{normalized:""};if(e==="number"){const o=Number(s);return Number.isFinite(o)?{normalized:o}:{normalized:s,error:"Must be a valid number"}}if(e==="date"){const o=Date.parse(s);return Number.isNaN(o)?{normalized:s,error:"Must be a valid date"}:{normalized:s}}if(e==="boolean"){const o=s.toLowerCase();return["true","1","yes"].includes(o)?{normalized:!0}:["false","0","no"].includes(o)?{normalized:!1}:{normalized:s,error:"Must be true or false"}}return{normalized:s}}function Oe(t,e){if(!t)return{filters:[],errors:{}};const n=(e==null?void 0:e.skipParameterIndex)??-1,l=!!(e!=null&&e.collectErrors),s={},o=[];return t.parameters.forEach((r,i)=>{if(i===n)return;const u=h(i,r.label),g=Fe(r,i),{normalized:m,error:S}=nt(g,r.dataType,r.allowMultiple),b=Array.isArray(m)?m.join(","):String(m??"");if(r.required&&(!b||b.trim()==="")){l&&(s[u]="This parameter is required");return}if(S){l&&(s[u]=S);return}const y=Z(r);if(!y||m==null||b.trim()===""||ke(m))return;let R=Ye(r.filterOperator);r.allowMultiple&&R==="equals"&&(R="in"),R==="equals"&&typeof m=="string"&&m.includes(",")&&(R="in"),o.push({field:y,operator:R,value:m})}),{filters:o,errors:s}}const ee=v(()=>{const{filters:t,errors:e}=Oe(P.value,{collectErrors:!0});return K.value=e,t}),de=v(()=>{var e;return(((e=P.value)==null?void 0:e.groupByField)||"").trim()||void 0}),ce=v(()=>{const t=P.value;if(!t)return[];const e=(t.sortByField||"").trim();return e?[{field:e,direction:t.sortDirection==="desc"?"desc":"asc"}]:[]}),st=v(()=>JSON.stringify({filters:ee.value,groupBy:de.value,sorts:ce.value}));function Ae(){const t=Ee.value;if(!t){_.value={};return}const e={};t.parameters.forEach((n,l)=>{const s=n.defaultValue||n.value;e[h(l,n.label)]=n.allowMultiple?Je(s):s}),_.value=e}function it(){Ae()}D(()=>{var t;return(t=p.value)==null?void 0:t.id},()=>{Q.value={},C+=1,Ae()},{immediate:!0});function ut(t,e){const l=(t.parameters[e].dependsOn||"").trim().toLowerCase();if(!l)return!0;const s=t.parameters.findIndex(r=>r.label.trim().toLowerCase()===l);if(s<0)return!0;const o=Fe(t.parameters[s],s);return Array.isArray(o)?o.length>0:!o||!String(o).trim()?!1:!ke(o)}async function dt(){var s,o,r,i;const t=P.value,e=(s=p.value)==null?void 0:s.id,n=++C;if(!t||!e){n===C&&(Q.value={});return}const l={};for(let u=0;u<t.parameters.length;u++){if(n!==C||e!==((o=p.value)==null?void 0:o.id))return;const g=t.parameters[u],m=h(u,g.label),S=g.staticOptions||[];if(S.length>0){l[m]=S;continue}const b=ue(g);if(b){if(!ut(t,u)){l[m]=[];continue}try{const y=Oe(t,{skipParameterIndex:u}).filters;if(l[m]=await et(e,b,y),n!==C||e!==((r=p.value)==null?void 0:r.id))return}catch{l[m]=[]}}}n===C&&e===((i=p.value)==null?void 0:i.id)&&(Q.value=l)}function ct(){q&&clearTimeout(q),q=setTimeout(()=>{dt()},200)}function te(t,e){return Q.value[h(t,e)]||[]}function pe(t,e,n){_.value[h(t,e)]=n}function pt(t,e,n){const l=n.target,s=Array.from(l.selectedOptions).map(o=>o.value);_.value[h(t,e)]=s}function mt(t){return t.dataType==="number"?"number":t.dataType==="date"?"date":"text"}const Ce=v(()=>Object.keys(K.value).length>0),De=v(()=>{if(!p.value)return{html:"",error:null};try{const t=P.value,e=Le(p.value,t),n=t?Ne(t):p.value.definition_json;return{html:Pe(e,A.value,{paginate:T.value,rowsPerPage:I.value},n),error:null}}catch(t){return{html:"",error:t instanceof Error?t.message:"Template render failed"}}}),me=v(()=>De.value.html);D(De,t=>{V.value=t.error},{immediate:!0}),D(()=>st.value,()=>{p.value&&(Ce.value||(j&&clearTimeout(j),j=setTimeout(()=>{Se()},250)))}),D(()=>{var t,e;return JSON.stringify({templateId:((t=p.value)==null?void 0:t.id)||"",overrides:_.value,model:((e=P.value)==null?void 0:e.parameters)??[]})},()=>{ct()},{immediate:!0}),At(()=>{j&&clearTimeout(j),q&&clearTimeout(q)});const vt=`
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js">${Ge}
<script>
document.addEventListener('DOMContentLoaded', function() {
  var COLORS = [
    'rgba(52,152,219,0.8)','rgba(46,204,113,0.8)','rgba(155,89,182,0.8)',
    'rgba(241,196,15,0.8)','rgba(231,76,60,0.8)','rgba(26,188,156,0.8)',
    'rgba(230,126,34,0.8)'
  ];
  var BORDERS = [
    'rgba(52,152,219,1)','rgba(46,204,113,1)','rgba(155,89,182,1)',
    'rgba(241,196,15,1)','rgba(231,76,60,1)','rgba(26,188,156,1)',
    'rgba(230,126,34,1)'
  ];

  function parse(el) {
    var l = (el.getAttribute('data-labels') || '').replace(/^\\[|]$/g, '');
    var v = (el.getAttribute('data-values') || '').replace(/^\\[|]$/g, '');
    return {
      labels: l.split(',').map(function(s){return s.trim()}).filter(Boolean),
      values: v.split(',').map(function(s){return s.trim()}).filter(Boolean).map(Number)
    };
  }

  function render(selector, type) {
    document.querySelectorAll(selector).forEach(function(el) {
      var d = parse(el);
      if (!d.labels.length) return;
      var canvas = document.createElement('canvas');
      canvas.style.maxHeight = '300px';
      el.innerHTML = '';
      el.appendChild(canvas);
      new Chart(canvas, {
        type: type,
        data: {
          labels: d.labels,
          datasets: [{
            data: d.values,
            backgroundColor: COLORS.slice(0, d.values.length),
            borderColor: type === 'pie' ? '#fff' : BORDERS.slice(0, d.values.length),
            borderWidth: type === 'pie' ? 2 : 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: type === 'pie', position: 'bottom' } },
          scales: type === 'bar' ? { y: { beginAtZero: true } } : {}
        }
      });
    });
  }

  render('.report-bar-chart', 'bar');
  render('.report-pie-chart', 'pie');
});
${Ge}`,ft=v(()=>{const t=B.value==="A4"?{width:210,height:297}:{width:216,height:279};return M.value==="portrait"?t:{width:t.height,height:t.width}}),gt=v(()=>`${B.value} ${M.value} • ${ie.value}mm margin • ${W.value} density • ${T.value?`${I.value} rows/page`:"pagination off"}`),bt=v(()=>{const{width:t,height:e}=ft.value,n=Math.max(120,t-ie.value*2),l=W.value==="compact"?"16px 20px":"24px 28px";return`
  @page { size: ${B.value} ${M.value}; margin: ${ie.value}mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #212529; font-size: 14px; overflow-x: hidden; }

  .report-page {
    width: ${t}mm;
    min-height: ${e}mm;
    margin: 16px auto;
    background: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    page-break-after: auto;
    break-after: auto;
    padding: ${l};
    position: relative;
    overflow: hidden;
  }
  .report-page:last-child { page-break-after: auto; break-after: auto; }

  h1, h2, h3 { color: #2d3e50; }
  h1 { font-weight: 700; }

  .report-tile {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    color: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
  }
  .report-tile.tile-primary {
    background: linear-gradient(135deg, #2d3e50 0%, #34495e 100%);
    box-shadow: 0 4px 15px rgba(45, 62, 80, 0.3);
  }
  .report-tile.tile-success {
    background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%);
    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
  }
  .report-tile.tile-warning {
    background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
    box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
  }
  .report-tile.tile-danger {
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
  }
  .report-tile-title {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .report-tile-value { font-size: 2rem; font-weight: 700; }

  .report-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
  .report-table thead { background: #2d3e50; color: white; }
  .report-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.875rem; }
  .report-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #eee; }
  .ssrs-page-shell { margin: 0 0 16px 0; }
  .ssrs-page-shell.is-last { margin-bottom: 0; }
  .ssrs-page-break { display: none; }

  .chart-container { background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; border: 1px solid #eee; overflow: hidden; }
  .chart-title { font-size: 1rem; font-weight: 600; color: #2d3e50; margin-bottom: 1rem; }
  .report-bar-chart, .report-pie-chart { position: relative; width: 100%; max-height: 300px; }

  .page-number { text-align: center; font-size: 0.75rem; color: #999; padding-top: 1.5rem; margin-top: auto; border-top: 1px solid #eee; }

  @media print {
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
    }

    .gl-report-shell,
    .report-preview,
    .report-preview-wrapper {
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      min-height: 0 !important;
      display: block !important;
      box-shadow: none !important;
    }

    .ssrs-page-shell {
      margin: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    .ssrs-page-shell.is-last {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .ssrs-page-break {
      display: none !important;
    }

    .report-page {
      width: ${n}mm !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      page-break-after: auto !important;
      break-after: auto !important;
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }

    .gl-report-page {
      width: ${n}mm !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      page-break-after: auto !important;
      break-after: auto !important;
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }

    .gl-footer-container,
    .footer-container,
    .page-number {
      position: static !important;
      bottom: auto !important;
      left: auto !important;
      right: auto !important;
      margin-top: 10mm !important;
    }

    .row { display: flex !important; flex-wrap: wrap !important; }
    [class*="col-"] { flex-shrink: 0; }
    .col-1, .col-sm-1, .col-md-1, .col-lg-1 { width: 8.3333% !important; }
    .col-2, .col-sm-2, .col-md-2, .col-lg-2 { width: 16.6667% !important; }
    .col-3, .col-sm-3, .col-md-3, .col-lg-3 { width: 25% !important; }
    .col-4, .col-sm-4, .col-md-4, .col-lg-4 { width: 33.3333% !important; }
    .col-5, .col-sm-5, .col-md-5, .col-lg-5 { width: 41.6667% !important; }
    .col-6, .col-sm-6, .col-md-6, .col-lg-6 { width: 50% !important; }
    .col-7, .col-sm-7, .col-md-7, .col-lg-7 { width: 58.3333% !important; }
    .col-8, .col-sm-8, .col-md-8, .col-lg-8 { width: 66.6667% !important; }
    .col-9, .col-sm-9, .col-md-9, .col-lg-9 { width: 75% !important; }
    .col-10, .col-sm-10, .col-md-10, .col-lg-10 { width: 83.3333% !important; }
    .col-11, .col-sm-11, .col-md-11, .col-lg-11 { width: 91.6667% !important; }
    .col-12, .col-sm-12, .col-md-12, .col-lg-12 { width: 100% !important; }
    .d-flex { display: flex !important; }
    .gap-2 { gap: 0.5rem !important; }
    .g-3 { --bs-gutter-x: 1rem; --bs-gutter-y: 1rem; }
    .report-table thead { display: table-header-group !important; }
    .report-table tfoot { display: table-footer-group !important; }
  }
`});function $e(t,e="Report"){return`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<style>${bt.value}</style>
</head>
<body>${t}${vt}</body></html>`}const ze=v(()=>{var t;return me.value?$e(me.value,((t=p.value)==null?void 0:t.name)??"Report"):""});function ht(t){t&&k.setActiveTemplate(t)}function Le(t,e){if(he(t.html_content??"").trim())return t.html_content??"";if(e)return ye(e);const l=be(t.definition_json);return l?ye(l):t.html_content??""}async function yt(){if(!p.value){N.warning("No template selected");return}L.value=!0;try{const t=await Ze(p.value.id,ee.value,de.value,ce.value),e=P.value,n=e?Ne(e):p.value.definition_json,l=Le(p.value,e),s=Pe(l,t.data??{},{paginate:T.value,rowsPerPage:I.value},n),o=$e(s,p.value.name),r=document.createElement("iframe");r.style.cssText="position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden;",document.body.appendChild(r),r.srcdoc=o,r.onload=()=>{const i=r.contentWindow,u=()=>{if(i.document.querySelectorAll(".report-bar-chart:empty, .report-pie-chart:empty").length>0&&g<20){g++,setTimeout(u,150);return}i.focus(),i.print(),setTimeout(()=>{try{document.body.removeChild(r)}catch{}},2e3)};let g=0;setTimeout(u,1e3)}}catch{N.warning("Failed to generate PDF")}finally{L.value=!1}}return(t,e)=>{var n,l,s,o;return c(),d("div",Mt,[a("div",jt,[a("div",qt,[e[7]||(e[7]=a("h4",{class:"toolbar-title mb-0"},[a("i",{class:"bi bi-file-earmark-pdf me-2"}),E(" Preview & Export ")],-1)),a("div",It,[a("button",{class:"btn btn-primary btn-sm px-3",onClick:yt,disabled:!p.value||L.value},[L.value?(c(),d("span",Ht)):(c(),d("i",Ut)),E(" "+f(L.value?"Generating PDF...":"Export PDF"),1)],8,Nt)])]),a("div",Wt,[a("div",Gt,[e[9]||(e[9]=a("label",{class:"control-label"},"Template",-1)),a("select",{value:((n=p.value)==null?void 0:n.id)||"",class:"ep-select",style:{width:"200px"},onChange:e[0]||(e[0]=r=>ht(r.target.value))},[e[8]||(e[8]=a("option",{value:"",disabled:""},"Select Template",-1)),(c(!0),d(ae,null,oe(Re.value,r=>(c(),d("option",{key:r.id,value:r.id},f(r.name),9,Kt))),128))],40,Qt)]),e[20]||(e[20]=a("div",{class:"control-divider"},null,-1)),a("div",Jt,[a("div",Xt,[e[11]||(e[11]=a("label",{class:"control-label"},"Size",-1)),$(a("select",{"onUpdate:modelValue":e[1]||(e[1]=r=>B.value=r),class:"ep-select w-auto"},[...e[10]||(e[10]=[a("option",{value:"A4"},"A4",-1),a("option",{value:"Letter"},"Letter",-1)])],512),[[fe,B.value]])]),a("div",Yt,[e[13]||(e[13]=a("label",{class:"control-label"},"Orientation",-1)),$(a("select",{"onUpdate:modelValue":e[2]||(e[2]=r=>M.value=r),class:"ep-select w-auto"},[...e[12]||(e[12]=[a("option",{value:"portrait"},"Portrait",-1),a("option",{value:"landscape"},"Landscape",-1)])],512),[[fe,M.value]])]),a("div",Zt,[e[14]||(e[14]=a("label",{class:"control-label"},"Margin (mm)",-1)),$(a("input",{"onUpdate:modelValue":e[3]||(e[3]=r=>ne.value=r),type:"number",class:"ep-input w-auto",min:"5",max:"30",step:"1"},null,512),[[qe,ne.value,void 0,{number:!0}]])]),a("div",er,[e[16]||(e[16]=a("label",{class:"control-label"},"Density",-1)),$(a("select",{"onUpdate:modelValue":e[4]||(e[4]=r=>W.value=r),class:"ep-select w-auto"},[...e[15]||(e[15]=[a("option",{value:"compact"},"Compact",-1),a("option",{value:"comfortable"},"Comfortable",-1)])],512),[[fe,W.value]])]),e[19]||(e[19]=a("div",{class:"control-divider"},null,-1)),a("div",tr,[e[17]||(e[17]=a("label",{for:"paginateRowsToggle",class:"control-label"},"Paginate",-1)),a("div",rr,[$(a("input",{id:"paginateRowsToggle","onUpdate:modelValue":e[5]||(e[5]=r=>T.value=r),class:"form-check-input m-0",type:"checkbox",style:{cursor:"pointer"}},null,512),[[Ct,T.value]])])]),a("div",{class:Dt(["control-group",{"opacity-50":!T.value}])},[e[18]||(e[18]=a("label",{class:"control-label"},"Rows / Page",-1)),$(a("input",{"onUpdate:modelValue":e[6]||(e[6]=r=>se.value=r),type:"number",class:"ep-input w-auto",min:"1",max:"200",step:"1",disabled:!T.value},null,8,ar),[[qe,se.value,void 0,{number:!0}]])],2)])])]),p.value?(c(),d("div",or,[e[21]||(e[21]=a("i",{class:"bi bi-info-circle text-muted me-3"},null,-1)),a("div",lr,[a("strong",nr,f(p.value.name),1),U.value?(c(),d("span",sr,"Loading data from Unity Catalog...")):(c(),d("span",ir,"Preview shows first 10 rows. Export PDF generates the full report.")),a("span",ur,"("+f(gt.value)+")",1)])])):x("",!0),p.value&&at.value?(c(),d("div",dr,[a("div",{class:"card-header d-flex justify-content-between align-items-center"},[e[22]||(e[22]=a("span",null,[a("i",{class:"bi bi-sliders me-2"}),E("Parameter Test (Preview/Export only)")],-1)),a("button",{class:"btn btn-sm btn-outline-secondary",onClick:it}," Reset ")]),a("div",cr,[a("div",pr,[(c(!0),d(ae,null,oe(((l=P.value)==null?void 0:l.parameters)??[],(r,i)=>(c(),d("div",{key:`${r.label}-${i}`,class:"col-md-4"},[a("label",mr,f(r.label),1),r.dataType==="boolean"?(c(),d("select",{key:0,class:"form-select form-select-sm",value:Y(_.value[h(i,r.label)],r.defaultValue||r.value),onChange:u=>pe(i,r.label,u.target.value)},[...e[23]||(e[23]=[a("option",{value:""},"(empty)",-1),a("option",{value:"true"},"true",-1),a("option",{value:"false"},"false",-1)])],40,vr)):te(i,r.label).length>0&&r.allowMultiple?(c(),d("select",{key:1,class:"form-select form-select-sm",multiple:"",size:"4",onChange:u=>pt(i,r.label,u)},[(c(!0),d(ae,null,oe(te(i,r.label),u=>(c(),d("option",{key:`multi-${r.label}-${u}`,value:u,selected:Array.isArray(_.value[h(i,r.label)])&&_.value[h(i,r.label)].includes(u)},f(u),9,gr))),128))],40,fr)):te(i,r.label).length>0?(c(),d("select",{key:2,class:"form-select form-select-sm",value:Y(_.value[h(i,r.label)],r.defaultValue||r.value),onChange:u=>pe(i,r.label,u.target.value)},[e[24]||(e[24]=a("option",{value:""},"(empty)",-1)),(c(!0),d(ae,null,oe(te(i,r.label),u=>(c(),d("option",{key:`single-${r.label}-${u}`,value:u},f(u),9,hr))),128))],40,br)):(c(),d("input",{key:3,value:Y(_.value[h(i,r.label)],r.defaultValue||r.value),type:mt(r),class:"form-control form-control-sm",placeholder:r.defaultValue||r.value,onInput:u=>pe(i,r.label,u.target.value)},null,40,yr)),K.value[h(i,r.label)]?(c(),d("div",wr,f(K.value[h(i,r.label)]),1)):x("",!0),Z(r)?(c(),d("div",xr,[e[25]||(e[25]=E(" Dataset filter: ",-1)),a("code",null,f(Z(r)),1),a("span",_r,"("+f(r.filterOperator||"equals")+")",1),r.filterField?x("",!0):(c(),d("span",kr," (auto)"))])):x("",!0),ue(r)?(c(),d("div",Pr,[e[27]||(e[27]=E(" Options source: ",-1)),a("code",null,f(ue(r)),1),r.dependsOn?(c(),d("span",Sr,[e[26]||(e[26]=E(" | depends on ",-1)),a("code",null,f(r.dependsOn),1)])):x("",!0)])):x("",!0)]))),128))]),e[28]||(e[28]=a("p",{class:"small text-muted mb-0 mt-2"}," Changes here are not saved to template metadata. Parameters with dataset filter mapping are applied on backend query. ",-1)),Ce.value?(c(),d("p",Tr," Fix parameter validation errors to refresh preview. ")):x("",!0)])])):x("",!0),p.value&&F.value?(c(),d("div",Rr,[e[33]||(e[33]=a("div",{class:"card-header"},[a("span",null,[a("i",{class:"bi bi-bug me-2"}),E("Filter Debug & Query Trace")])],-1)),a("div",Er,[a("div",Fr,[a("div",Or,[e[29]||(e[29]=a("div",{class:"small text-muted mb-1"},"Applied Filter Payload",-1)),a("pre",Ar,f(JSON.stringify(ee.value,null,2)),1)]),F.value.where_clause?(c(),d("div",Cr,[e[30]||(e[30]=a("div",{class:"small text-muted mb-1"},"WHERE Clause",-1)),a("pre",Dr,f(String(F.value.where_clause)),1)])):x("",!0),F.value.order_by_clause?(c(),d("div",$r,[e[31]||(e[31]=a("div",{class:"small text-muted mb-1"},"ORDER BY Clause",-1)),a("pre",zr,f(String(F.value.order_by_clause)),1)])):x("",!0),G.value?(c(),d("div",Lr,[e[32]||(e[32]=a("div",{class:"small text-muted mb-1"},"Executed SQL (limited)",-1)),a("pre",Vr,f(G.value),1)])):x("",!0)])])])):x("",!0),a("div",Br,[a("div",Mr,[e[34]||(e[34]=a("span",null,[a("i",{class:"bi bi-file-richtext me-2"}),E(" Report Preview")],-1)),p.value?(c(),d("span",jr," Structure: "+f((o=(s=$t(le))==null?void 0:s.find(r=>r.id===p.value.structure_id))==null?void 0:o.name),1)):x("",!0)]),a("div",qr,[p.value?U.value?(c(),d("div",Nr,[...e[36]||(e[36]=[a("div",{class:"spinner-border",role:"status"},null,-1)])])):V.value?(c(),d("div",Hr,[e[37]||(e[37]=a("strong",null,"Preview render error:",-1)),E(" "+f(V.value),1)])):me.value?ze.value?(c(),d("iframe",{key:4,class:"pdf-preview-frame",srcdoc:ze.value},null,8,Wr)):x("",!0):(c(),d("div",Ur,[...e[38]||(e[38]=[a("i",{class:"bi bi-file-earmark-break d-block"},null,-1),a("p",null,"Template selected but no output rendered.",-1)])])):(c(),d("div",Ir,[...e[35]||(e[35]=[a("i",{class:"bi bi-file-earmark-x d-block"},null,-1),a("p",null,"Select a template to preview",-1)])]))])])])}}}),Xr=zt(Gr,[["__scopeId","data-v-fe0a1500"]]);export{Xr as default};
