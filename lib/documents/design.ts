export type DocumentDesign = { accent?: string; banner?: string; footer?: string; subtitle?: string; orientation?: "portrait" | "landscape"; signer_name?: string; secretary_name?: string };
export function cleanDesign(value: unknown): DocumentDesign {
 const v = value && typeof value === "object" ? value as Record<string,unknown> : {};
 const text = (key: string, max = 500) => typeof v[key] === "string" ? (v[key] as string).trim().slice(0,max) : undefined;
 return {accent: typeof v.accent === "string" && /^#[0-9a-f]{6}$/i.test(v.accent) ? v.accent : "#ba963c",banner:text("banner"),footer:text("footer"),subtitle:text("subtitle"),orientation:v.orientation === "portrait"?"portrait":"landscape",signer_name:text("signer_name",100),secretary_name:text("secretary_name",100)};
}
export function templateFields(body:string) {return [...new Set(Array.from(body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g),m=>m[1]!))];}
export function fieldLabel(key:string){return key.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase());}
