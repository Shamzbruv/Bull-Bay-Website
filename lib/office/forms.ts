import { z } from "zod";
export const formFieldsSchema = z.array(z.object({ id:z.string().regex(/^[a-z][a-z0-9_]{0,49}$/), label:z.string().trim().min(1).max(200), type:z.enum(["text","textarea","email","date","number","select","checkbox"]), required:z.boolean(), options:z.array(z.string().trim().min(1).max(200)).max(40).optional() })).min(1).max(60).refine(fields=>new Set(fields.map(f=>f.id)).size===fields.length,"Field IDs must be unique.");
export type FormField = z.infer<typeof formFieldsSchema>[number];
export function validateAnswers(fields:FormField[],form:FormData) {
 const answers:Record<string,string>={};
 for(const f of fields) {
  const value=String(form.get(f.id)??"").trim();
  if(f.required&&!value) throw new Error(`${f.label} is required.`);
  if(value.length>10000) throw new Error(`${f.label} is too long.`);
  if(value && f.type==="email"&&!z.email().safeParse(value).success) throw new Error(`Enter a valid email for ${f.label}.`);
  if(value && f.type==="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Enter a date for ${f.label}.`);
  if(value && f.type==="number"&&!Number.isFinite(Number(value))) throw new Error(`Enter a number for ${f.label}.`);
  if(value && f.type==="select"&&!f.options?.includes(value)) throw new Error(`Choose an option for ${f.label}.`);
  if(f.type==="checkbox" && value && value!=="yes") throw new Error(`Invalid answer for ${f.label}.`);
  answers[f.id]=value;
 }
 return answers;
}
