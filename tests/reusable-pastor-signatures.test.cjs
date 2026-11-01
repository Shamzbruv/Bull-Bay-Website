const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
test('reusable consent is private, explicit, immutable, auditable, tenant scoped and revocable before issue',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create table auth.users(id uuid primary key);create table organizations(id uuid primary key);
   create table audit_logs(organization_id uuid,actor_id uuid,action text,entity_type text,entity_id text,metadata jsonb);
   create table document_requests(id uuid primary key,organization_id uuid,prepared_body text,title text,details jsonb default '{}',template_snapshot jsonb,requester_profile_id uuid,recipient_name text,recipient_email text,status text);
   insert into organizations values('${id(1)}'),('${id(2)}');insert into auth.users values('${id(11)}');
   insert into document_requests(id,organization_id,prepared_body,title,status) values('${id(21)}','${id(1)}','Dedication one','Dedication','pending_pastor'),('${id(22)}','${id(1)}','Dedication two','Dedication','pending_pastor'),('${id(23)}','${id(2)}','Other church','Dedication','pending_pastor');`);
  for(const name of ['20261101171813_document_officiant_acknowledgement.sql','20261101174204_reusable_pastor_signatures.sql']) await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8'));
  const a=id(31),hash='a'.repeat(64),png='data:image/png;base64,synthetic';
  await db.query(`insert into pastor_signature_authorizations(id,organization_id,email,token_hash,expires_at,invited_by) values($1,$2,'pastor@example.org',$3,now()+interval '7 days',$4)`,[a,id(1),hash,id(11)]);
  for(const role of ['anon','authenticated']) assert.equal((await db.query("select has_table_privilege($1,'pastor_signature_authorizations','select') allowed",[role])).rows[0].allowed,false);
  await assert.rejects(db.query("update pastor_signature_authorizations set accepted_at=now(),name='Rev Test',signature_png=$1",[png]),/check constraint/);
  await db.query("update pastor_signature_authorizations set accepted_at=now(),name='Rev Test',signature_png=$1,consent_text='I authorize reuse on church documents until revoked.'",[png]);
  assert.equal((await db.query("select count(*)::int n from audit_logs where action='pastor_signature.authorized'")).rows[0].n,1);
  await assert.rejects(db.exec("update pastor_signature_authorizations set name='Changed name'"),/immutable/);
  await assert.rejects(db.exec("update pastor_signature_authorizations set consent_text='Different permission'"),/immutable/);
  const attach=async(req,org,signature=png)=>{
   const b=(await db.query(`select jsonb_build_object('body',r.prepared_body,'title',r.title,'details',r.details,'template',r.template_snapshot,'member',r.requester_profile_id,'recipient',r.recipient_name,'email',r.recipient_email) b from document_requests r where id=$1`,[req])).rows[0].b;
   return db.query(`insert into document_officiants(request_id,organization_id,authorization_id,name,email,token_hash,binding,expires_at,requested_by,signed_at,signature_png,acknowledgement) select $1,$2,id,name,email,$3,$4,now()+interval '1 day',$5,accepted_at,$6,consent_text from pastor_signature_authorizations where id=$7`,[req,org,(req===id(21)?'c':'d').repeat(64),JSON.stringify(b),id(11),signature,a]);
  };
  await assert.rejects(attach(id(23),id(2)),/active pastor signature authorization/);
  await assert.rejects(attach(id(21),id(1),'data:image/png;base64,forged'),/active pastor signature authorization/);
  await attach(id(21),id(1)); await attach(id(22),id(1));
  await db.query("update document_requests set status='stamped',officiant_approval_hash=$1 where id=$2",['c'.repeat(64),id(21)]);
  await db.query('update pastor_signature_authorizations set revoked_at=now(),revoked_by=$1 where id=$2',[id(11),a]);
  await assert.rejects(db.query("update document_requests set status='stamped',officiant_approval_hash=$1 where id=$2",['d'.repeat(64),id(22)]),/revoked/);
  assert.equal((await db.query('select status from document_requests where id=$1',[id(21)])).rows[0].status,'stamped');
  await assert.rejects(db.exec('update pastor_signature_authorizations set revoked_at=null,revoked_by=null'),/Revoked authorization/);
  await db.query(`insert into pastor_signature_authorizations(id,organization_id,email,token_hash,expires_at,invited_by) values($1,$2,'pastor@example.org',$3,now()-interval '1 minute',$4)`,[id(32),id(1),'e'.repeat(64),id(11)]);
  await assert.rejects(db.query("update pastor_signature_authorizations set accepted_at=now(),name='Rev New',signature_png=$1,consent_text='Authorize' where id=$2",[png,id(32)]),/expired/);
  assert.equal((await db.query("select count(*)::int n from audit_logs where action='document.officiant_signed'")).rows[0].n,0,'blanket consent never claims a ceremony was acknowledged');
 } finally {await db.close();}
});
