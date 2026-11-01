const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
test('officiant signatures: private access, tenant scope, acknowledgement, expiry, replay, document changes and replacement', async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
   create table audit_logs(organization_id uuid,actor_id uuid,action text,entity_type text,entity_id text,metadata jsonb); create table auth.users(id uuid primary key); create table organizations(id uuid primary key);
   create table document_requests(id uuid primary key, organization_id uuid, prepared_body text, title text, details jsonb default '{}', template_snapshot jsonb, requester_profile_id uuid, recipient_name text, recipient_email text, status text);
   insert into organizations values('${id(1)}'),('${id(2)}'); insert into auth.users values('${id(11)}');
   insert into document_requests(id,organization_id,prepared_body,title,status) values('${id(21)}','${id(1)}','Baby dedication on Sunday','Dedication','pending_pastor');`);
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261101171813_document_officiant_acknowledgement.sql'),'utf8'));
  const binding = (await db.query(`select jsonb_build_object('body',r.prepared_body,'title',r.title,'details',r.details,'template',r.template_snapshot,'member',r.requester_profile_id,'recipient',r.recipient_name,'email',r.recipient_email) b from document_requests r`)).rows[0].b;
  const hash = 'a'.repeat(64), replacement = 'b'.repeat(64);
  const insert = org => db.query(`insert into document_officiants(request_id,organization_id,name,email,token_hash,binding,expires_at,requested_by) values($1,$2,'Rev Test','test@example.org',$3,$4,now()+interval '7 days',$5)`,[id(21),org,hash,JSON.stringify(binding),id(11)]);
  await assert.rejects(insert(id(2)),/not awaiting certification/);
  await insert(id(1));
  for (const role of ['anon','authenticated']) {
   assert.equal((await db.query(`select has_table_privilege($1,'document_officiants','select') allowed`,[role])).rows[0].allowed,false);
   assert.equal((await db.query(`select has_table_privilege($1,'document_officiants','update') allowed`,[role])).rows[0].allowed,false);
  }
  await assert.rejects(db.query(`update document_requests set status='stamped',officiant_approval_hash=$1`,[hash]),/must acknowledge/);
  const sign = () => db.exec(`update document_officiants set signed_at=now(),signature_png='data:image/png;base64,test',acknowledgement='I officiated'`);
  await sign();
  assert.equal((await db.query("select count(*)::int n from audit_logs where action='document.officiant_signed'")).rows[0].n,1);
  await assert.rejects(sign(),/already signed/);
  await db.exec(`update document_requests set prepared_body='Changed dedication date'`);
  await assert.rejects(db.query(`update document_requests set status='stamped',officiant_approval_hash=$1`,[hash]),/must acknowledge/);
  await db.exec(`update document_requests set prepared_body='Baby dedication on Sunday'`);
  await db.query(`update document_officiants set token_hash=$1,signed_at=null,signature_png=null,acknowledgement=null`,[replacement]);
  await assert.rejects(db.query(`update document_requests set status='stamped',officiant_approval_hash=$1`,[hash]),/must acknowledge/);
  await db.exec(`update document_officiants set expires_at=now()-interval '1 minute'`);
  await assert.rejects(sign(),/expired/);
  await db.exec(`update document_officiants set expires_at=now()+interval '7 days'`);
  await sign();
  await assert.rejects(db.query(`update document_requests set status='stamped',officiant_approval_hash=$1`,[hash]),/must acknowledge/);
  await db.query(`update document_requests set status='stamped',officiant_approval_hash=$1`,[replacement]);
  await assert.rejects(db.exec('delete from document_officiants'),/already issued/);
  await db.exec(`update document_requests set status='pending_pastor'; delete from document_officiants;`);
  await assert.rejects(db.query(`update document_requests set status='stamped',officiant_approval_hash=$1`,[replacement]),/cancelled/);
  await db.exec(`update document_requests set status='stamped',officiant_approval_hash=null`);
  assert.equal((await db.query('select status from document_requests')).rows[0].status,'stamped');
 } finally { await db.close(); }
});

test('signature pad captures mouse and finger strokes, supports clearing, and blocks drawing while disabled', () => {
 const ts = require('typescript');
 const source = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../components/forms/signature-pad.tsx'),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
 const jsx = require('react/jsx-runtime');
 for (const pointerType of ['mouse','touch']) {
  const calls = []; let canvasRef; let n = 0;
  const ctx = {setTransform(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){calls.push('stroke')},clearRect(){calls.push('clear')}};
  const canvas = {width:0,height:0,getBoundingClientRect:()=>({width:320,height:170,left:10,top:20}),getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,drawn'};
  const react = { useRef: v => { const ref={current:v}; if(n++===0){canvasRef=ref;ref.current=canvas;} return ref; }, useState: v => [v,()=>{}] };
  const mod={exports:{}};
  new Function('require','module','exports',source)(name=>name==='react'?react:name==='react/jsx-runtime'?jsx:require(name),mod,mod.exports);
  const values=[]; global.window={devicePixelRatio:2};
  const element=mod.exports.SignaturePad({value:null,onChange:v=>values.push(v),labelledBy:'sign'});
  const canvasElement=element.props.children[0]; const props=canvasElement.props;
  const e={pointerType,pointerId:1,clientX:30,clientY:45,currentTarget:{...canvas,setPointerCapture(){calls.push('capture')}}};
  props.onPointerDown(e);props.onPointerMove({...e,clientX:80,clientY:85});props.onPointerUp();
  assert.equal(canvasRef.current.width,640);assert.equal(calls.includes('stroke'),true);assert.equal(values.at(-1),'data:image/png;base64,drawn');
  element.props.children[1].props.children[1].props.onClick();assert.equal(values.at(-1),null);
  n=0;calls.length=0;const disabled=mod.exports.SignaturePad({value:null,onChange:v=>values.push(v),labelledBy:'sign',disabled:true});
  disabled.props.children[0].props.onPointerDown(e);assert.equal(calls.includes('capture'),false);
 }
 delete global.window;
});
