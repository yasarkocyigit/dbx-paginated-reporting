const k="<!-- DESIGNER_META_START",M="DESIGNER_META_END -->";function O(t){return t.replace(/[_-]+/g," ").trim().replace(/\s+/g," ").replace(/\b\w/g,e=>e.toUpperCase())}function b(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function B(t){const e=[],r=t.replace(/\{\{[\s\S]*?\}\}/g,n=>{const o=`__MUSTACHE_TOKEN_${e.length}__`;return e.push(n),o});return b(r).replace(/__MUSTACHE_TOKEN_(\d+)__/g,(n,o)=>{const i=Number(o);return e[i]??""})}function m(t){return t.trim().replace(/[^\w.]/g,"")}function L(t){return["equals","not_equals","contains","starts_with","ends_with","gt","gte","lt","lte","in"].includes(t)}function I(t){return["string","number","date","boolean","enum"].includes(t)}function P(t){return["asc","desc"].includes(t)}function z(t){return["equals","not_equals","contains","gt","gte","lt","lte"].includes(t)}function E(t){return Array.isArray(t)?Array.from(new Set(t.map(e=>String(e||"").trim()).filter(e=>e.length>0))):[]}function g(t){return typeof t=="object"&&t!==null&&!Array.isArray(t)}function G(t){const e=t.split(".").pop()||t;return O(e)}function et(t){const e=t.slice(0,6).map(s=>({key:s,label:G(s),align:"left"}));return{version:1,title:"General Ledger Detail",subtitle:"Consolidated Entity: Global Corp Inc.",periodLabel:"Period: Dec 2024",runDateField:"txn_date",accountGroupLabel:"Account Group: 5000 - Operating Expenses",showRowNumber:!0,showGrandTotal:!0,totalLabel:"GRAND TOTAL:",totalFields:t.filter(s=>/amount|total|debit|credit|balance|qty|count/i.test(s)).slice(0,3),footerLeft:"PAGINATED REPORTING",footerCenter:"CONFIDENTIAL",footerRight:"Page {{page_number}} of {{total_pages}}",columns:e,parameters:[{label:"DEPT",value:"ALL",dataType:"string",defaultValue:"ALL"},{label:"STATUS",value:"POSTED, PENDING",dataType:"string",defaultValue:"POSTED, PENDING"},{label:"CURR",value:"USD",dataType:"string",defaultValue:"USD"},{label:"USER",value:"SYS_ADMIN",dataType:"string",defaultValue:"SYS_ADMIN"}],showGroupSubtotals:!1,sortDirection:"asc",conditionalRules:[]}}function A(t){var a,c,d,f,p,v,x,T,R;const e=(t.columns||[]).map(l=>({key:m(l.key||""),label:(l.label||"").trim(),align:l.align==="center"||l.align==="right"?l.align:"left"})).filter(l=>l.key.length>0).map(l=>({...l,label:l.label||G(l.key)})),r=new Set(e.map(l=>l.key)),s=m(t.groupByField||""),n=m(t.sortByField||""),o=P(String(t.sortDirection||""))?t.sortDirection:"asc",i=(t.conditionalRules||[]).map(l=>({field:m(l.field||""),operator:z(String(l.operator||""))?l.operator:"equals",value:String(l.value||"").trim(),cssClass:String(l.cssClass||"").trim().replace(/[^\w-]/g,"")})).filter(l=>l.field.length>0&&l.cssClass.length>0);return{version:1,title:((a=t.title)==null?void 0:a.trim())||"General Ledger Detail",subtitle:((c=t.subtitle)==null?void 0:c.trim())||"Consolidated Entity: Global Corp Inc.",periodLabel:((d=t.periodLabel)==null?void 0:d.trim())||"Period: Dec 2024",runDateField:m(t.runDateField||"txn_date")||"txn_date",accountGroupLabel:((f=t.accountGroupLabel)==null?void 0:f.trim())||"Account Group: 5000 - Operating Expenses",showRowNumber:!!t.showRowNumber,showGrandTotal:typeof t.showGrandTotal=="boolean"?t.showGrandTotal:!!((p=t.totalFields)!=null&&p.length),totalLabel:((v=t.totalLabel)==null?void 0:v.trim())||"GRAND TOTAL:",totalFields:Array.from(new Set((t.totalFields||[]).map(l=>m(l||"")).filter(l=>l.length>0&&r.has(l)))),footerLeft:((x=t.footerLeft)==null?void 0:x.trim())||"PAGINATED REPORTING",footerCenter:((T=t.footerCenter)==null?void 0:T.trim())||"CONFIDENTIAL",footerRight:((R=t.footerRight)==null?void 0:R.trim())||"Page {{page_number}} of {{total_pages}}",columns:e,groupByField:s||void 0,showGroupSubtotals:!!t.showGroupSubtotals,sortByField:n||void 0,sortDirection:o,conditionalRules:i,parameters:(t.parameters||[]).map(l=>{const h=String(l.filterOperator||""),F=L(h)?h:void 0,D=String(l.dataType||""),u=I(D)?D:"string",w=E(l.staticOptions),S=m(String(l.optionsSourceField||"")),C=String(l.dependsOn||"").trim();return{label:(l.label||"").trim(),value:(l.value||"").trim(),defaultValue:String(l.defaultValue||"").trim(),dataType:u,required:!!l.required,allowMultiple:!!l.allowMultiple,staticOptions:w,optionsSourceField:S||void 0,dependsOn:C||void 0,filterField:m(String(l.filterField||"")),filterOperator:F}}).filter(l=>l.label.length>0).map(l=>{var h;return{...l,defaultValue:l.defaultValue||void 0,staticOptions:(h=l.staticOptions)!=null&&h.length?l.staticOptions:void 0,filterField:l.filterField||void 0}})}}function ot(t){if(!g(t))return null;const e=Array.isArray(t.columns)?t.columns:[],r=Array.isArray(t.parameters)?t.parameters:[],s=Array.isArray(t.conditionalRules)?t.conditionalRules:[],n={version:Number(t.version??1)||1,title:String(t.title??""),subtitle:String(t.subtitle??""),periodLabel:String(t.periodLabel??""),runDateField:String(t.runDateField??""),accountGroupLabel:String(t.accountGroupLabel??""),showRowNumber:!!t.showRowNumber,showGrandTotal:typeof t.showGrandTotal=="boolean"?t.showGrandTotal:Array.isArray(t.totalFields)&&t.totalFields.length>0,totalLabel:String(t.totalLabel??""),totalFields:Array.isArray(t.totalFields)?t.totalFields.map(o=>String(o)):[],footerLeft:String(t.footerLeft??""),footerCenter:String(t.footerCenter??""),footerRight:String(t.footerRight??""),groupByField:String(t.groupByField??""),showGroupSubtotals:!!t.showGroupSubtotals,sortByField:String(t.sortByField??""),sortDirection:String(t.sortDirection??"asc"),conditionalRules:s.map(o=>({field:g(o)?String(o.field??""):"",operator:g(o)?String(o.operator??"equals"):"equals",value:g(o)?String(o.value??""):"",cssClass:g(o)?String(o.cssClass??""):""})),columns:e.map(o=>({key:g(o)?String(o.key??""):"",label:g(o)?String(o.label??""):"",align:g(o)?String(o.align??"left"):"left"})),parameters:r.map(o=>{const i=g(o)?String(o.filterOperator??""):"",a=L(i)?i:void 0;return{label:g(o)?String(o.label??""):"",value:g(o)?String(o.value??""):"",defaultValue:g(o)?String(o.defaultValue??""):"",dataType:g(o)?String(o.dataType??"string"):"string",required:g(o)?!!o.required:!1,allowMultiple:g(o)?!!o.allowMultiple:!1,staticOptions:g(o)?E(o.staticOptions):[],optionsSourceField:g(o)?String(o.optionsSourceField??""):"",dependsOn:g(o)?String(o.dependsOn??""):"",filterField:g(o)?String(o.filterField??""):"",filterOperator:a}})};return!n.columns.length&&!n.title&&!n.accountGroupLabel?null:A(n)}function rt(t){return{kind:"designer_v1",...A(t)}}function lt(t){const e=t.match(/<!--\s*DESIGNER_META_START\s*([\s\S]*?)\s*DESIGNER_META_END\s*-->/);if(!(e!=null&&e[1]))return null;try{const r=JSON.parse(e[1]);return A(r)}catch{return null}}function nt(t){return t.replace(/<!--\s*DESIGNER_META_START[\s\S]*?DESIGNER_META_END\s*-->/g,"").trim()}function V(t){return`${k}
${JSON.stringify(t,null,2)}
${M}`}function q(t,e){return t==="right"||e?"num":t==="center"?"center":""}function U(t,e){return t==="right"||e?"num":t==="center"?"center":""}function st(t){const e=A(t),r=e.columns.length?e.columns:[{key:"txn_id",label:"Txn Id",align:"left"}],s=new Set(e.totalFields),n=r.map(u=>{const w=/amount|total|debit|credit|balance|qty|count/i.test(u.key);return`<th class="${U(u.align,w)}">${b(u.label)}</th>`}).join(`
            `),o=r.map(u=>{const w=/amount|total|debit|credit|balance|qty|count/i.test(u.key),S=q(u.align,w);return`<td${S?` class="${S}"`:""}>{{${u.key}}}</td>`}).join(`
              `),i=e.showRowNumber?`<th class="num">#</th>
            ${n}`:n,a=e.showRowNumber?`<td class="num">{{_index}}</td>
              ${o}`:o;let c=!1;const d=r.map(u=>s.has(u.key)?`<td class="num">{{_totals.${u.key}}}</td>`:c?"<td></td>":(c=!0,`<td class="gl-total-label">${b(e.totalLabel)}</td>`)).join(`
              `),f=e.showGrandTotal?`<tr class="gl-grand-total-row">
          ${e.showRowNumber?"<td></td>":""}
          ${d}
        </tr>`:"";let p=!1;const v=r.map(u=>s.has(u.key)?`<td class="num">{{_group_totals.${u.key}}}</td>`:p?"<td></td>":(p=!0,'<td class="gl-total-label">GROUP SUBTOTAL:</td>')).join(`
              `),x=e.showRowNumber?r.length+1:r.length,T=e.groupByField?`
        {{#rows_render}}
        {{#_group_header}}
        <tr class="gl-group-break">
          <td colspan="${x}">${b(e.groupByField)}: {{_group_value}}</td>
        </tr>
        {{/_group_header}}
        {{#_is_data}}
        <tr class="gl-data-row {{_row_class}}">
          ${a}
        </tr>
        {{/_is_data}}
        ${e.showGroupSubtotals?`{{#_group_subtotal}}
        <tr class="gl-group-subtotal-row">
          ${e.showRowNumber?"<td></td>":""}
          ${v}
        </tr>
        {{/_group_subtotal}}`:""}
        {{/rows_render}}
      `:`
        {{#rows}}
        <tr class="gl-data-row {{_row_class}}">
          ${a}
        </tr>
        {{/rows}}
      `,R=e.parameters.map(u=>`
      <div class="gl-param-item">
        <span class="gl-param-label">${b(u.label)}:</span>
        <span class="gl-param-value">${B(u.defaultValue||u.value)}</span>
      </div>`).join(""),l=["#fff8db","#ffe9e9","#e8f6ff","#ecfdf3","#f3ecff","#fff4e5"],h=(e.conditionalRules||[]).map((u,w)=>{const S=l[w%l.length];return`.gl-table .${u.cssClass} { background: ${S}; }`}).join(`
  `),F=`{{${e.runDateField}}}`,D=`
<div class="gl-report-shell">
  <div class="gl-report-page report-page">
    <div class="ssrs-band ssrs-header-band">
      <div class="gl-header-container">
        <div>
          <h1>${b(e.title)}</h1>
          <div class="gl-subtitle">${b(e.subtitle)}</div>
        </div>
        <div class="gl-header-right">
          <div class="gl-period">${b(e.periodLabel)}</div>
          <div class="gl-run-date">RUN: ${F}</div>
        </div>
      </div>

      <div class="gl-parameter-block">
        ${R}
      </div>
    </div>

    <div class="ssrs-band ssrs-body-band">
      <table class="gl-table">
        <thead>
          <tr>
            ${i}
          </tr>
        </thead>
        <tbody>
          <tr class="gl-group-row">
            <td colspan="${e.showRowNumber?r.length+1:r.length}">${b(e.accountGroupLabel)}</td>
          </tr>
          ${T}
          ${f}
        </tbody>
      </table>
    </div>

    <div class="ssrs-band ssrs-footer-band">
      <div class="gl-footer-container page-number">
        <div>${b(e.footerLeft)}</div>
        <div>${b(e.footerCenter)}</div>
        <div>${e.footerRight}</div>
      </div>
    </div>
  </div>
</div>

<style>
  .gl-report-shell { 
    background: #e2e8f0; 
    padding: 40px 24px; 
    min-height: 100vh; 
    display: flex; 
    justify-content: center; 
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; 
  }
  .gl-report-page {
    background: #ffffff;
    width: 210mm;
    min-height: 297mm;
    padding: 15mm 15mm 25mm 15mm;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    color: #0f172a;
    position: relative;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .gl-header-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #cbd5e1;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .gl-header-container h1 {
    margin: 0;
    font-size: 24pt;
    line-height: 1.1;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .gl-subtitle {
    margin-top: 8px;
    font-size: 10pt;
    color: #64748b;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .gl-header-right { text-align: right; }
  .gl-period { font-size: 12pt; font-weight: 700; color: #0f172a; }
  .gl-run-date {
    margin-top: 4px;
    font-size: 8pt;
    color: #94a3b8;
    font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  }
  .gl-parameter-block {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 12px 16px;
    margin-bottom: 24px;
  }
  .gl-param-item {
    display: inline-flex;
    gap: 8px;
    font-size: 9pt;
  }
  .gl-param-label { color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .gl-param-value { color: #0f172a; font-weight: 700; }
  .gl-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    table-layout: auto;
  }
  .gl-table thead tr { 
    border-bottom: 2px solid #0f172a;
  }
  .gl-table th, .gl-table td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    line-height: 1.4;
    word-break: break-word;
  }
  .gl-table th { 
    color: #0f172a; 
    font-weight: 700; 
    text-transform: uppercase;
    font-size: 8pt;
    letter-spacing: 0.05em;
    white-space: nowrap;
    vertical-align: bottom;
  }
  .gl-table th.num, .gl-table td.num { 
    text-align: right; 
    font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace; 
    font-variant-numeric: tabular-nums;
    font-size: 9.5pt;
  }
  .gl-table th.center, .gl-table td.center { text-align: center; }
  .gl-group-row td {
    background: #f8fafc;
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
    color: #0f172a;
    font-weight: 700;
  }
  .gl-group-break td {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    color: #0f172a;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding-top: 16px;
    font-size: 10pt;
  }
  .gl-data-row td { border-bottom: 1px solid #f1f5f9; color: #334155; }
  .gl-group-subtotal-row td {
    border-top: 1px solid #94a3b8;
    background: #f8fafc;
    font-weight: 700;
    color: #0f172a;
  }
  .gl-grand-total-row td {
    border-top: 2px solid #0f172a;
    border-bottom: 3px double #0f172a;
    font-weight: 800;
    color: #0f172a;
    font-size: 10pt;
    background: #ffffff;
  }
  .gl-grand-total-row .gl-total-label {
    text-align: right;
    letter-spacing: 0.03em;
  }
  .gl-footer-container {
    position: absolute;
    left: 15mm;
    right: 15mm;
    bottom: 15mm;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #64748b;
    font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  }
  .ssrs-band { width: 100%; }
  .ssrs-header-band { margin-bottom: 6px; }
  .ssrs-body-band { min-height: 640px; }
  .ssrs-footer-band { margin-top: auto; }
  ${h}
</style>`;return`${V(e)}

${D}`.trim()}function N(t){return typeof t=="object"&&t!==null&&!Array.isArray(t)}function y(t){if(typeof t=="number"&&Number.isFinite(t))return t;if(typeof t!="string")return null;const e=t.replace(/,/g,"").trim();if(!e)return null;const r=Number(e);return Number.isFinite(r)?r:null}function _(t,e){const r=e.split(".").filter(Boolean);let s=t;for(const n of r){if(!N(s))return;s=s[n]}return s}function j(t,e,r){const s=e.split(".").filter(Boolean);if(!s.length)return;let n=t;for(let o=0;o<s.length-1;o++){const i=s[o];N(n[i])||(n[i]={}),n=n[i]}n[s[s.length-1]]=r}function H(t){const e=Math.abs(t%1)>1e-9;return t.toLocaleString("en-US",{minimumFractionDigits:e?2:0,maximumFractionDigits:2})}function K(t){const e=t.rows;return Array.isArray(e)?e.filter(r=>N(r)):[]}function J(t,e){const r=_(t,e.field),s=e.value;if(e.operator==="equals")return String(r??"").toLowerCase()===s.toLowerCase();if(e.operator==="not_equals")return String(r??"").toLowerCase()!==s.toLowerCase();if(e.operator==="contains")return String(r??"").toLowerCase().includes(s.toLowerCase());const n=y(r),o=y(s);return n===null||o===null?!1:e.operator==="gt"?n>o:e.operator==="gte"?n>=o:e.operator==="lt"?n<o:e.operator==="lte"?n<=o:!1}function W(t,e){return e.length?t.map(r=>{const s=e.filter(n=>n.field&&n.cssClass&&J(r,n)).map(n=>n.cssClass);return{...r,_row_class:s.join(" ").trim()}}):t}function $(t,e){const r={};for(const s of e){let n=0,o=!1;for(const i of t){const a=y(_(i,s));a!==null&&(o=!0,n+=a)}o&&j(r,s,H(n))}return r}function Y(t,e,r,s){const n=[],o=[];let i="__GROUP_INIT__",a=[];const c=()=>{if(a.length===0)return;const d=i,f=$(a,r);o.push({value:d,count:a.length,totals:f}),s&&n.push({_group_subtotal:!0,_group_value:d,_group_totals:f}),a=[]};for(const d of t){const f=_(d,e),p=String(f??"(empty)");i!==p&&(c(),i=p,n.push({_group_header:!0,_group_value:p})),a.push(d),n.push({...d,_is_data:!0,_group_value:p})}return c(),{rowsRender:n,groupSummaries:o}}function Q(t,e,r="asc"){if(!e)return t;const s=r==="desc"?-1:1;return[...t].sort((n,o)=>{const i=_(n,e),a=_(o,e),c=y(i),d=y(a);if(c!==null&&d!==null)return(c-d)*s;const f=String(i??"").toLowerCase(),p=String(a??"").toLowerCase();return f<p?-1*s:f>p?1*s:0})}function at(t,e=[]){const r=Array.isArray(e)?{totalFields:e}:e,s=Array.from(new Set((r.totalFields||[]).filter(Boolean))),n=Q(K(t),r.sortByField,r.sortDirection==="desc"?"desc":"asc"),o=W(n,r.conditionalRules||[]),i=$(o,s);let a=o,c=[];if(r.groupByField){const d=Y(o,r.groupByField,s,!!r.showGroupSubtotals);a=d.rowsRender,c=d.groupSummaries}return{...t,rows:o,rows_render:a,_row_count:o.length,_group_count:c.length,_group_summaries:c,_totals:i}}const X=new Set(["#","^"]);function Z(t){const e=[],r=(t.match(/<style\b[^>]*>/gi)||[]).length,s=(t.match(/<\/style>/gi)||[]).length;return r!==s&&e.push("Unbalanced <style> blocks detected."),e}function tt(t){const e=[],r=[],s=/\{\{([\s\S]*?)\}\}/g;let n;for(;(n=s.exec(t))!==null;){let o=n[1].trim();if(!o||(o.startsWith("{")&&o.endsWith("}")&&(o=o.slice(1,-1).trim()),!o))continue;const i=o[0],a=o.slice(1).trim().split(/\s+/)[0];if(X.has(i)){if(!a){e.push(`Invalid Mustache block opener: {{${o}}}`);continue}r.push(a);continue}if(i==="/"){if(!a){e.push(`Invalid Mustache block closer: {{${o}}}`);continue}const c=r.pop();c?c!==a&&e.push(`Mustache block mismatch: expected {{/${c}}} but found {{/${a}}}`):e.push(`Unexpected Mustache closing tag: {{/${a}}}`)}}for(;r.length;){const o=r.pop();o&&e.push(`Unclosed Mustache block: {{#${o}}}`)}return e}function it(t){const e=t.trim(),r=[];return e?(/<script\b/i.test(e)&&r.push("<script> tags are not allowed in templates."),r.push(...Z(e)),r.push(...tt(e)),{isValid:r.length===0,errors:r}):{isValid:!1,errors:["Template HTML cannot be empty."]}}export{rt as a,nt as b,et as c,ot as d,at as e,K as f,lt as p,st as r,G as s,it as v};
